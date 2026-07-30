import { NextResponse } from "next/server";
import { runPaidAiAction } from "@/app/lib/server/tokenLedger";

export const runtime = "nodejs";

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export async function POST(request: Request) {
  try {
    const { messages, context, model } = (await request.json()) as {
      messages?: ChatMessage[];
      context?: string;
      model?: string;
    };

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "Missing messages." }, { status: 400 });
    }

    const apiKey = process.env.MISTRAL_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "MISTRAL_API_KEY is not configured." },
        { status: 500 }
      );
    }

    const payloadMessages: ChatMessage[] = [];

    if (context?.trim()) {
      payloadMessages.push({
        role: "system",
        content:
          "You are a helpful repo scan assistant. Use the provided scan context to answer clearly and concisely.\n\n" +
          context.trim(),
      });
    }

    payloadMessages.push(...messages);

    return runPaidAiAction(request, "chat", async () => {
      const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: model || process.env.MISTRAL_MODEL || "mistral-large-latest",
          temperature: 0.2,
          messages: payloadMessages,
          max_tokens: 800,
        }),
      });
      if (!response.ok) throw new Error(`Mistral request failed (${response.status}).`);
      const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const content = data?.choices?.[0]?.message?.content?.trim();
      if (!content) throw new Error("Mistral returned no usable response.");
      return { message: content };
    });
  } catch (error) {
    return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
  }
}
