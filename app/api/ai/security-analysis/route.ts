import { NextResponse } from "next/server";

const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;

const SYSTEM_PROMPTS = {
  SECURITY_ANALYST: `You are a senior Security Engineer at Votrio specializing in vulnerability detection and exploit simulation.
Your task is to analyze code for security vulnerabilities and provide:
- Vulnerability identification with CWE/CVE references
- Exploitability assessment
- Attack path simulation
- Concrete remediation steps
- Risk prioritization
Be thorough but concise. Focus on real security risks, not theoretical issues.`,
};

async function callMistralAPI(
  systemPrompt: string,
  userPrompt: string,
  model: string = "mistral-large-latest",
  maxTokens: number = 2000
): Promise<string | null> {
  if (!MISTRAL_API_KEY) {
    console.error("MISTRAL_API_KEY not set");
    return null;
  }

  try {
    const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${MISTRAL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: maxTokens,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text);
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    return data?.choices?.[0]?.message?.content ?? null;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Mistral API error:", message);
    return null;
  }
}

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { codeContext, filePath, model } = await request.json();

    if (!codeContext || !filePath) {
      return NextResponse.json({ error: "Missing codeContext or filePath" }, { status: 400 });
    }

    const prompt = `Analyze this code file for security vulnerabilities:

File: ${filePath}
Code:
${codeContext.slice(0, 4000)}

Provide analysis in JSON format:
{
  "vulnerabilities": [
    {
      "type": "vulnerability type",
      "severity": "low|medium|high|critical",
      "cwe": "CWE identifier",
      "line": line number,
      "description": "vulnerability description",
      "exploitability": "low|medium|high",
      "impact": "business impact",
      "remediation": "specific fix steps",
      "codeExample": "secure code example"
    }
  ],
  "overallRisk": "low|medium|high|critical"
}`;

    const analysis = await callMistralAPI(
      SYSTEM_PROMPTS.SECURITY_ANALYST,
      prompt,
      model || "mistral-large-latest",
      1500
    );

    if (!analysis) {
      return NextResponse.json({ error: "AI analysis failed" }, { status: 500 });
    }

    return NextResponse.json({ analysis });
  } catch (error) {
    console.error("Security analysis error:", error);
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}
