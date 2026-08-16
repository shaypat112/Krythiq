import { NextResponse } from "next/server";
import { adminSupabaseFetch } from "@/app/lib/server/admin";
import { auditWorkspace, listGitHubWorkspaceFiles, normalizeWorkspacePath, requireWorkspaceRequest, resolveGitHubFileAtCommit, validateWorkspaceContent } from "@/app/lib/server/repository-workspaces";
import { RequestAuthError } from "@/app/lib/server/supabaseRest";
import { resolveGitHubToken } from "@/app/lib/server/githubConnection";

export const runtime = "nodejs";
type Context = { params: Promise<{ workspaceId: string }> };

export async function GET(request: Request, { params }: Context) {
  try {
    const { workspaceId } = await params;
    const { workspace } = await requireWorkspaceRequest(request, workspaceId);
    const [filesResponse, presenceResponse, revisionsResponse, auditResponse] = await Promise.all([
      adminSupabaseFetch(`workspace_files?workspace_id=eq.${workspace.id}&select=id,workspace_id,path,base_blob_sha,original_content,content,last_edited_by,version,created_at,updated_at&order=path.asc`),
      adminSupabaseFetch(`workspace_presence?workspace_id=eq.${workspace.id}&last_seen_at=gte.${encodeURIComponent(new Date(Date.now() - 90_000).toISOString())}&select=user_id,active_file_path,last_seen_at`),
      adminSupabaseFetch(`workspace_file_revisions?workspace_id=eq.${workspace.id}&select=id,workspace_file_id,path,actor_id,from_version,to_version,before_content,after_content,created_at&order=created_at.desc&limit=200`),
      adminSupabaseFetch(`workspace_audit_events?workspace_id=eq.${workspace.id}&select=id,actor_id,action,metadata,created_at&order=created_at.desc&limit=200`),
    ]);
    if (!filesResponse.ok) return NextResponse.json({ error: "Unable to load workspace files." }, { status: 500 });
    const presence = presenceResponse.ok ? await presenceResponse.json() as Array<{ user_id: string; active_file_path: string | null; last_seen_at: string }> : [];
    const revisions = revisionsResponse.ok ? await revisionsResponse.json() as Array<{ actor_id: string }> : [];
    const auditEvents = auditResponse.ok ? await auditResponse.json() as Array<{ actor_id: string }> : [];
    const ids = [...new Set([...presence.map((item) => item.user_id), ...revisions.map((item) => item.actor_id), ...auditEvents.map((item) => item.actor_id)])];
    const profilesResponse = ids.length ? await adminSupabaseFetch(`profiles?id=in.(${ids.join(",")})&select=id,username,full_name,avatar_url`) : null;
    const profiles = profilesResponse?.ok ? await profilesResponse.json() : [];
    return NextResponse.json({ workspace, files: await filesResponse.json(), presence, profiles, revisions, auditEvents });
  } catch (error) {
    if (error instanceof RequestAuthError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load workspace." }, { status: 404 });
  }
}

export async function PATCH(request: Request, { params }: Context) {
  try {
    const { workspaceId } = await params;
    const { workspace, userId } = await requireWorkspaceRequest(request, workspaceId);
    if (workspace.status !== "active") return NextResponse.json({ error: "This workspace is not editable." }, { status: 409 });
    const body = await request.json();
    const path = normalizeWorkspacePath(body?.path);
    const content = validateWorkspaceContent(body?.content);
    const expectedVersion = Number(body?.expectedVersion);
    if (!path || content === null || !Number.isSafeInteger(expectedVersion) || expectedVersion < 1) return NextResponse.json({ error: "Invalid workspace file update." }, { status: 400 });
    const previousResponse = await adminSupabaseFetch(`workspace_files?workspace_id=eq.${workspace.id}&path=eq.${encodeURIComponent(path)}&version=eq.${expectedVersion}&select=id,content&limit=1`);
    const previous = previousResponse.ok ? (await previousResponse.json() as Array<{ id: string; content: string }>)[0] : null;
    const response = await adminSupabaseFetch(`workspace_files?workspace_id=eq.${workspace.id}&path=eq.${encodeURIComponent(path)}&version=eq.${expectedVersion}`, { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify({ content, last_edited_by: userId, version: expectedVersion + 1, updated_at: new Date().toISOString() }) });
    const rows = response.ok ? await response.json() : [];
    if (!rows[0]) {
      const latest = await adminSupabaseFetch(`workspace_files?workspace_id=eq.${workspace.id}&path=eq.${encodeURIComponent(path)}&select=id,workspace_id,path,base_blob_sha,original_content,content,last_edited_by,version,created_at,updated_at&limit=1`);
      return NextResponse.json({ error: "This file changed in another session. Review the latest version before saving again.", file: latest.ok ? (await latest.json())?.[0] ?? null : null }, { status: 409 });
    }
    if (previous && previous.content !== content) {
      await adminSupabaseFetch("workspace_file_revisions?on_conflict=workspace_file_id,to_version", {
        method: "POST",
        headers: { Prefer: "resolution=ignore-duplicates,return=minimal" },
        body: JSON.stringify({ workspace_id: workspace.id, workspace_file_id: previous.id, path, actor_id: userId, from_version: expectedVersion, to_version: expectedVersion + 1, before_content: previous.content, after_content: content }),
      }).catch(() => undefined);
    }
    await adminSupabaseFetch(`repository_workspaces?id=eq.${workspace.id}`, { method: "PATCH", body: JSON.stringify({ updated_at: new Date().toISOString() }) });
    await auditWorkspace(workspace.id, userId, "file.modified", { path, version: expectedVersion + 1 });
    return NextResponse.json({ file: rows[0] });
  } catch (error) {
    if (error instanceof RequestAuthError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to save workspace file." }, { status: 403 });
  }
}

export async function POST(request: Request, { params }: Context) {
  try {
    const { workspaceId } = await params;
    const { workspace, userId } = await requireWorkspaceRequest(request, workspaceId);
    const body = await request.json();
    const suppliedProviderToken = typeof body?.providerToken === "string" ? body.providerToken : undefined;
    if (body?.action === "repository.tree") {
      const providerToken = await resolveGitHubToken(userId, suppliedProviderToken);
      const files = await listGitHubWorkspaceFiles({ repository: workspace.repository, baseCommitSha: workspace.base_commit_sha, providerToken });
      return NextResponse.json({ files });
    }
    if (body?.action === "file.open") {
      const path = normalizeWorkspacePath(body?.path);
      if (!path) return NextResponse.json({ error: "Invalid workspace file." }, { status: 400 });
      const existingResponse = await adminSupabaseFetch(`workspace_files?workspace_id=eq.${workspace.id}&path=eq.${encodeURIComponent(path)}&select=id,workspace_id,path,base_blob_sha,original_content,content,last_edited_by,version,created_at,updated_at&limit=1`);
      const existing = existingResponse.ok ? (await existingResponse.json())?.[0] : null;
      if (existing) return NextResponse.json({ file: existing });
      const providerToken = await resolveGitHubToken(userId, suppliedProviderToken);
      const githubFile = await resolveGitHubFileAtCommit({ repository: workspace.repository, path, baseCommitSha: workspace.base_commit_sha, providerToken });
      const insertResponse = await adminSupabaseFetch("workspace_files?on_conflict=workspace_id,path", {
        method: "POST",
        headers: { Prefer: "resolution=ignore-duplicates,return=representation" },
        body: JSON.stringify({ workspace_id: workspace.id, path, base_blob_sha: githubFile.blobSha, original_content: githubFile.content, content: githubFile.content, last_edited_by: userId }),
      });
      const inserted = insertResponse.ok ? (await insertResponse.json())?.[0] : null;
      if (inserted) {
        return NextResponse.json({ file: inserted }, { status: 201 });
      }
      const racedResponse = await adminSupabaseFetch(`workspace_files?workspace_id=eq.${workspace.id}&path=eq.${encodeURIComponent(path)}&select=id,workspace_id,path,base_blob_sha,original_content,content,last_edited_by,version,created_at,updated_at&limit=1`);
      const raced = racedResponse.ok ? (await racedResponse.json())?.[0] : null;
      if (!raced) return NextResponse.json({ error: "Unable to open this workspace file." }, { status: 500 });
      return NextResponse.json({ file: raced });
    }
    const action = body?.action === "file.downloaded" || body?.action === "patch.exported" ? body.action : null;
    if (!action) return NextResponse.json({ error: "Invalid workspace audit action." }, { status: 400 });
    const path = body?.path ? normalizeWorkspacePath(body.path) : null;
    await auditWorkspace(workspace.id, userId, action, path ? { path } : {});
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof RequestAuthError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to record workspace activity." }, { status: 403 });
  }
}
