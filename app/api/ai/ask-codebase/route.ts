import { NextResponse } from "next/server";

const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;

const SYSTEM_PROMPTS = {
  CODEBASE_ASSISTANT: `You are an AI assistant that understands entire software repositories.
Your task is to answer questions about codebases with full context awareness.
You understand:
- File relationships and dependencies
- Architecture patterns and design decisions
- Security implications of code changes
- Authentication and authorization flows
- Database interactions and ORM usage
- API endpoints and service boundaries
Provide clear, specific answers with code references when relevant.`,
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
    const { question, codebaseContext, model } = await request.json();

    if (!question || !codebaseContext) {
      return NextResponse.json({ error: "Missing question or codebaseContext" }, { status: 400 });
    }

    const prompt = `Question: ${question}

Codebase Context:
Architecture: ${codebaseContext.architecture}
Summary: ${codebaseContext.summary}

Relevant Files:
${codebaseContext.relevantFiles.map((f: any) => `
File: ${f.path}
Content:
${f.content.slice(0, 2000)}
`).join("\n---\n")}

Provide a comprehensive answer with specific code references and explanations.`;

    const analysis = await callMistralAPI(
      SYSTEM_PROMPTS.CODEBASE_ASSISTANT,
      prompt,
      model || "mistral-large-latest",
      2000
    );

    if (!analysis) {
      return NextResponse.json({ error: "AI analysis failed" }, { status: 500 });
    }

    return NextResponse.json({ answer: analysis });
  } catch (error) {
    console.error("Ask codebase error:", error);
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}
