import { NextResponse } from "next/server";
import { createHmac } from "node:crypto";
import {
  RequestAuthError,
  getSupabaseEnv,
  requireRequestAuth,
  supabaseFetch,
} from "@/app/lib/server/supabaseRest";
import { fetchWithTimeout, validatePublicHttpsUrl } from "@/app/lib/server/outboundRequests";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { webhookUrl, webhookSecret } = await request.json();
    const { accessToken, userId } = requireRequestAuth(request);

    if (!webhookUrl) {
      return NextResponse.json(
        { error: "Missing webhookUrl." },
        { status: 400 },
      );
    }

    const validatedWebhookUrl = await validatePublicHttpsUrl(webhookUrl);

    const payload = {
      event: "webhook.test",
      user_id: userId,
      status: "ok",
      message: "Votrio webhook test delivery",
      created_at: new Date().toISOString(),
    };

    const serializedPayload = JSON.stringify(payload);
    const res = await fetchWithTimeout(validatedWebhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "votrio-webhooks",
        ...(typeof webhookSecret === "string" && webhookSecret.length > 0 ? { "x-votrio-signature": createHmac("sha256", webhookSecret).update(serializedPayload).digest("hex") } : {}),
      },
      body: serializedPayload,
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: "Webhook request failed", details: text }, { status: 500 });
    }

    const env = getSupabaseEnv();
    await supabaseFetch(env, "activity_log", {
      method: "POST",
      accessToken,
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        actor_id: userId,
        action: "webhook.test",
        target_type: "webhook",
        meta: { url: validatedWebhookUrl },
        created_at: new Date().toISOString(),
      }),
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof RequestAuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (
      err instanceof Error &&
      (err.message.startsWith("Webhook URL") ||
        err.message === "Invalid webhook URL.")
    ) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
  }
}
