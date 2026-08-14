import "server-only";

import { adminSupabaseFetch } from "./admin";
import { getAccessibleTeamIds } from "./teams";
import { extractSelectedTeamId, requireVerifiedRequestAuth } from "./supabaseRest";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const REPOSITORY = /^[\w.-]+\/[\w.-]+$/;
const SHA = /^[0-9a-f]{40}$/i;
const protectedPath = /(^|\/)(\.env(?:\..*)?|\.github\/workflows)(\/|$)/i;
const secretLike = /(-----BEGIN [A-Z ]+PRIVATE KEY-----|(?:api[_-]?key|secret|token|password)\s*[:=]\s*["'][^"']{8,})/i;
const supportedWorkspaceFile = /(?:^|\/)(?:readme(?:\.[a-z0-9]+)?|dockerfile|makefile|package\.json|tsconfig(?:\.[\w.-]+)?\.json|requirements\.txt|go\.mod|cargo\.toml)$|\.(?:md|mdx|txt|json|jsonc|ya?ml|toml|ini|conf|js|jsx|mjs|cjs|ts|tsx|css|scss|sass|less|html?|svg|vue|svelte|py|rb|go|rs|java|kt|kts|swift|cs|php|c|cc|cpp|h|hpp|sh|bash|zsh|fish|sql|graphql|gql|proto|tf|tfvars|xml)$/i;
const ignoredWorkspaceDirectories = new Set([".git", ".next", "node_modules", "dist", "build", "coverage", "vendor", ".turbo", ".cache"]);
const MAX_REPOSITORY_FILES = 20_000;
const MAX_TREE_REQUESTS = 500;

export type RepositoryWorkspace = {
  id: string;
  team_id: string | null;
  repository: string;
  base_branch: string;
  base_commit_sha: string;
  title: string;
  status: "active" | "conflicted" | "published" | "archived";
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type WorkspaceFile = {
  id: string;
  workspace_id: string;
  path: string;
  base_blob_sha: string | null;
  original_content: string;
  content: string;
  last_edited_by: string;
  version: number;
  created_at: string;
  updated_at: string;
};

export type WorkspaceRepositoryFile = {
  path: string;
  sha: string;
  size: number;
};

export function validWorkspaceId(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value);
}

export function normalizeWorkspacePath(value: unknown) {
  const path = typeof value === "string" ? value.replaceAll("\\", "/").replace(/^\.\//, "") : "";
  if (!path || path.length > 1000 || path.startsWith("/") || path.split("/").includes("..") || protectedPath.test(path)) return null;
  return path;
}

export function validateWorkspaceContent(value: unknown) {
  if (typeof value !== "string" || Buffer.byteLength(value, "utf8") > 1_048_576) return null;
  if (secretLike.test(value)) return null;
  return value;
}

function githubHeaders(providerToken?: string): HeadersInit {
  return {
    Accept: "application/vnd.github+json",
    "User-Agent": "krythiq-workspaces",
    "X-GitHub-Api-Version": "2022-11-28",
    ...(providerToken ? { Authorization: `Bearer ${providerToken}` } : {}),
  };
}

async function githubJson<T>(path: string, providerToken?: string, reconnectMessage = "Reconnect GitHub to open this repository.") {
  const response = await fetch(`https://api.github.com${path}`, { headers: githubHeaders(providerToken), cache: "no-store" });
  if (!response.ok) {
    if ([401, 403, 404].includes(response.status)) throw new Error(reconnectMessage);
    throw new Error(`GitHub could not load the repository (${response.status}).`);
  }
  return response.json() as Promise<T>;
}

function isSafeWorkspaceTreeFile(file: WorkspaceRepositoryFile) {
  return file.size <= 1_048_576
    && supportedWorkspaceFile.test(file.path)
    && Boolean(normalizeWorkspacePath(file.path))
    && !file.path.split("/").some((part) => ignoredWorkspaceDirectories.has(part));
}

export async function listGitHubWorkspaceFiles(input: { repository: string; baseCommitSha: string; providerToken?: string }) {
  if (!REPOSITORY.test(input.repository) || !SHA.test(input.baseCommitSha)) throw new Error("Invalid repository workspace.");
  type GitTreeEntry = { path: string; type: "blob" | "tree" | string; sha: string; size?: number };
  const recursive = await githubJson<{ truncated: boolean; tree: GitTreeEntry[] }>(
    `/repos/${input.repository}/git/trees/${input.baseCommitSha}?recursive=1`,
    input.providerToken,
  );
  let entries = recursive.tree;
  if (recursive.truncated) {
    const commit = await githubJson<{ tree: { sha: string } }>(`/repos/${input.repository}/git/commits/${input.baseCommitSha}`, input.providerToken);
    const queue: Array<{ sha: string; prefix: string }> = [{ sha: commit.tree.sha, prefix: "" }];
    entries = [];
    let requests = 0;
    while (queue.length) {
      if (++requests > MAX_TREE_REQUESTS) throw new Error("This repository has too many directories to browse safely in one workspace.");
      const current = queue.shift()!;
      const tree = await githubJson<{ tree: GitTreeEntry[] }>(`/repos/${input.repository}/git/trees/${current.sha}`, input.providerToken);
      for (const entry of tree.tree) {
        const path = current.prefix ? `${current.prefix}/${entry.path}` : entry.path;
        if (path.split("/").some((part) => ignoredWorkspaceDirectories.has(part))) continue;
        if (entry.type === "tree") queue.push({ sha: entry.sha, prefix: path });
        else if (entry.type === "blob") entries.push({ ...entry, path });
        if (entries.length > MAX_REPOSITORY_FILES) throw new Error(`This repository contains more than ${MAX_REPOSITORY_FILES.toLocaleString()} editable files. Narrow workspace support is required.`);
      }
    }
  }
  return entries
    .filter((entry): entry is GitTreeEntry & { size: number } => entry.type === "blob" && typeof entry.size === "number" && SHA.test(entry.sha))
    .map((entry) => ({ path: entry.path, sha: entry.sha, size: entry.size }))
    .filter(isSafeWorkspaceTreeFile)
    .sort((left, right) => left.path.localeCompare(right.path));
}

export async function resolveGitHubFileAtCommit(input: { repository: string; path: string; baseCommitSha: string; providerToken?: string }) {
  const path = normalizeWorkspacePath(input.path);
  if (!REPOSITORY.test(input.repository) || !path || !SHA.test(input.baseCommitSha) || !supportedWorkspaceFile.test(path)) throw new Error("Invalid repository file.");
  const file = await githubJson<{ type: string; sha: string; size: number; encoding: string; content: string }>(
    `/repos/${input.repository}/contents/${path.split("/").map(encodeURIComponent).join("/")}?ref=${input.baseCommitSha}`,
    input.providerToken,
  );
  if (file.type !== "file" || file.encoding !== "base64" || file.size > 1_048_576 || !SHA.test(file.sha)) throw new Error("This repository file is not supported by the workspace editor.");
  const content = Buffer.from(file.content.replace(/\n/g, ""), "base64").toString("utf8");
  if (content.includes("\u0000")) throw new Error("Binary files cannot be edited in this workspace.");
  return { blobSha: file.sha, content };
}

export async function requireWorkspaceRequest(request: Request, workspaceId: string) {
  const auth = await requireVerifiedRequestAuth(request);
  if (!validWorkspaceId(workspaceId)) throw new Error("Workspace not found.");
  const response = await adminSupabaseFetch(`repository_workspaces?id=eq.${workspaceId}&select=id,team_id,repository,base_branch,base_commit_sha,title,status,created_by,created_at,updated_at&limit=1`);
  const workspace = response.ok ? (await response.json() as RepositoryWorkspace[])[0] : null;
  if (!workspace) throw new Error("Workspace not found.");
  if (workspace.created_by !== auth.userId) {
    if (!workspace.team_id) throw new Error("Workspace not found.");
    const teamIds = await getAccessibleTeamIds(auth.accessToken, auth.userId);
    if (!teamIds.includes(workspace.team_id)) throw new Error("Workspace not found.");
  }
  return { ...auth, workspace };
}

export async function requireSelectedWorkspaceTeam(request: Request) {
  const auth = await requireVerifiedRequestAuth(request);
  const teamId = extractSelectedTeamId(request);
  if (teamId) {
    const teamIds = await getAccessibleTeamIds(auth.accessToken, auth.userId);
    if (!teamIds.includes(teamId)) throw new Error("You do not have access to this team.");
  }
  return { ...auth, teamId };
}

export async function resolveGitHubFile(input: { repository: string; path: string; providerToken?: string }) {
  if (!REPOSITORY.test(input.repository) || !normalizeWorkspacePath(input.path)) throw new Error("Invalid repository file.");
  const headers: HeadersInit = {
    Accept: "application/vnd.github+json",
    "User-Agent": "krythiq-workspaces",
    "X-GitHub-Api-Version": "2022-11-28",
    ...(input.providerToken ? { Authorization: `Bearer ${input.providerToken}` } : {}),
  };
  const github = async <T>(path: string) => {
    const response = await fetch(`https://api.github.com${path}`, { headers, cache: "no-store" });
    if (!response.ok) {
      if ([401, 403, 404].includes(response.status)) throw new Error("GitHub authorization is required for this repository.");
      throw new Error(`GitHub could not load the repository (${response.status}).`);
    }
    return response.json() as Promise<T>;
  };
  const repository = await github<{ default_branch: string }>(`/repos/${input.repository}`);
  const commit = await github<{ sha: string }>(`/repos/${input.repository}/commits/${encodeURIComponent(repository.default_branch)}`);
  if (!SHA.test(commit.sha)) throw new Error("GitHub returned an invalid base commit.");
  const file = await github<{ type: string; sha: string; size: number; encoding: string; content: string }>(`/repos/${input.repository}/contents/${input.path.split("/").map(encodeURIComponent).join("/")}?ref=${commit.sha}`);
  if (file.type !== "file" || file.encoding !== "base64" || file.size > 1_048_576 || !SHA.test(file.sha)) throw new Error("This repository file is not supported by the workspace editor.");
  const content = Buffer.from(file.content.replace(/\n/g, ""), "base64").toString("utf8");
  if (content.includes("\u0000")) throw new Error("Binary files cannot be edited in this workspace.");
  return { baseBranch: repository.default_branch, baseCommitSha: commit.sha, blobSha: file.sha, content };
}

export async function resolveGitHubStarterFile(input: { repository: string; providerToken?: string }) {
  if (!REPOSITORY.test(input.repository)) throw new Error("Invalid repository.");
  const headers: HeadersInit = {
    Accept: "application/vnd.github+json",
    "User-Agent": "krythiq-workspaces",
    "X-GitHub-Api-Version": "2022-11-28",
    ...(input.providerToken ? { Authorization: `Bearer ${input.providerToken}` } : {}),
  };
  const github = async <T>(path: string) => {
    const response = await fetch(`https://api.github.com${path}`, { headers, cache: "no-store" });
    if (!response.ok) {
      if ([401, 403, 404].includes(response.status)) throw new Error("Reconnect GitHub to open this repository.");
      throw new Error(`GitHub could not load the repository (${response.status}).`);
    }
    return response.json() as Promise<T>;
  };
  const repository = await github<{ default_branch: string }>(`/repos/${input.repository}`);
  const commit = await github<{ sha: string }>(`/repos/${input.repository}/commits/${encodeURIComponent(repository.default_branch)}`);
  if (!SHA.test(commit.sha)) throw new Error("GitHub returned an invalid base commit.");
  const tree = await listGitHubWorkspaceFiles({ repository: input.repository, baseCommitSha: commit.sha, providerToken: input.providerToken });
  const candidates = tree
    .sort((left, right) => {
      const rank = (path: string) => /^readme(?:\.[a-z0-9]+)?$/i.test(path) ? 0 : path === "package.json" ? 1 : path.split("/").length;
      return rank(left.path) - rank(right.path) || left.path.localeCompare(right.path);
    });
  for (const candidate of candidates.slice(0, 12)) {
    try {
      return { path: candidate.path, ...(await resolveGitHubFile({ ...input, path: candidate.path })) };
    } catch {
      // Skip binary or otherwise unsupported blobs and try the next safe text file.
    }
  }
  throw new Error("No supported text files were found in this repository.");
}

export async function auditWorkspace(workspaceId: string, actorId: string, action: string, metadata: Record<string, unknown> = {}) {
  const response = await adminSupabaseFetch("workspace_audit_events", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ workspace_id: workspaceId, actor_id: actorId, action, metadata }) });
  if (!response.ok) throw new Error("Workspace audit logging failed.");
}
