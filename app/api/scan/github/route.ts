import { NextResponse } from "next/server";
import { handleGitHubScan } from "@/app/routes/scan";
import {
  extractSelectedTeamId,
  getSupabaseEnv,
  RequestAuthError,
  requireRequestAuth,
  supabaseFetch,
} from "@/app/lib/server/supabaseRest";
import { logServerError, logServerInfo } from "@/app/lib/server/logger";
import { deliverWebhooks } from "@/app/lib/server/webhooks";
import { requireVerifiedRequestAuth } from "@/app/lib/server/requestAuth";
import {
  completeTokenUsage,
  readIdempotencyKey,
  refundTokenUsage,
  reserveTokenUsage,
} from "@/app/lib/server/tokenLedger";
import { readScanTier, scanTierCatalog } from "@/app/lib/tokens";
import {
  defaultAiSettings,
  normalizeAiSettings,
  readScanScope,
} from "@/app/lib/ai-settings";
import { scanCheckpointsForScope } from "@/app/lib/scanner/checkpoints";

export const runtime = "nodejs";

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unexpected server error.";
}

export async function POST(request: Request) {
  const wantsEvents = request.headers.get("accept")?.includes("text/event-stream");
  let repoUrlForFailure: string | undefined;
  let accessTokenForFailure: string | undefined;
  let chargedUserId: string | undefined;
  let chargeKey: string | undefined;

  const notifyFailure = async (message: string) => {
    if (!repoUrlForFailure || !accessTokenForFailure) return;
    try {
      await deliverWebhooks(getSupabaseEnv(), accessTokenForFailure, {
        userId: requireRequestAuth(request).userId,
        event: "scan.failed",
        payload: { repo_url: repoUrlForFailure, error: message },
      });
    } catch {
      // Webhook failure must never obscure the original scan failure.
    }
  };
  try {
    const body = await request.json();
    const repoUrl = body?.repoUrl as string | undefined;
    repoUrlForFailure = repoUrl;
    const scanTier = readScanTier(body?.scanTier);
    if (!scanTier) {
      return NextResponse.json({ error: "Choose a valid scan tier.", code: "INVALID_SCAN_TIER" }, { status: 400 });
    }
    const providerToken = typeof body?.providerToken === "string" ? body.providerToken : undefined;
    const { accessToken, userId } = requireRequestAuth(request);
    accessTokenForFailure = accessToken;
    const selectedTeamId = extractSelectedTeamId(request);

    if (!repoUrl) {
      return NextResponse.json({ error: "Missing repoUrl." }, { status: 400 });
    }

    const settingsResponse = await supabaseFetch(
      getSupabaseEnv(),
      `user_settings?user_id=eq.${userId}&select=data&limit=1`,
      { accessToken },
    );
    const settingsRows = settingsResponse.ok
      ? ((await settingsResponse.json()) as Array<{ data?: unknown }>)
      : [];
    const storedAiSettings = normalizeAiSettings(settingsRows[0]?.data);
    const aiSettings = {
      ...defaultAiSettings,
      defaultScanScope: storedAiSettings.defaultScanScope,
    };
    const scanScope =
      readScanScope(body?.options?.scanScope) ?? aiSettings.defaultScanScope;
    const options = { ...(body?.options ?? {}), scanTier, scanScope };

    const verified = await requireVerifiedRequestAuth(request);
    const idempotencyKey = readIdempotencyKey(request);
    if (!idempotencyKey) {
      return NextResponse.json({ error: "A valid Idempotency-Key header is required.", code: "INVALID_IDEMPOTENCY_KEY" }, { status: 400 });
    }
    const reservation = await reserveTokenUsage(verified.userId, scanTierCatalog[scanTier].action, idempotencyKey);
    if (reservation.usage_status === "insufficient") {
      return NextResponse.json({ error: `This scan costs ${reservation.token_cost} Tokens.`, code: "INSUFFICIENT_TOKENS", cost: reservation.token_cost, balance: reservation.balance }, { status: 402 });
    }
    if (!reservation.reservation_created) {
      return NextResponse.json({ error: reservation.usage_status === "pending" ? "This scan is already processing." : "Use a new request key to retry this scan.", code: "DUPLICATE_SCAN" }, { status: 409 });
    }
    chargedUserId = verified.userId;
    chargeKey = idempotencyKey;

    logServerInfo("scan.started", { transport: wantsEvents ? "sse" : "json" });

    if (wantsEvents) {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          const send = (event: string, data: unknown) => {
            controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
          };
          try {
            const result = await handleGitHubScan({
              repoUrl,
              options,
              accessToken,
              teamId: selectedTeamId,
              providerToken,
              aiSettings,
              scanScope,
              onProgress: (stage, detail) => send("progress", { stage, detail }),
            });
            const finalBalance = await completeTokenUsage(verified.userId, idempotencyKey, result as unknown as Record<string, unknown>);
            send("complete", { ...result, scanTier, includedChecks: scanCheckpointsForScope(scanScope), tokenCharge: { cost: reservation.token_cost, balance: Number(finalBalance) } });
            logServerInfo("scan.completed", { findings: result.totalFindings });
          } catch (error) {
            const refundedBalance = await refundTokenUsage(verified.userId, idempotencyKey, getErrorMessage(error)).catch(() => undefined);
            logServerError("scan.failed", error);
            await notifyFailure(getErrorMessage(error));
            send("error", { error: getErrorMessage(error), refunded: true, balance: refundedBalance === undefined ? undefined : Number(refundedBalance) });
          } finally {
            controller.close();
          }
        },
      });
      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
        },
      });
    }

    const result = await handleGitHubScan({ repoUrl, options, accessToken, teamId: selectedTeamId, providerToken, aiSettings, scanScope });
    const finalBalance = await completeTokenUsage(verified.userId, idempotencyKey, result as unknown as Record<string, unknown>);
    logServerInfo("scan.completed", { findings: result.totalFindings });

    return NextResponse.json({ ...result, scanTier, includedChecks: scanCheckpointsForScope(scanScope), tokenCharge: { cost: reservation.token_cost, balance: Number(finalBalance) } });
  } catch (error) {
    if (chargedUserId && chargeKey) {
      await refundTokenUsage(chargedUserId, chargeKey, getErrorMessage(error)).catch(() => undefined);
    }
    if (error instanceof RequestAuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const message = getErrorMessage(error);
    logServerError("scan.request_failed", error);
    await notifyFailure(message);
    if (message.includes("Invalid GitHub repository URL")) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    if (message.includes("authorization is required")) {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    if (message.includes("rate limit")) {
      return NextResponse.json({ error: message }, { status: 429 });
    }
    if (message.includes("too large")) {
      return NextResponse.json({ error: message }, { status: 500 });
    }
    if (message.includes("Scan failed")) {
      return NextResponse.json({ error: message }, { status: 500 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
