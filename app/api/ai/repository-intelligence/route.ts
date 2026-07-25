import { NextResponse } from "next/server";

const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;

const SYSTEM_PROMPTS = {
  REPOSITORY_INTELLIGENCE: `You are the lead AI Security Engineer for Votrio, an enterprise cybersecurity SaaS platform.
Your task is to analyze repository code and provide comprehensive repository intelligence.
Focus on:
- Language and framework detection
- Architecture analysis (stack, deployment, database, auth)
- Security posture assessment
- Code quality metrics
- Technical debt identification
Be specific, technical, and actionable. Enterprise-grade analysis only.`,
};

async function callMistralAPI(
  systemPrompt: string,
  userPrompt: string,
  model: string = "mistral-large-latest",
  maxTokens: number = 2000,
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
    const { repositoryData, model } = await request.json();

    if (!repositoryData) {
      return NextResponse.json(
        { error: "Missing repositoryData" },
        { status: 400 },
      );
    }

    const prompt = `Analyze this repository and provide comprehensive intelligence:

Files: ${repositoryData.files.length} files
Languages: ${repositoryData.languages.join(", ")}
Package.json: ${repositoryData.packageJson ? JSON.stringify(repositoryData.packageJson, null, 2) : "Not found"}
README: ${repositoryData.readme ? repositoryData.readme.slice(0, 1000) : "Not found"}

Sample files:
${repositoryData.files
  .slice(0, 10)
  .map((f: any) => `- ${f.path} (${f.size} bytes)`)
  .join("\n")}

Provide analysis in JSON format:
{
  "languages": ["detected languages"],
  "frameworks": ["detected frameworks"],
  "packageManagers": ["npm", "yarn", "pip", etc],
  "databases": ["detected databases"],
  "orms": ["detected ORMs"],
  "cloudProviders": ["AWS", "GCP", "Azure", etc],
  "hosting": ["detected hosting platforms"],
  "authProviders": ["detected auth systems"],
  "cicd": ["detected CI/CD systems"],
  "architecture": {
    "type": "monolith|microservices|serverless",
    "description": "architecture description"
  },
  "securityPosture": {
    "score": 0-100,
    "summary": "security assessment"
  },
  "technicalDebt": {
    "level": "low|medium|high",
    "areas": ["specific debt areas"]
  }
}`;

    const analysis = await callMistralAPI(
      SYSTEM_PROMPTS.REPOSITORY_INTELLIGENCE,
      prompt,
      model || "mistral-large-latest",
      1500,
    );

    if (!analysis) {
      return NextResponse.json(
        { error: "AI analysis failed" },
        { status: 500 },
      );
    }

    return NextResponse.json({ analysis });
  } catch (error) {
    console.error("Repository intelligence error:", error);
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}
