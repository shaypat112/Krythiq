import { NextResponse } from "next/server";
import { adminSupabaseFetch } from "@/app/lib/server/admin";
import { sendReferralEmail } from "@/app/lib/server/email";
import { requireVerifiedRequestAuth } from "@/app/lib/server/requestAuth";
import {
  authEmailAlreadyExists, countRows, createOptOutToken, ensureReferralCode,
  hashReferralValue, isDisposableEmail, maskEmail, normalizeReferralEmail,
  safeClientIp,
} from "@/app/lib/server/referrals";
import { RequestAuthError } from "@/app/lib/server/supabaseRest";
import { logServerError } from "@/app/lib/server/logger";

export const runtime = "nodejs";

function siteOrigin(request: Request) {
  return process.env.NEXT_PUBLIC_SITE_URL?.trim() || new URL(request.url).origin;
}

export async function GET(request: Request) {
  try {
    const { userId } = await requireVerifiedRequestAuth(request);
    const code = await ensureReferralCode(userId);
    const [inviteResponse, relationshipResponse, rewardsResponse] = await Promise.all([
      adminSupabaseFetch(`referral_invitations?inviter_id=eq.${userId}&select=id,normalized_email,status,sent_at,claimed_at,qualified_at,expires_at,created_at&order=created_at.desc&limit=100`),
      adminSupabaseFetch(`referral_relationships?referrer_id=eq.${userId}&select=id,status,claimed_at,qualified_at,rewarded_at&order=created_at.desc&limit=100`),
      adminSupabaseFetch(`token_transactions?user_id=eq.${userId}&transaction_type=eq.referral_reward&select=amount`),
    ]);
    if (!inviteResponse.ok || !relationshipResponse.ok || !rewardsResponse.ok) throw new Error("Unable to load referral history.");
    const invitations = await inviteResponse.json() as Array<Record<string, unknown> & { normalized_email: string }>;
    const rewards = await rewardsResponse.json() as Array<{ amount: number }>;
    return NextResponse.json({
      code: code.code,
      referralUrl: new URL(`/auth?ref=${encodeURIComponent(code.code)}`, siteOrigin(request)).toString(),
      rewardAmount: code.reward_amount,
      earnedTokens: rewards.reduce((sum, row) => sum + Number(row.amount), 0),
      invitations: invitations.map(({ normalized_email, ...invite }) => ({ ...invite, email: maskEmail(normalized_email) })),
      relationships: await relationshipResponse.json(),
    });
  } catch (error) {
    if (error instanceof RequestAuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "Unable to load referrals." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { userId, user } = await requireVerifiedRequestAuth(request);
    const body = await request.json().catch(() => ({}));
    const email = normalizeReferralEmail(body?.email);
    if (!email) return NextResponse.json({ error: "Enter a valid email address.", code: "INVALID_EMAIL" }, { status: 400 });
    if (email === normalizeReferralEmail(user.email) || isDisposableEmail(email)) {
      return NextResponse.json({ error: "This email cannot receive a referral.", code: "INVALID_REFERRAL" }, { status: 400 });
    }

    const emailHash = hashReferralValue(email);
    const ipHash = hashReferralValue(safeClientIp(request));
    const oneHourAgo = encodeURIComponent(new Date(Date.now() - 60 * 60 * 1000).toISOString());
    const oneDayAgo = encodeURIComponent(new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
    const [userCount, emailCount, ipCount, optOutResponse] = await Promise.all([
      countRows(`referral_request_attempts?inviter_id=eq.${userId}&created_at=gte.${oneHourAgo}&select=id`),
      countRows(`referral_request_attempts?email_hash=eq.${emailHash}&created_at=gte.${oneDayAgo}&select=id`),
      countRows(`referral_request_attempts?ip_hash=eq.${ipHash}&created_at=gte.${oneHourAgo}&select=id`),
      adminSupabaseFetch(`referral_opt_outs?email_hash=eq.${emailHash}&select=email_hash&limit=1`),
    ]);
    const rateLimited = userCount >= 5 || emailCount >= 3 || ipCount >= 20;
    const optedOut = optOutResponse.ok && (await optOutResponse.json() as unknown[]).length > 0;
    const existingAccount = await authEmailAlreadyExists(email);
    const code = await ensureReferralCode(userId);
    const duplicateResponse = await adminSupabaseFetch(
      `referral_invitations?inviter_id=eq.${userId}&email_hash=eq.${emailHash}&select=id,status&limit=1`,
    );
    const duplicate = duplicateResponse.ok && (await duplicateResponse.json() as unknown[]).length > 0;
    const outcome = rateLimited ? "rate_limited" : optedOut || existingAccount ? "blocked" : duplicate ? "duplicate" : "accepted";

    await adminSupabaseFetch("referral_request_attempts", {
      method: "POST",
      body: JSON.stringify({ inviter_id: userId, email_hash: emailHash, ip_hash: ipHash, outcome }),
    });
    if (rateLimited) {
      return NextResponse.json({ error: "Too many referral requests. Try again later.", code: "RATE_LIMITED" }, { status: 429 });
    }
    if (outcome !== "accepted") {
      return NextResponse.json({ ok: true, message: "If this address is eligible, an invitation will be sent." });
    }

    const insert = await adminSupabaseFetch("referral_invitations", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ code_id: code.id, inviter_id: userId, normalized_email: email, email_hash: emailHash, status: "pending" }),
    });
    if (!insert.ok) return NextResponse.json({ ok: true, message: "If this address is eligible, an invitation will be sent." });
    const invitation = (await insert.json() as Array<{ id: string }>)[0];
    const origin = siteOrigin(request);
    const referralUrl = new URL(`/auth?ref=${encodeURIComponent(code.code)}`, origin).toString();
    const optOutToken = createOptOutToken(email);
    const optOutUrl = new URL(`/referrals/opt-out?token=${encodeURIComponent(optOutToken)}`, origin).toString();
    const inviterName = String(user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "A Krythiq user").slice(0, 80);

    try {
      await sendReferralEmail({ to: email, inviterName, referralUrl, optOutUrl, rewardAmount: code.reward_amount });
      await adminSupabaseFetch(`referral_invitations?id=eq.${invitation.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "sent", sent_at: new Date().toISOString() }),
      });
    } catch {
      await adminSupabaseFetch(`referral_invitations?id=eq.${invitation.id}`, { method: "DELETE" });
      return NextResponse.json({ error: "The referral email could not be delivered.", code: "DELIVERY_FAILED" }, { status: 502 });
    }
    return NextResponse.json({ ok: true, message: "Referral invitation sent." }, { status: 201 });
  } catch (error) {
    if (error instanceof RequestAuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    logServerError("referral.send_failed", error);
    return NextResponse.json({ error: "Unable to send referral.", code: "REFERRAL_FAILED" }, { status: 500 });
  }
}
