import { NextResponse } from "next/server";
import { requireCliAuth } from "@/app/lib/server/cliAuth";
import { loadTokenAccount } from "@/app/lib/server/tokenLedger";
import { RequestAuthError } from "@/app/lib/server/supabaseRest";
import { adminSupabaseFetch, fetchAuthUserById } from "@/app/lib/server/admin";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { userId } = await requireCliAuth(request);
    const [account, profileResponse, scansResponse, authUser] = await Promise.all([
      loadTokenAccount(userId),
      adminSupabaseFetch(`profiles?id=eq.${userId}&select=username,full_name&limit=1`),
      adminSupabaseFetch(`cli_scan_events?user_id=eq.${userId}&select=token_cost&limit=1000`),
      fetchAuthUserById(userId),
    ]);
    const profile = profileResponse.ok ? (await profileResponse.json() as Array<{ username: string | null; full_name: string | null }>)[0] : null;
    const scans = scansResponse.ok ? await scansResponse.json() as Array<{ token_cost: number }> : [];
    return NextResponse.json({
      balance: account.balance,
      connected: true,
      profile: { username: profile?.username ?? null, fullName: profile?.full_name ?? null, email: authUser.email ?? null },
      cli: { scanCount: scans.length, tokensUsed: scans.reduce((sum, scan) => sum + Number(scan.token_cost || 0), 0) },
    });
  } catch (error) {
    if (error instanceof RequestAuthError) return NextResponse.json({ error: error.message }, { status: 401 });
    return NextResponse.json({ error: "Unable to load CLI account." }, { status: 500 });
  }
}
