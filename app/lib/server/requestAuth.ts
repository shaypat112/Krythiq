import { getSupabaseEnv, extractBearerToken, RequestAuthError } from "./supabaseRest";

type VerifiedAuthUser = {
  id: string;
  email?: string | null;
  email_confirmed_at?: string | null;
  user_metadata?: Record<string, unknown>;
};

export async function requireVerifiedRequestAuth(request: Request) {
  const accessToken = extractBearerToken(request);
  if (!accessToken) throw new RequestAuthError("Unauthorized");

  const env = getSupabaseEnv();
  const response = await fetch(`${env.url}/auth/v1/user`, {
    headers: {
      apikey: env.anonKey,
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });
  if (!response.ok) throw new RequestAuthError("Unauthorized");

  const user = await response.json() as VerifiedAuthUser;
  if (!user.id || !user.email_confirmed_at) {
    throw new RequestAuthError("Verified email required", 403);
  }
  return { accessToken, userId: user.id, user };
}
