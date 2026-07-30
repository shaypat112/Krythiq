import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { adminSupabaseFetch, getServiceRoleHeaders } from "./admin";
import { isValidEmail, normalizeEmail } from "@/app/lib/auth-validation";

const DISPOSABLE_DOMAINS = new Set([
  "10minutemail.com", "guerrillamail.com", "mailinator.com", "temp-mail.org",
  "tempmail.com", "throwawaymail.com", "yopmail.com",
]);

export function referralSecret() {
  const value = process.env.REFERRAL_SIGNING_SECRET?.trim();
  if (value && value.length >= 32) return value;

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!serviceRoleKey || serviceRoleKey.length < 32) {
    throw new Error("Referral signing is unavailable.");
  }
  return createHash("sha256")
    .update(`krythiq-referral-signing-v1:${serviceRoleKey}`)
    .digest("hex");
}

export function hashReferralValue(value: string) {
  return createHmac("sha256", referralSecret()).update(value).digest("hex");
}

export function normalizeReferralEmail(value: unknown) {
  const email = normalizeEmail(typeof value === "string" ? value : "");
  return isValidEmail(email) ? email : null;
}

export function isDisposableEmail(email: string) {
  return DISPOSABLE_DOMAINS.has(email.split("@")[1] ?? "");
}

export function createReferralCode() {
  return randomBytes(24).toString("base64url");
}

export function safeClientIp(request: Request) {
  return (
    request.headers.get("x-real-ip")?.trim() ||
    request.headers.get("x-forwarded-for")?.split(",", 1)[0]?.trim() ||
    "unknown"
  );
}

export function createOptOutToken(email: string) {
  const expires = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 90;
  const payload = Buffer.from(JSON.stringify({ email, expires })).toString("base64url");
  const signature = createHmac("sha256", referralSecret()).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function verifyOptOutToken(token: string) {
  const [payload, supplied] = token.split(".");
  if (!payload || !supplied) return null;
  const expected = createHmac("sha256", referralSecret()).update(payload).digest();
  const candidate = Buffer.from(supplied, "base64url");
  if (candidate.length !== expected.length || !timingSafeEqual(candidate, expected)) return null;
  try {
    const value = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { email?: unknown; expires?: unknown };
    if (typeof value.email !== "string" || typeof value.expires !== "number" || value.expires < Date.now() / 1000) return null;
    return normalizeReferralEmail(value.email);
  } catch {
    return null;
  }
}

export async function authEmailAlreadyExists(email: string) {
  const { env, headers } = getServiceRoleHeaders();
  for (let page = 1; page <= 100; page += 1) {
    const response = await fetch(`${env.url}/auth/v1/admin/users?page=${page}&per_page=1000`, {
      headers,
      cache: "no-store",
    });
    if (!response.ok) throw new Error("Unable to validate referral eligibility.");
    const payload = await response.json() as { users?: Array<{ email?: string | null }> };
    const users = payload.users ?? [];
    if (users.some((user) => normalizeEmail(user.email ?? "") === email)) return true;
    if (users.length < 1000) return false;
  }
  throw new Error("Unable to validate referral eligibility.");
}

export async function countRows(path: string) {
  const response = await adminSupabaseFetch(path, {
    method: "HEAD",
    headers: { Prefer: "count=exact" },
  });
  if (!response.ok) throw new Error("Unable to check referral limits.");
  const range = response.headers.get("content-range") ?? "*/0";
  return Number(range.split("/")[1] ?? 0);
}

export async function ensureReferralCode(userId: string) {
  const existing = await adminSupabaseFetch(
    `referral_codes?user_id=eq.${encodeURIComponent(userId)}&select=id,code,reward_amount&limit=1`,
  );
  if (!existing.ok) throw new Error("Unable to load referral code.");
  const rows = await existing.json() as Array<{ id: string; code: string; reward_amount: number }>;
  if (rows[0]) return rows[0];

  const response = await adminSupabaseFetch("referral_codes", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ user_id: userId, code: createReferralCode() }),
  });
  if (!response.ok) {
    const retry = await adminSupabaseFetch(
      `referral_codes?user_id=eq.${encodeURIComponent(userId)}&select=id,code,reward_amount&limit=1`,
    );
    const retryRows = retry.ok ? await retry.json() as typeof rows : [];
    if (retryRows[0]) return retryRows[0];
    throw new Error("Unable to create referral code.");
  }
  return (await response.json() as typeof rows)[0];
}

export function maskEmail(email: string) {
  const [local, domain] = email.split("@");
  return `${local.slice(0, 2)}${"*".repeat(Math.min(5, Math.max(1, local.length - 2)))}@${domain}`;
}
