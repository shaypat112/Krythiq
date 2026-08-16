import { NextResponse } from "next/server";
import { adminSupabaseFetch } from "@/app/lib/server/admin";
import { requireVerifiedRequestAuth } from "@/app/lib/server/requestAuth";
import { RequestAuthError } from "@/app/lib/server/supabaseRest";
import { loadTokenAccount } from "@/app/lib/server/tokenLedger";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { userId } = await requireVerifiedRequestAuth(request);
    const [devicesResponse, scansResponse, account] = await Promise.all([
      adminSupabaseFetch(`cli_access_tokens?user_id=eq.${userId}&select=id,name,last_used_at,expires_at,revoked_at,created_at&order=created_at.desc`),
      adminSupabaseFetch(`cli_scan_events?user_id=eq.${userId}&select=id,cli_token_id,repository,issues,token_cost,created_at&order=created_at.desc&limit=100`),
      loadTokenAccount(userId),
    ]);
    const devices = devicesResponse.ok ? await devicesResponse.json() as Array<{ id: string; revoked_at: string | null }> : [];
    const scans = scansResponse.ok ? await scansResponse.json() as Array<{ token_cost: number }> : [];
    const activeDevices = devices.filter((device) => !device.revoked_at);
    return NextResponse.json({ connected: activeDevices.length > 0, devices, scans, stats: { connectedTerminals: activeDevices.length, scanCount: scans.length, tokensUsed: scans.reduce((sum, scan) => sum + Number(scan.token_cost || 0), 0), tokensLeft: account.balance } });
  } catch (error) {
    if (error instanceof RequestAuthError) return NextResponse.json({ error: error.message }, { status: 401 });
    return NextResponse.json({ error: "Unable to load CLI settings." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { userId } = await requireVerifiedRequestAuth(request);
    const tokenId = new URL(request.url).searchParams.get("tokenId") ?? "";
    if (!/^[0-9a-f-]{36}$/i.test(tokenId)) return NextResponse.json({ error: "Invalid terminal." }, { status: 400 });
    const response = await adminSupabaseFetch(`cli_access_tokens?id=eq.${tokenId}&user_id=eq.${userId}&revoked_at=is.null`, { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify({ revoked_at: new Date().toISOString() }) });
    const rows = response.ok ? await response.json() : [];
    if (!rows[0]) return NextResponse.json({ error: "Terminal not found." }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof RequestAuthError) return NextResponse.json({ error: error.message }, { status: 401 });
    return NextResponse.json({ error: "Unable to revoke terminal." }, { status: 500 });
  }
}
