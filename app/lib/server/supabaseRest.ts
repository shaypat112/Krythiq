export type SupabaseEnv = {
  url: string;
  anonKey: string;
};

export class RequestAuthError extends Error {
  status: number;

  constructor(message: string, status = 401) {
    super(message);
    this.name = "RequestAuthError";
    this.status = status;
  }
}

export function getSupabaseEnv(): SupabaseEnv {
  const url = process.env.SUPABASE_INTERNAL_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error("Supabase environment variables missing.");
  }
  return { url, anonKey };
}

export function decodeUserId(token: string): string | null {
  const parts = token.split(".");
  if (parts.length < 2) return null;
  try {
    const payload = JSON.parse(
      Buffer.from(parts[1].replace(/-/g, "+").replace(/_/g, "/"), "base64").toString(
        "utf-8",
      ),
    );
    return payload.sub ?? null;
  } catch {
    return null;
  }
}

export function extractBearerToken(request: Request): string | null {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) return null;

  const [scheme, token] = authHeader.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token.trim() || null;
}

export function requireRequestAuth(request: Request) {
  const accessToken = extractBearerToken(request);
  if (!accessToken) {
    throw new RequestAuthError("Unauthorized");
  }

  const userId = decodeUserId(accessToken);
  if (!userId) {
    throw new RequestAuthError("Unauthorized");
  }

  return { accessToken, userId };
}

export async function requireVerifiedRequestAuth(request: Request) {
  const credentials = requireRequestAuth(request);
  const env = getSupabaseEnv();
  const response = await fetch(`${env.url}/auth/v1/user`, {
    headers: buildSupabaseHeaders(env.anonKey, credentials.accessToken),
  });
  if (!response.ok) throw new RequestAuthError("Unauthorized");
  const user = await response.json() as { id?: string };
  if (user.id !== credentials.userId) throw new RequestAuthError("Unauthorized");
  return credentials;
}

export function extractSelectedTeamId(request: Request) {
  const value = request.headers.get("x-krythiq-team-id");
  if (!value) return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

export function buildSupabaseHeaders(
  anonKey: string,
  accessToken?: string,
  extra?: Record<string, string>,
): Record<string, string> {
  return {
    apikey: anonKey,
    "Content-Type": "application/json",
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    ...(extra ?? {}),
  };
}

export async function supabaseFetch(
  env: SupabaseEnv,
  path: string,
  options: RequestInit & { accessToken?: string } = {},
) {
  const { accessToken, headers, ...rest } = options;
  const mergedHeaders = buildSupabaseHeaders(
    env.anonKey,
    accessToken,
    headers as Record<string, string> | undefined,
  );

  return fetch(`${env.url}/rest/v1/${path}`, {
    ...rest,
    headers: mergedHeaders,
  });
}

export function parsePagination(searchParams: URLSearchParams, defaults = { page: 1, pageSize: 10 }) {
  const page = Math.max(1, Number(searchParams.get("page") ?? defaults.page));
  const pageSize = Math.min(
    50,
    Math.max(1, Number(searchParams.get("pageSize") ?? defaults.pageSize)),
  );
  const offset = (page - 1) * pageSize;
  return { page, pageSize, offset };
}

export function isValidHttpsUrl(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:";
  } catch {
    return false;
  }
}
