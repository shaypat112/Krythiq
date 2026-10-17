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
      adminSupabaseFetch("rpc/cli_usage_summary", { method: "POST", body: JSON.stringify({ p_user_id: userId }) }),
      fetchAuthUserById(userId),
    ]);
    const profile = profileResponse.ok ? (await profileResponse.json() as Array<{ username: string | null; full_name: string | null }>)[0] : null;
    if (!scansResponse.ok) return NextResponse.json({ error: "CLI usage is temporarily unavailable." }, { status: 503 });
    const usage = (await scansResponse.json())?.[0];
    return NextResponse.json({
      balance: account.balance,
      transactions: account.transactions,
      connected: true,
      profile: { username: profile?.username ?? null, fullName: profile?.full_name ?? null, email: authUser.email ?? null },
      cli: { scanCount: Number(usage?.scan_count ?? 0), tokensUsed: Number(usage?.tokens_used ?? 0) },
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof RequestAuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "Unable to load CLI account." }, { status: 503 });
  }
}
