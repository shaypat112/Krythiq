import { NextResponse } from "next/server";
import { adminSupabaseFetch } from "@/app/lib/server/admin";
import { createCliSecret, createCliRefreshSecret, hashCliSecret } from "@/app/lib/server/cliAuth";

export const runtime = "nodejs";
const reply = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const deviceCode = typeof body?.deviceCode === "string" ? body.deviceCode : "";
    if (!/^[A-Za-z0-9_-]{43}$/.test(deviceCode)) return reply({ error: "invalid_request" }, 400);
    const accessToken = createCliSecret();
    const refreshToken = createCliRefreshSecret();
    const response = await adminSupabaseFetch("rpc/claim_cli_device", { method: "POST", body: JSON.stringify({ p_device_hash: hashCliSecret(deviceCode), p_access_hash: hashCliSecret(accessToken), p_refresh_hash: hashCliSecret(refreshToken) }) });
    if (!response.ok) return reply({ error: "server_error" }, 503);
    const session = (await response.json())?.[0];
    if (!session) return reply({ error: "server_error" }, 503);
    if (session.status !== "ok") return reply({ error: session.status }, session.status === "authorization_pending" ? 428 : 400);
    return reply({ accessToken, ...(session.refresh_expires_at ? { refreshToken } : {}), tokenType: "Bearer", expiresAt: session.expires_at, refreshExpiresAt: session.refresh_expires_at });
  } catch { return reply({ error: "server_error" }, 503); }
}
