import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { isValidEmail, normalizeEmail } from "@/app/lib/auth-validation";
import { sendPasswordResetEmail } from "@/app/lib/server/email";
import { logServerError } from "@/app/lib/server/logger";

export const runtime = "nodejs";

const GENERIC_RESPONSE = {
  ok: true,
  message: "If an account exists for that email, a password reset link is on its way.",
};

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = normalizeEmail(typeof body?.email === "string" ? body.email : "");
    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
    if (!url || !serviceRoleKey || !process.env.RESEND_API_KEY?.trim()) {
      logServerError("auth.password_reset_not_configured", new Error("Password reset environment is incomplete."));
      return NextResponse.json({ error: "Password recovery is temporarily unavailable." }, { status: 503 });
    }

    const origin = process.env.NEXT_PUBLIC_SITE_URL?.trim() || new URL(request.url).origin;
    const redirectTo = new URL("/auth?mode=reset", origin).toString();
    const supabase = createClient(url, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data, error } = await supabase.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo },
    });

    // Supabase returns an error for unknown users. Keep the public response
    // identical so this endpoint cannot be used for account discovery.
    if (error || !data.properties?.hashed_token) return NextResponse.json(GENERIC_RESPONSE);

    const resetUrl = new URL("/auth/callback", origin);
    resetUrl.searchParams.set("token_hash", data.properties.hashed_token);
    resetUrl.searchParams.set("type", "recovery");
    resetUrl.searchParams.set("next", "/auth?mode=reset");
    await sendPasswordResetEmail({
      to: email,
      resetUrl: resetUrl.toString(),
    });
    return NextResponse.json(GENERIC_RESPONSE);
  } catch (error) {
    logServerError("auth.password_reset_failed", error);
    return NextResponse.json(GENERIC_RESPONSE);
  }
}
