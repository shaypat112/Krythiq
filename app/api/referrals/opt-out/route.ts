import { NextResponse } from "next/server";
import { adminSupabaseFetch } from "@/app/lib/server/admin";
import { hashReferralValue, verifyOptOutToken } from "@/app/lib/server/referrals";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const email = verifyOptOutToken(typeof body?.token === "string" ? body.token : "");
  if (!email) return NextResponse.json({ error: "This opt-out link is invalid or expired." }, { status: 400 });
  const emailHash = hashReferralValue(email);
  const response = await adminSupabaseFetch("referral_opt_outs?on_conflict=email_hash", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ email_hash: emailHash }),
  });
  if (!response.ok) return NextResponse.json({ error: "Unable to save email preference." }, { status: 500 });
  await adminSupabaseFetch(`referral_invitations?email_hash=eq.${emailHash}&status=in.(pending,sent)`, {
    method: "PATCH",
    body: JSON.stringify({ status: "opted_out" }),
  });
  return NextResponse.json({ ok: true });
}
