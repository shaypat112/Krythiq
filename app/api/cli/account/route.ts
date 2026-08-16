import { NextResponse } from "next/server";
import { requireCliAuth } from "@/app/lib/server/cliAuth";
import { loadTokenAccount } from "@/app/lib/server/tokenLedger";
import { RequestAuthError } from "@/app/lib/server/supabaseRest";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { userId } = await requireCliAuth(request);
    const account = await loadTokenAccount(userId);
    return NextResponse.json({ balance: account.balance, connected: true });
  } catch (error) {
    if (error instanceof RequestAuthError) return NextResponse.json({ error: error.message }, { status: 401 });
    return NextResponse.json({ error: "Unable to load CLI account." }, { status: 500 });
  }
}
