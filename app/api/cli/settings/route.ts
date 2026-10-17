import { cliDeviceStatus, type CliDeviceState } from "@/app/lib/cli-session";
import { NextResponse } from "next/server";
import { adminSupabaseFetch } from "@/app/lib/server/admin";
import { requireVerifiedRequestAuth } from "@/app/lib/server/requestAuth";
import { RequestAuthError } from "@/app/lib/server/supabaseRest";
import { loadTokenAccount } from "@/app/lib/server/tokenLedger";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { userId } = await requireVerifiedRequestAuth(request);
    const [devicesResponse, scansResponse, account, usageResponse] = await Promise.all([
      adminSupabaseFetch(`cli_access_tokens?user_id=eq.${userId}&select=id,name,last_used_at,expires_at,refresh_expires_at,revoked_at,created_at&order=created_at.desc`),
      adminSupabaseFetch(`cli_scan_events?user_id=eq.${userId}&select=id,cli_token_id,repository,issues,token_cost,created_at&order=created_at.desc&limit=100`),
      loadTokenAccount(userId),
      adminSupabaseFetch("rpc/cli_usage_summary", { method: "POST", body: JSON.stringify({ p_user_id: userId }) }),
    ]);
    if (!devicesResponse.ok || !scansResponse.ok || !usageResponse.ok) return NextResponse.json({ error: "CLI settings are temporarily unavailable." }, { status: 503 });
    const devices = await devicesResponse.json() as Array<CliDeviceState & { id: string }>;
    const scans = await scansResponse.json();
    const usage = (await usageResponse.json())?.[0];
    const activeDevices = devices.filter(device => cliDeviceStatus(device) === "active");
    return NextResponse.json({ connected: activeDevices.length > 0, devices, scans, stats: { connectedTerminals: activeDevices.length, scanCount: Number(usage?.scan_count ?? 0), tokensUsed: Number(usage?.tokens_used ?? 0), tokensLeft: account.balance } }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof RequestAuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "Unable to load CLI settings." }, { status: 503 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { userId } = await requireVerifiedRequestAuth(request);
    const tokenId = new URL(request.url).searchParams.get("tokenId") ?? "";
    if (!/^[0-9a-f-]{36}$/i.test(tokenId)) return NextResponse.json({ error: "Invalid terminal." }, { status: 400 });
    const response = await adminSupabaseFetch(`cli_access_tokens?id=eq.${tokenId}&user_id=eq.${userId}&revoked_at=is.null`, { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify({ revoked_at: new Date().toISOString() }) });
    if (!response.ok) return NextResponse.json({ error: "Unable to revoke terminal. Try again." }, { status: 503 });
    const rows = await response.json();
    if (!rows[0]) return NextResponse.json({ error: "Terminal not found." }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof RequestAuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "Unable to revoke terminal." }, { status: 503 });
  }
}
