import { getSupabaseEnv, supabaseFetch } from "@/app/lib/server/supabaseRest";

type ProfileRow = {
  id: string;
  username?: string | null;
  full_name?: string | null;
};

type AuthUser = {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
  app_metadata?: Record<string, unknown> | null;
  identities?: Array<{
    provider?: string;
    identity_data?: Record<string, unknown> | null;
  }> | null;
};

export function getAdminIdentityConfig() {
  return {
    profileUsername:
      process.env.ADMIN_PROFILE_USERNAME?.trim() || "",
    fullName:
      process.env.ADMIN_FULL_NAME?.trim() || "",
    githubLogin:
      process.env.ADMIN_GITHUB_LOGIN?.trim() || "",
  };
}

export function getServiceRoleHeaders() {
  const env = getSupabaseEnv();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "";
  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is missing.");
  }

  return {
    env,
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
    },
  };
}

export async function adminSupabaseFetch(
  path: string,
  init: RequestInit = {},
) {
  const { env, headers } = getServiceRoleHeaders();
  return fetch(`${env.url}/rest/v1/${path}`, {
    ...init,
    headers: {
      ...headers,
      ...(init.headers ?? {}),
    },
  });
}

export async function loadProfileForUser(
  accessToken: string,
  userId: string,
) {
  const env = getSupabaseEnv();
  const res = await supabaseFetch(
    env,
    `profiles?id=eq.${userId}&select=id,username,full_name&limit=1`,
    { accessToken },
  );

  if (!res.ok) {
    throw new Error(await res.text());
  }

  const rows = (await res.json()) as ProfileRow[];
  return rows[0] ?? null;
}

export async function fetchAuthUser(accessToken: string) {
  const env = getSupabaseEnv();
  const res = await fetch(`${env.url}/auth/v1/user`, {
    headers: {
      apikey: env.anonKey,
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    throw new Error(await res.text());
  }

  return (await res.json()) as AuthUser;
}

export function extractGitHubLogin(user: AuthUser | null | undefined) {
  const meta = user?.user_metadata ?? {};
  const directCandidates = [
    meta["user_name"],
    meta["preferred_username"],
    meta["username"],
    meta["login"],
    meta["name"],
  ];

  for (const candidate of directCandidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }

  for (const identity of user?.identities ?? []) {
    if (identity.provider !== "github") continue;
    const identityData = identity.identity_data ?? {};
    const identityCandidate =
      identityData["user_name"] ??
      identityData["preferred_username"] ??
      identityData["username"] ??
      identityData["login"];
    if (typeof identityCandidate === "string" && identityCandidate.trim()) {
      return identityCandidate.trim();
    }
  }

  return null;
}

export async function isAdminAccess(accessToken: string, userId: string) {
  const [profile, authUser] = await Promise.all([
    loadProfileForUser(accessToken, userId),
    fetchAuthUser(accessToken),
  ]);

  const config = getAdminIdentityConfig();
  const githubLogin = extractGitHubLogin(authUser);
  const fullName = profile?.full_name?.trim().toLowerCase() ?? "";
  const profileMatches =
    Boolean(config.profileUsername) && profile?.username === config.profileUsername ||
    Boolean(config.githubLogin) && profile?.username === config.githubLogin;
  const fullNameMatches =
    Boolean(config.fullName) && fullName === config.fullName.trim().toLowerCase();

  return Boolean(config.githubLogin) && githubLogin === config.githubLogin || Boolean(profileMatches) || fullNameMatches;
}
