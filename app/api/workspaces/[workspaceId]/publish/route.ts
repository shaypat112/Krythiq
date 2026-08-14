import { NextResponse } from "next/server";
import { adminSupabaseFetch } from "@/app/lib/server/admin";
import { auditWorkspace, requireWorkspaceRequest, type WorkspaceFile } from "@/app/lib/server/repository-workspaces";
import { isTeamOwner } from "@/app/lib/server/teams";
import { RequestAuthError } from "@/app/lib/server/supabaseRest";
import { deliverWorkspaceWebhook } from "@/app/lib/server/webhooks";

export const runtime = "nodejs";
type Context = { params: Promise<{ workspaceId: string }> };

export async function POST(request: Request, { params }: Context) {
  try {
    const { workspaceId } = await params;
    const { workspace, userId, accessToken } = await requireWorkspaceRequest(request, workspaceId);
    const body = await request.json();
    const providerToken = typeof body?.providerToken === "string" ? body.providerToken : "";
    const mode = body?.mode === "branch" || body?.mode === "pull_request" || body?.mode === "main" ? body.mode : null;
    const commitMessage = typeof body?.commitMessage === "string" ? body.commitMessage.trim().slice(0, 200) : "";
    if (!providerToken || !mode || commitMessage.length < 3) return NextResponse.json({ error: "Reconnect GitHub and enter a commit message." }, { status: 400 });
    if (workspace.status !== "active") return NextResponse.json({ error: "Resolve this workspace’s upstream conflict before publishing." }, { status: 409 });
    if (mode === "main") {
      if (!workspace.team_id || !await isTeamOwner(accessToken, userId, workspace.team_id)) return NextResponse.json({ error: "Only the Krythiq team owner can publish directly to the default branch." }, { status: 403 });
    }

    const headers = { Authorization: `Bearer ${providerToken}`, Accept: "application/vnd.github+json", "Content-Type": "application/json", "User-Agent": "krythiq-workspaces", "X-GitHub-Api-Version": "2022-11-28" };
    const github = async <T>(path: string, init: RequestInit = {}) => {
      const response = await fetch(`https://api.github.com${path}`, { ...init, headers: { ...headers, ...(init.headers ?? {}) }, cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(response.status === 403 ? "GitHub did not grant write permission for this repository." : typeof payload?.message === "string" ? payload.message : `GitHub publishing failed (${response.status}).`);
      return payload as T;
    };
    const repository = await github<{ default_branch: string; permissions?: { push?: boolean } }>(`/repos/${workspace.repository}`);
    if (!repository.permissions?.push) return NextResponse.json({ error: "Your GitHub account does not have write permission for this repository." }, { status: 403 });
    if (repository.default_branch !== workspace.base_branch) return NextResponse.json({ error: "The repository default branch changed. Create a new workspace from a fresh scan." }, { status: 409 });
    const currentRef = await github<{ object: { sha: string } }>(`/repos/${workspace.repository}/git/ref/heads/${encodeURIComponent(workspace.base_branch)}`);
    if (currentRef.object.sha !== workspace.base_commit_sha) {
      await adminSupabaseFetch(`repository_workspaces?id=eq.${workspace.id}`, { method: "PATCH", body: JSON.stringify({ status: "conflicted", updated_at: new Date().toISOString() }) });
      await deliverWorkspaceWebhook(accessToken, { userId, teamId: workspace.team_id, event: "workspace.conflict", workspace, details: { upstream_commit_sha: currentRef.object.sha } }).catch(() => undefined);
      return NextResponse.json({ error: "GitHub changed after this workspace was created. Publishing is blocked until the changes are reconciled.", upstreamCommitSha: currentRef.object.sha }, { status: 409 });
    }
    const filesResponse = await adminSupabaseFetch(`workspace_files?workspace_id=eq.${workspace.id}&select=id,workspace_id,path,base_blob_sha,original_content,content,last_edited_by,version,created_at,updated_at&order=path.asc`);
    const files = filesResponse.ok ? await filesResponse.json() as WorkspaceFile[] : [];
    if (!files.length || !files.some((file) => file.content !== file.original_content)) return NextResponse.json({ error: "There are no workspace changes to publish." }, { status: 409 });
    const baseCommit = await github<{ tree: { sha: string } }>(`/repos/${workspace.repository}/git/commits/${workspace.base_commit_sha}`);
    const treeEntries = await Promise.all(files.filter((file) => file.content !== file.original_content).map(async (file) => {
      const blob = await github<{ sha: string }>(`/repos/${workspace.repository}/git/blobs`, { method: "POST", body: JSON.stringify({ content: file.content, encoding: "utf-8" }) });
      return { path: file.path, mode: "100644", type: "blob", sha: blob.sha };
    }));
    const tree = await github<{ sha: string }>(`/repos/${workspace.repository}/git/trees`, { method: "POST", body: JSON.stringify({ base_tree: baseCommit.tree.sha, tree: treeEntries }) });
    const commit = await github<{ sha: string; html_url?: string }>(`/repos/${workspace.repository}/git/commits`, { method: "POST", body: JSON.stringify({ message: commitMessage, tree: tree.sha, parents: [workspace.base_commit_sha] }) });

    if (mode === "main") {
      await github(`/repos/${workspace.repository}/git/refs/heads/${encodeURIComponent(workspace.base_branch)}`, { method: "PATCH", body: JSON.stringify({ sha: commit.sha, force: false }) });
      await auditWorkspace(workspace.id, userId, "main.pushed", { branch: workspace.base_branch, commit_sha: commit.sha });
      await deliverWorkspaceWebhook(accessToken, { userId, teamId: workspace.team_id, event: "workspace.main_pushed", workspace, details: { branch: workspace.base_branch, commit_sha: commit.sha } }).catch(() => undefined);
      return NextResponse.json({ mode, branch: workspace.base_branch, commitSha: commit.sha, url: `https://github.com/${workspace.repository}/commit/${commit.sha}` });
    }

    const branch = `krythiq/${workspace.id.slice(0, 8)}-${Date.now().toString(36)}`;
    await github(`/repos/${workspace.repository}/git/refs`, { method: "POST", body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: commit.sha }) });
    await auditWorkspace(workspace.id, userId, "branch.published", { branch, commit_sha: commit.sha });
    if (mode === "pull_request") {
      const pull = await github<{ number: number; html_url: string }>(`/repos/${workspace.repository}/pulls`, { method: "POST", body: JSON.stringify({ title: commitMessage, head: branch, base: workspace.base_branch, body: `Created from Krythiq workspace ${workspace.id}.\n\nBase commit: ${workspace.base_commit_sha}` }) });
      await auditWorkspace(workspace.id, userId, "pull_request.created", { branch, commit_sha: commit.sha, pull_request_number: pull.number });
      await deliverWorkspaceWebhook(accessToken, { userId, teamId: workspace.team_id, event: "workspace.pull_request_created", workspace, details: { branch, commit_sha: commit.sha, pull_request_number: pull.number } }).catch(() => undefined);
      return NextResponse.json({ mode, branch, commitSha: commit.sha, pullRequestNumber: pull.number, url: pull.html_url });
    }
    await deliverWorkspaceWebhook(accessToken, { userId, teamId: workspace.team_id, event: "workspace.branch_published", workspace, details: { branch, commit_sha: commit.sha } }).catch(() => undefined);
    return NextResponse.json({ mode, branch, commitSha: commit.sha, url: `https://github.com/${workspace.repository}/tree/${encodeURIComponent(branch)}` });
  } catch (error) {
    if (error instanceof RequestAuthError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to publish workspace." }, { status: 502 });
  }
}
