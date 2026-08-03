type Severity = "low" | "medium" | "high" | "critical";

type FindingSummaryInput = {
  file: string;
  line: number;
  severity: Severity;
  type: string;
  message: string;
  suggestion?: string;
  snippet?: string;
};

export async function summarizeFindings(
  findings: FindingSummaryInput[],
  model = "mistral-large-latest",
): Promise<string | null> {
  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey || findings.length === 0) return null;

  const condensed = findings.slice(0, 50).map((finding) => ({
    file: finding.file,
    line: finding.line,
    severity: finding.severity,
    type: finding.type,
    message: finding.message,
    suggestion: finding.suggestion ?? null,
    snippet: finding.snippet ?? null,
  }));

  try {
    const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: 300,
        messages: [
          {
            role: "system",
            content:
              "Summarize repository scan findings in 2-5 plain-text sentences. Put the highest-risk issues first, suggest concrete fixes, and never invent files, lines, or vulnerabilities.",
          },
          {
            role: "user",
            content: JSON.stringify(condensed),
          },
        ],
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      console.error(`Mistral summary unavailable: HTTP ${response.status}`);
      return null;
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    return data.choices?.[0]?.message?.content ?? null;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Mistral summary unavailable: ${message}`);
    return null;
  }
}
