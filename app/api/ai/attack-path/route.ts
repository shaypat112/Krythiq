import { NextResponse } from "next/server";

const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;

const SYSTEM_PROMPTS = {
  ATTACK_SIMULATOR: `You are a cybersecurity specialist simulating realistic attack scenarios.
Your task is to:
- Identify attack entry points
- Map privilege escalation paths
- Show lateral movement possibilities
- Assess business impact
- Provide mitigation for each attack stage
Be realistic and practical. Consider real-world attacker behavior.`,
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
    const { vulnerabilities, repositoryContext, model } = await request.json();

    if (!vulnerabilities) {
      return NextResponse.json({ error: "Missing vulnerabilities" }, { status: 400 });
    }

    const prompt = `Simulate realistic attack paths based on these vulnerabilities:

Repository Context: ${repositoryContext?.slice(0, 500) || "Not provided"}

Vulnerabilities:
${JSON.stringify(vulnerabilities.slice(0, 20), null, 2)}

Provide attack path analysis in JSON format:
{
  "attackPaths": [
    {
      "entryPoint": "initial vulnerability",
      "stages": [
        {
          "stage": 1,
          "description": "attack stage description",
          "vulnerability": "vulnerability exploited",
          "privilegeLevel": "current privilege",
          "impact": "stage impact"
        }
      ],
      "finalImpact": "ultimate business impact",
      "mitigation": "stage-by-stage mitigation"
    }
  ],
  "overallRiskAssessment": "risk assessment summary"
}`;

    const analysis = await callMistralAPI(
      SYSTEM_PROMPTS.ATTACK_SIMULATOR,
      prompt,
      model || "mistral-large-latest",
      2000
    );

    if (!analysis) {
      return NextResponse.json({ error: "AI analysis failed" }, { status: 500 });
    }

    return NextResponse.json({ analysis });
  } catch (error) {
    console.error("Attack path simulation error:", error);
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}
