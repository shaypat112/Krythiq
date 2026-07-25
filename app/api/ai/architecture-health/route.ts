import { NextResponse } from "next/server";

const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;

const SYSTEM_PROMPTS = {
  ARCHITECTURE_EVALUATOR: `You are a Systems Architect and Technical Lead at Votrio.
Your task is to evaluate software architecture for:
- Maintainability and modularity
- Coupling and cohesion analysis
- Scalability assessment
- Design pattern usage
- Technical debt quantification
- Improvement recommendations
Provide specific, actionable architectural guidance.`,
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
    const { repositoryStructure, model } = await request.json();

    if (!repositoryStructure) {
      return NextResponse.json({ error: "Missing repositoryStructure" }, { status: 400 });
    }

    const prompt = `Evaluate the architecture health of this repository:

Files: ${repositoryStructure.files.length}
Total Lines: ${repositoryStructure.files.reduce((sum: number, f: any) => sum + f.lines, 0)}
Dependencies: ${Object.keys(repositoryStructure.dependencies).length}
Patterns detected: ${repositoryStructure.patterns.join(", ")}

Sample structure:
${repositoryStructure.files.slice(0, 15).map((f: any) => `- ${f.path} (${f.lines} lines)`).join("\n")}

Provide architecture health assessment in JSON format:
{
  "overallScore": 0-100,
  "categories": {
    "maintainability": {"score": 0-100, "issues": ["specific issues"]},
    "modularity": {"score": 0-100, "issues": ["specific issues"]},
    "coupling": {"score": 0-100, "issues": ["specific issues"]},
    "cohesion": {"score": 0-100, "issues": ["specific issues"]},
    "scalability": {"score": 0-100, "issues": ["specific issues"]},
    "technicalDebt": {"score": 0-100, "issues": ["specific issues"]},
    "documentation": {"score": 0-100, "issues": ["specific issues"]},
    "testCoverage": {"score": 0-100, "issues": ["specific issues"]}
  },
  "recommendations": [
    {"priority": "high|medium|low", "action": "specific recommendation"}
  ]
}`;

    const analysis = await callMistralAPI(
      SYSTEM_PROMPTS.ARCHITECTURE_EVALUATOR,
      prompt,
      model || "mistral-large-latest",
      2000
    );

    if (!analysis) {
      return NextResponse.json({ error: "AI analysis failed" }, { status: 500 });
    }

    return NextResponse.json({ analysis });
  } catch (error) {
    console.error("Architecture health evaluation error:", error);
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}
