import { NextResponse } from "next/server";
import { handleGitHubScan, handleGuestGitHubScan } from "@/app/routes/scan";
import {
  extractSelectedTeamId,
  RequestAuthError,
  requireRequestAuth,
} from "@/app/lib/server/supabaseRest";
import { logServerError, logServerInfo } from "@/app/lib/server/logger";
import { deliverWebhooks } from "@/app/lib/server/webhooks";
import { getSupabaseEnv } from "@/app/lib/server/supabaseRest";

export const runtime = "nodejs";

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unexpected server error.";
}

export async function POST(request: Request) {
  const wantsEvents = request.headers.get("accept")?.includes("text/event-stream");
  let repoUrlForFailure: string | undefined;
  let accessTokenForFailure: string | undefined;

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
    const options = body?.options;
    const hasAuthorization = request.headers.has("authorization");
    const auth = hasAuthorization ? requireRequestAuth(request) : null;
    const accessToken = auth?.accessToken;
    if (!accessToken && request.headers.get("cookie")?.includes("votrio_guest_scan=1")) {
      return NextResponse.json({ error: "Your free scan has been used. Sign in to run another." }, { status: 401 });
    }
    const providerToken = accessToken && typeof body?.providerToken === "string" ? body.providerToken : undefined;
    accessTokenForFailure = accessToken;
    const selectedTeamId = accessToken ? extractSelectedTeamId(request) : null;

    if (!repoUrl) {
      return NextResponse.json({ error: "Missing repoUrl." }, { status: 400 });
    }

    logServerInfo("scan.started", { transport: wantsEvents ? "sse" : "json" });

    if (wantsEvents) {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          const send = (event: string, data: unknown) => {
            controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
          };
          try {
            const onProgress = (stage: Parameters<NonNullable<Parameters<typeof handleGitHubScan>[0]["onProgress"]>>[0], detail: string) => send("progress", { stage, detail });
            const result = accessToken
              ? await handleGitHubScan({ repoUrl, options, accessToken, teamId: selectedTeamId, providerToken, onProgress })
              : await handleGuestGitHubScan({ repoUrl, options, onProgress });
            send("complete", result);
            logServerInfo("scan.completed", { findings: result.totalFindings });
          } catch (error) {
            logServerError("scan.failed", error);
            await notifyFailure(getErrorMessage(error));
            send("error", { error: getErrorMessage(error) });
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
          ...(!accessToken ? { "Set-Cookie": "votrio_guest_scan=1; Path=/; Max-Age=31536000; SameSite=Lax" } : {}),
        },
      });
    }

    const result = accessToken
      ? await handleGitHubScan({ repoUrl, options, accessToken, teamId: selectedTeamId, providerToken })
      : await handleGuestGitHubScan({ repoUrl, options });
    logServerInfo("scan.completed", { findings: result.totalFindings });

    const response = NextResponse.json(result);
    if (!accessToken) response.cookies.set("votrio_guest_scan", "1", { path: "/", maxAge: 31536000, sameSite: "lax" });
    return response;
  } catch (error) {
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
