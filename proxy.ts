import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { apiPlanCatalog, normalizeApiLimits, planFromPriceId, type ApiLimitSettings, type ApiPlanId } from "@/app/lib/api-rate-limits";

type Bucket = { count: number; resetAt: number };

// This is intentionally a small, bounded process-local shield. A CDN/WAF must
// remain the authoritative DDoS control for multi-instance deployments.
const buckets = new Map<string, Bucket>();
const limitCache = new Map<string, { limits: ApiLimitSettings; plan: ApiPlanId; expiresAt: number }>();
const WINDOW_MS = 60_000;
const MAX_BUCKETS = 10_000;
const LIMIT_CACHE_MS = 60_000;
const protectedPrefixes = [
  "/billing",
  "/dashboard",
  "/onboarding",
  "/partners",
  "/profile",
  "/reports",
  "/scan",
  "/settings",
  "/teams",
];

function copyResponseCookies(source: NextResponse, target: NextResponse) {
  for (const cookie of source.cookies.getAll()) target.cookies.set(cookie);
  return target;
}

async function authenticatedPageResponse(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  let response = NextResponse.next({ request });

  if (!url || !anonKey) return response;

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookies) => {
        for (const cookie of cookies) request.cookies.set(cookie.name, cookie.value);
        response = NextResponse.next({ request });
        for (const cookie of cookies) response.cookies.set(cookie);
      },
    },
  });

  const { data, error } = await supabase.auth.getUser();
  const user = error ? null : data.user;
  const verified = Boolean(user?.email_confirmed_at);
  const { pathname, search } = request.nextUrl;
  const isProtected = protectedPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  const isAuthRoute = pathname === "/auth";
  const isLandingRoute = pathname === "/" || pathname === "/landing-page";
  const needsOnboarding =
    Boolean(user && verified) &&
    user?.user_metadata?.onboarding_completed !== true;

  if (user && verified && (isLandingRoute || isAuthRoute)) {
    return copyResponseCookies(
      response,
      NextResponse.redirect(
        new URL(needsOnboarding ? "/onboarding" : "/dashboard", request.url),
      ),
    );
  }

  if (
    user &&
    verified &&
    needsOnboarding &&
    isProtected &&
    pathname !== "/onboarding"
  ) {
    const onboardingUrl = new URL("/onboarding", request.url);
    onboardingUrl.searchParams.set("next", `${pathname}${search}`);
    return copyResponseCookies(
      response,
      NextResponse.redirect(onboardingUrl),
    );
  }

  if (
    user &&
    verified &&
    !needsOnboarding &&
    pathname === "/onboarding"
  ) {
    return copyResponseCookies(
      response,
      NextResponse.redirect(new URL("/dashboard", request.url)),
    );
  }

  if (user && !verified && isProtected) {
    return copyResponseCookies(
      response,
      NextResponse.redirect(new URL("/auth?verification=required", request.url)),
    );
  }

  if (!user && isProtected) {
    const signInUrl = new URL("/auth", request.url);
    signInUrl.searchParams.set("next", `${pathname}${search}`);
    return copyResponseCookies(response, NextResponse.redirect(signInUrl));
  }

  return response;
}

function clientAddress(request: NextRequest) {
  // Prefer the platform-provided address. Only trust forwarded headers when
  // the deployment sits behind a trusted reverse proxy/CDN.
  return (
    request.headers.get("x-real-ip")?.trim() ||
    request.headers.get("x-forwarded-for")?.split(",", 1)[0]?.trim() ||
    "unknown"
  );
}

function isExpensivePath(pathname: string) {
  return (
    pathname === "/api/scan/github" ||
    pathname === "/api/github/repo-scan" ||
    pathname.startsWith("/api/ai/") ||
    pathname === "/api/ai" ||
    pathname === "/api/chat" ||
    pathname === "/api/analyze" ||
    pathname === "/api/settings/test-webhook"
  );
}

function tokenIdentity(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return null;
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8")) as { sub?: unknown };
    return typeof payload.sub === "string" ? { token, userId: payload.sub } : null;
  } catch {
    return null;
  }
}

async function requestLimits(request: NextRequest) {
  const identity = tokenIdentity(request);
  const fallback = { identity: clientAddress(request), limits: apiPlanCatalog.free.limits, plan: "free" as ApiPlanId };
  if (!identity) return fallback;

  const cached = limitCache.get(identity.userId);
  if (cached && cached.expiresAt > Date.now()) return { identity: identity.userId, limits: cached.limits, plan: cached.plan };

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return fallback;
  const headers = { apikey: anonKey, Authorization: `Bearer ${identity.token}` };
  try {
    const [settingsResponse, billingResponse] = await Promise.all([
      fetch(`${url}/rest/v1/user_settings?user_id=eq.${encodeURIComponent(identity.userId)}&select=data&limit=1`, { headers }),
      fetch(`${url}/rest/v1/billing_customers?user_id=eq.${encodeURIComponent(identity.userId)}&select=price_id,status&limit=1`, { headers }),
    ]);
    if (!settingsResponse.ok) return fallback;
    const settingsRows = await settingsResponse.json() as Array<{ data?: Partial<ApiLimitSettings> }>;
    const billingRows = billingResponse.ok
      ? await billingResponse.json() as Array<{ price_id?: string | null; status?: string | null }>
      : [];
    const billing = billingRows[0];
    const plan = billing?.status === "active" || billing?.status === "trialing" ? planFromPriceId(billing.price_id) : "free";
    const limits = normalizeApiLimits(settingsRows[0]?.data, plan);
    if (limitCache.size >= MAX_BUCKETS) {
      for (const [key, value] of limitCache) if (value.expiresAt <= Date.now()) limitCache.delete(key);
    }
    limitCache.set(identity.userId, { limits, plan, expiresAt: Date.now() + LIMIT_CACHE_MS });
    return { identity: identity.userId, limits, plan };
  } catch {
    return fallback;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!pathname.startsWith("/api/")) return authenticatedPageResponse(request);

  const now = Date.now();
  const policy = await requestLimits(request);
  const expensive = isExpensivePath(pathname);
  const limit = expensive ? policy.limits.expensiveRequestsPerMinute : policy.limits.apiRequestsPerMinute;
  const key = `${policy.identity}:${expensive ? "expensive" : "standard"}`;
  let bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    if (buckets.size >= MAX_BUCKETS) {
      for (const [bucketKey, value] of buckets) {
        if (value.resetAt <= now) buckets.delete(bucketKey);
      }
    }
    bucket = { count: 0, resetAt: now + WINDOW_MS };
    buckets.set(key, bucket);
  }

  bucket.count += 1;
  const remaining = Math.max(0, limit - bucket.count);
  const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));

  if (bucket.count > limit) {
    return NextResponse.json(
      { error: "Too many requests. Please retry later." },
      {
        status: 429,
        headers: {
          "Cache-Control": "no-store",
          "Retry-After": String(retryAfter),
          "X-RateLimit-Limit": String(limit),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(Math.ceil(bucket.resetAt / 1000)),
          "X-RateLimit-Plan": policy.plan,
          "X-RateLimit-Scope": expensive ? "scans-ai" : "standard-api",
        },
      },
    );
  }

  const response = NextResponse.next();
  response.headers.set("X-RateLimit-Limit", String(limit));
  response.headers.set("X-RateLimit-Remaining", String(remaining));
  response.headers.set("X-RateLimit-Reset", String(Math.ceil(bucket.resetAt / 1000)));
  response.headers.set("X-RateLimit-Plan", policy.plan);
  response.headers.set("X-RateLimit-Scope", expensive ? "scans-ai" : "standard-api");
  return response;
}

export const config = {
  matcher: [
    "/api/:path*",
    "/",
    "/landing-page/:path*",
    "/auth",
    "/billing/:path*",
    "/dashboard/:path*",
    "/onboarding",
    "/partners/:path*",
    "/profile/:path*",
    "/reports/:path*",
    "/scan/:path*",
    "/settings/:path*",
    "/teams/:path*",
  ],
};
