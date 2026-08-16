import "server-only";

import { adminSupabaseFetch } from "./admin";
import { decryptIntegrationCredential, encryptIntegrationCredential } from "./integrationCredentials";

type GitHubUser = { login: string };

async function verifyGitHubToken(token: string) {
  const response = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "krythiq-github-connection",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Reconnect GitHub to continue.");
  return response.json() as Promise<GitHubUser>;
}

export async function saveGitHubConnection(userId: string, providerToken: string) {
  const token = providerToken.trim();
  if (!token || token.length > 8192) throw new Error("GitHub returned an invalid access token.");
  const user = await verifyGitHubToken(token);
  const response = await adminSupabaseFetch("integration_connections?on_conflict=user_id,team_id,provider_id", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({
      user_id: userId,
      team_id: null,
      provider_id: "github",
      status: "connected",
      account_label: user.login.slice(0, 200),
      permissions: ["repository:read", "repository:write", "pull_request:write"],
      credential_encrypted: encryptIntegrationCredential(token),
      credential_hint: token.slice(-4),
      last_sync_at: new Date().toISOString(),
      last_error: null,
      updated_at: new Date().toISOString(),
    }),
  });
  if (!response.ok) throw new Error("GitHub connection storage is unavailable. Apply the latest database migrations.");
  return token;
}

export async function loadGitHubConnection(userId: string) {
  const response = await adminSupabaseFetch(
    `integration_connections?user_id=eq.${encodeURIComponent(userId)}&team_id=is.null&provider_id=eq.github&status=eq.connected&select=credential_encrypted&limit=1`,
  );
  const row = response.ok ? (await response.json() as Array<{ credential_encrypted?: string | null }>)[0] : null;
  if (!row?.credential_encrypted) return null;
  try {
    return decryptIntegrationCredential(row.credential_encrypted);
  } catch {
    return null;
  }
}

export async function resolveGitHubToken(userId: string, providerToken?: string | null) {
  if (providerToken?.trim()) return saveGitHubConnection(userId, providerToken);
  const stored = await loadGitHubConnection(userId);
  if (!stored) throw new Error("Reconnect GitHub to continue.");
  return stored;
}
