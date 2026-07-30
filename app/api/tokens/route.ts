import { NextResponse } from "next/server";
import { tokenActionCatalog } from "@/app/lib/tokens";
import { requireVerifiedRequestAuth } from "@/app/lib/server/requestAuth";
import { loadTokenAccount } from "@/app/lib/server/tokenLedger";
import { RequestAuthError } from "@/app/lib/server/supabaseRest";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { userId } = await requireVerifiedRequestAuth(request);
    const account = await loadTokenAccount(userId);
    return NextResponse.json({ ...account, costs: tokenActionCatalog });
  } catch (error) {
    if (error instanceof RequestAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Unable to load Tokens." }, { status: 500 });
  }
}
