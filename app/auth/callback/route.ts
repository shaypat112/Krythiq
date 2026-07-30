import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { adminSupabaseFetch } from "@/app/lib/server/admin";

function safeNextPath(value: string | null) {
  return value?.startsWith("/") && !value.startsWith("//")
    ? value
    : "/dashboard";
}

function redirectWithCookies(response: NextResponse, destination: URL) {
  const redirect = NextResponse.redirect(destination);
  for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie);
  return redirect;
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const tokenType = request.nextUrl.searchParams.get("type");
  const next = safeNextPath(request.nextUrl.searchParams.get("next"));
  const referralCode = /^[A-Za-z0-9_-]{20,80}$/.test(request.nextUrl.searchParams.get("ref") ?? "")
    ? request.nextUrl.searchParams.get("ref")
    : null;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const redirectUrl = new URL(next, request.url);
  const response = NextResponse.redirect(redirectUrl);

  if ((!code && !tokenHash) || !url || !anonKey) {
    return NextResponse.redirect(new URL("/auth?error=callback", request.url));
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookies) => {
        for (const cookie of cookies) response.cookies.set(cookie);
      },
    },
  });

  const supportedTokenTypes = ["signup", "magiclink", "recovery", "invite", "email_change"] as const;
  const verifiedType = supportedTokenTypes.find((type) => type === tokenType);
  const { error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : verifiedType && tokenHash
      ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type: verifiedType })
      : { error: new Error("Unsupported authentication callback.") };
  if (error) {
    return redirectWithCookies(
      response,
      new URL("/auth?error=expired-link", request.url),
    );
  }

  const { data } = await supabase.auth.getUser();
  if (!data.user?.email_confirmed_at) {
    return redirectWithCookies(
      response,
      new URL("/auth?verification=required", request.url),
    );
  }

  if (referralCode) {
    await adminSupabaseFetch("rpc/claim_referral", {
      method: "POST",
      body: JSON.stringify({ target_user_id: data.user.id, referral_code: referralCode }),
    }).catch(() => undefined);
  }

  return response;
}
