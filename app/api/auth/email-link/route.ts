import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { isStrongPassword, isValidEmail, normalizeEmail } from "@/app/lib/auth-validation";
import { isEmailConfigured, sendAuthLinkEmail } from "@/app/lib/server/email";
import { logServerError } from "@/app/lib/server/logger";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const kind = body?.kind === "signup" ? "signup" : body?.kind === "magiclink" ? "magiclink" : null;
    const email = normalizeEmail(typeof body?.email === "string" ? body.email : "");
    const password = typeof body?.password === "string" ? body.password : "";
    const nextPath = typeof body?.next === "string" && body.next.startsWith("/") && !body.next.startsWith("//")
      ? body.next
      : "/dashboard";
    const referralCode = /^[A-Za-z0-9_-]{20,80}$/.test(body?.referralCode ?? "")
      ? String(body.referralCode)
      : null;
    if (!kind || !isValidEmail(email)) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }
    if (kind === "signup" && !isStrongPassword(password)) {
      return NextResponse.json({ error: "The password does not meet the security requirements." }, { status: 400 });
    }

    const url = (process.env.SUPABASE_INTERNAL_URL || process.env.NEXT_PUBLIC_SUPABASE_URL)?.trim();
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
    if (!url || !serviceRoleKey || !isEmailConfigured()) {
      return NextResponse.json({ error: "Email authentication is temporarily unavailable." }, { status: 503 });
    }
    const origin = process.env.NEXT_PUBLIC_SITE_URL?.trim() || new URL(request.url).origin;
    const redirectUrl = new URL("/auth/callback", origin);
    redirectUrl.searchParams.set("next", nextPath);
    if (kind === "signup" && referralCode) redirectUrl.searchParams.set("ref", referralCode);
    const redirectTo = redirectUrl.toString();
    const supabase = createClient(url, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const result = kind === "signup"
      ? await supabase.auth.admin.generateLink({ type: "signup", email, password, options: { redirectTo } })
      : await supabase.auth.admin.generateLink({ type: "magiclink", email, options: { redirectTo } });

    if (result.error || !result.data.properties?.hashed_token) {
      if (kind === "signup") {
        return NextResponse.json({ error: "An account with this email already exists. Sign in instead." }, { status: 409 });
      }
      return NextResponse.json({ ok: true, message: "If an account exists, a sign-in link is on its way." });
    }
    const actionUrl = new URL("/auth/callback", origin);
    actionUrl.searchParams.set("token_hash", result.data.properties.hashed_token);
    actionUrl.searchParams.set("type", kind === "signup" ? "signup" : "magiclink");
    actionUrl.searchParams.set("next", nextPath);
    if (kind === "signup" && referralCode) actionUrl.searchParams.set("ref", referralCode);
    await sendAuthLinkEmail({
      to: email,
      actionUrl: actionUrl.toString(),
      kind,
    });
    return NextResponse.json({
      ok: true,
      message: kind === "signup"
        ? "Check your email to confirm your account."
        : "If an account exists, a sign-in link is on its way.",
    });
  } catch (error) {
    logServerError("auth.email_link_failed", error);
    return NextResponse.json({ error: "Unable to send the email right now." }, { status: 502 });
  }
}
