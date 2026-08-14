import { NextResponse } from "next/server";
import { adminSupabaseFetch } from "@/app/lib/server/admin";
import { auditWorkspace, requireSelectedWorkspaceTeam, resolveGitHubStarterFile } from "@/app/lib/server/repository-workspaces";
import { RequestAuthError } from "@/app/lib/server/supabaseRest";
import { deliverWorkspaceWebhook } from "@/app/lib/server/webhooks";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { userId, teamId } = await requireSelectedWorkspaceTeam(request);
    const scope = teamId ? `team_id=eq.${teamId}` : `team_id=is.null&created_by=eq.${userId}`;
    const response = await adminSupabaseFetch(`repository_workspaces?${scope}&status=neq.archived&select=id,team_id,repository,base_branch,base_commit_sha,title,status,created_by,created_at,updated_at,workspace_files(id,path,updated_at,last_edited_by,version)&order=updated_at.desc&limit=50`);
    if (!response.ok) return NextResponse.json({ error: "Workspace storage is unavailable. Apply the latest database migration." }, { status: 503 });
    return NextResponse.json({ workspaces: await response.json() });
  } catch (error) {
    if (error instanceof RequestAuthError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load workspaces." }, { status: 403 });
  }
}

export async function POST(request: Request) {
  try {
    const { userId, teamId, accessToken } = await requireSelectedWorkspaceTeam(request);
    const body = await request.json();
    const repository = typeof body?.repository === "string" ? body.repository.trim() : "";
    const providerToken = typeof body?.providerToken === "string" ? body.providerToken : undefined;
    if (!/^[\w.-]+\/[\w.-]+$/.test(repository)) return NextResponse.json({ error: "Choose a valid repository." }, { status: 400 });
    const starter = await resolveGitHubStarterFile({ repository, providerToken });
    const workspaceResponse = await adminSupabaseFetch("repository_workspaces", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({ team_id: teamId, repository, base_branch: starter.baseBranch, base_commit_sha: starter.baseCommitSha, title: `${repository.split("/").at(-1)} workspace`, created_by: userId }) });
    if (!workspaceResponse.ok) return NextResponse.json({ error: "Unable to create the workspace. Apply the latest database migration." }, { status: 503 });
    const workspace = (await workspaceResponse.json())?.[0];
    const fileResponse = await adminSupabaseFetch("workspace_files", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({ workspace_id: workspace.id, path: starter.path, base_blob_sha: starter.blobSha, original_content: starter.content, content: starter.content, last_edited_by: userId }) });
    if (!fileResponse.ok) {
      await adminSupabaseFetch(`repository_workspaces?id=eq.${workspace.id}`, { method: "DELETE" }).catch(() => undefined);
      return NextResponse.json({ error: "Unable to initialize the workspace file." }, { status: 500 });
    }
    const file = (await fileResponse.json())?.[0];
    await auditWorkspace(workspace.id, userId, "workspace.created", { repository, base_branch: starter.baseBranch, base_commit_sha: starter.baseCommitSha, path: starter.path, source: "repository" });
    await deliverWorkspaceWebhook(accessToken, { userId, teamId, event: "workspace.created", workspace, details: { source: "repository", initial_path: starter.path } }).catch(() => undefined);
    return NextResponse.json({ workspaceId: workspace.id, repository, file: starter.path, title: workspace.title, originalContent: starter.content, draftContent: starter.content, patch: "", patchSha256: "", baseBranch: starter.baseBranch, baseCommitSha: starter.baseCommitSha, version: file.version }, { status: 201 });
  } catch (error) {
    if (error instanceof RequestAuthError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to create workspace." }, { status: 403 });
  }
}
