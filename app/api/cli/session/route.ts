import { NextResponse } from "next/server";
import { adminSupabaseFetch } from "@/app/lib/server/admin";
import { createCliSecret, hashCliSecret } from "@/app/lib/server/cliAuth";

export const runtime = "nodejs";
const reply = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    if (typeof body.refreshToken !== "string" || !/^kry_refresh_[A-Za-z0-9_-]{43}$/.test(body.refreshToken)) return reply({ error: "invalid_refresh_token" }, 401);
    const accessToken = createCliSecret();
    const response = await adminSupabaseFetch("rpc/refresh_cli_session", { method: "POST", body: JSON.stringify({ p_refresh_hash: hashCliSecret(body.refreshToken), p_access_hash: hashCliSecret(accessToken) }) });
    if (!response.ok) return reply({ error: "session_service_unavailable" }, 503);
    const session = (await response.json())?.[0];
    if (!session) return reply({ error: "session_expired_or_revoked" }, 401);
    return reply({ accessToken, tokenType: "Bearer", expiresAt: session.expires_at, refreshExpiresAt: session.refresh_expires_at });
  } catch { return reply({ error: "session_service_unavailable" }, 503); }
}

export async function DELETE(request: Request) {
  try {
    const accessToken = /^Bearer\s+(\S+)$/i.exec(request.headers.get("authorization") ?? "")?.[1] ?? "";
    const body = await request.json().catch(() => ({}));
    const refreshToken = typeof body.refreshToken === "string" ? body.refreshToken : "";
    const access = /^kry_cli_[A-Za-z0-9_-]{43}$/.test(accessToken);
    const refresh = /^kry_refresh_[A-Za-z0-9_-]{43}$/.test(refreshToken);
    if (!access && !refresh) return reply({ error: "Invalid CLI credential." }, 401);
    const response = await adminSupabaseFetch("rpc/revoke_cli_session", { method: "POST", body: JSON.stringify({ p_access_hash: access ? hashCliSecret(accessToken) : null, p_refresh_hash: refresh ? hashCliSecret(refreshToken) : null }) });
    if (!response.ok) return reply({ error: "Unable to revoke terminal." }, 503);
    // Idempotent: a credential already revoked is disconnected too.
    return reply({ ok: true });
  } catch { return reply({ error: "Unable to revoke terminal." }, 503); }
}
