import { NextResponse } from "next/server";

const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;

const SYSTEM_PROMPTS = {
  REMEDIATION_PLANNER: `You are a senior engineering lead planning security remediation work.
Your task is to:
- Group related vulnerabilities into actionable work
- Estimate engineering effort realistically
- Prioritize by severity and business risk
- Provide implementation steps
- Generate validation checklists
- Create developer action plans
Be practical and consider team capacity.`,
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

    const prompt = `Generate a remediation plan for these vulnerabilities:

Repository Context: ${repositoryContext?.slice(0, 500) || "Not provided"}

Vulnerabilities:
${JSON.stringify(vulnerabilities.slice(0, 30), null, 2)}

Provide remediation plan in JSON format:
{
  "plans": [
    {
      "id": "plan-1",
      "title": "remediation plan title",
      "severity": "low|medium|high|critical",
      "affectedFiles": ["file paths"],
      "description": "plan description",
      "estimatedEffort": "hours estimate",
      "implementationSteps": [
        "step 1",
        "step 2"
      ],
      "codeSuggestions": [
        {
          "file": "file path",
          "line": line number,
          "original": "original code",
          "suggested": "secure code"
        }
      ],
      "validationChecklist": [
        "validation item 1",
        "validation item 2"
      ]
    }
  ],
  "priorityOrder": ["plan ids in priority order"],
  "totalEstimatedEffort": "total hours"
}`;

    const analysis = await callMistralAPI(
      SYSTEM_PROMPTS.REMEDIATION_PLANNER,
      prompt,
      model || "mistral-large-latest",
      2000
    );

    if (!analysis) {
      return NextResponse.json({ error: "AI analysis failed" }, { status: 500 });
    }

    return NextResponse.json({ plan: analysis });
  } catch (error) {
    console.error("Remediation planning error:", error);
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}
