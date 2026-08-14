import { NextResponse } from "next/server";
import { strToU8, zipSync } from "fflate";
import { adminSupabaseFetch } from "@/app/lib/server/admin";
import { auditWorkspace, requireWorkspaceRequest, type WorkspaceFile } from "@/app/lib/server/repository-workspaces";
import { scannerPolicy } from "@/app/lib/scanner/rules/registry";
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
    const headers: HeadersInit = { Accept: "application/vnd.github+json", "User-Agent": "krythiq-workspaces", "X-GitHub-Api-Version": "2022-11-28", ...(providerToken ? { Authorization: `Bearer ${providerToken}` } : {}) };
    const github = async <T>(path: string) => {
      const response = await fetch(`https://api.github.com${path}`, { headers, cache: "no-store" });
      if (!response.ok) throw new Error([401, 403, 404].includes(response.status) ? "Reconnect GitHub to export this repository." : `GitHub export failed (${response.status}).`);
      return response.json() as Promise<T>;
    };
    const tree = await github<{ truncated: boolean; tree: Array<{ path: string; type: string; sha: string; size?: number }> }>(`/repos/${workspace.repository}/git/trees/${workspace.base_commit_sha}?recursive=1`);
    if (tree.truncated) throw new Error("This repository is too large for a safe complete ZIP export.");
    const ignored = scannerPolicy.defaultIgnoreDirectories;
    const blobs = tree.tree.filter((entry) => entry.type === "blob" && !entry.path.split("/").some((part) => ignored.has(part)));
    const totalBytes = blobs.reduce((total, blob) => total + (blob.size ?? 0), 0);
    if (blobs.length > scannerPolicy.limits.maxFiles || totalBytes > scannerPolicy.limits.maxScanBytes || blobs.some((blob) => (blob.size ?? 0) > scannerPolicy.limits.maxFileBytes)) {
      throw new Error("This repository exceeds the safe ZIP limits. Use GitHub to clone it instead.");
    }
    const files: Record<string, Uint8Array> = {};
    for (let index = 0; index < blobs.length; index += 10) {
      const batch = await Promise.all(blobs.slice(index, index + 10).map(async (blob) => {
        const result = await github<{ encoding: string; content: string }>(`/repos/${workspace.repository}/git/blobs/${blob.sha}`);
        if (result.encoding !== "base64") throw new Error("GitHub returned an unsupported repository blob.");
        return { path: blob.path, bytes: new Uint8Array(Buffer.from(result.content.replace(/\n/g, ""), "base64")) };
      }));
      for (const file of batch) files[file.path] = file.bytes;
    }
    const changedResponse = await adminSupabaseFetch(`workspace_files?workspace_id=eq.${workspace.id}&select=id,workspace_id,path,base_blob_sha,original_content,content,last_edited_by,version,created_at,updated_at`);
    const changed = changedResponse.ok ? await changedResponse.json() as WorkspaceFile[] : [];
    for (const file of changed) {
      if (!(file.path in files)) throw new Error(`The workspace file ${file.path} is not present at the saved base commit.`);
      files[file.path] = strToU8(file.content);
    }
    const archive = zipSync(files, { level: 6 });
    await auditWorkspace(workspace.id, userId, "zip.exported", { base_commit_sha: workspace.base_commit_sha, file_count: Object.keys(files).length, archive_bytes: archive.byteLength });
    await deliverWorkspaceWebhook(accessToken, { userId, teamId: workspace.team_id, event: "workspace.zip_exported", workspace, details: { file_count: Object.keys(files).length, archive_bytes: archive.byteLength } }).catch(() => undefined);
    const filename = `${workspace.repository.replace("/", "-")}-${workspace.base_commit_sha.slice(0, 7)}.zip`;
    return new Response(Buffer.from(archive), { headers: { "Content-Type": "application/zip", "Content-Disposition": `attachment; filename="${filename}"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
  } catch (error) {
    if (error instanceof RequestAuthError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to export workspace." }, { status: 400 });
  }
}
