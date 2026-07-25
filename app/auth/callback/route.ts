import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

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
  const next = safeNextPath(request.nextUrl.searchParams.get("next"));
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const redirectUrl = new URL(next, request.url);
  const response = NextResponse.redirect(redirectUrl);

  if (!code || !url || !anonKey) {
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

  const { error } = await supabase.auth.exchangeCodeForSession(code);
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

  return response;
}
