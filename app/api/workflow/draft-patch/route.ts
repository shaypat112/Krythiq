import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { loadOwnedWorkflowScans, readSuggestion } from "@/app/lib/server/workflow-scans";
import { adminSupabaseFetch } from "@/app/lib/server/admin";
import { auditWorkspace, requireSelectedWorkspaceTeam, resolveGitHubFile } from "@/app/lib/server/repository-workspaces";
import { RequestAuthError } from "@/app/lib/server/supabaseRest";
import { deliverWorkspaceWebhook } from "@/app/lib/server/webhooks";
import { resolveGitHubToken } from "@/app/lib/server/githubConnection";

export const runtime = "nodejs";

const protectedPath = /(^|\/)(\.env|\.github\/workflows|auth|billing|migrations?|package-lock\.json|pnpm-lock\.yaml|yarn\.lock)(\/|$)/i;
const secretLike = /(-----BEGIN [A-Z ]+PRIVATE KEY-----|(?:api[_-]?key|secret|token|password)\s*[:=]\s*["'][^"']{8,})/i;

function cleanRepository(value: unknown) {
  const repository = typeof value === "string" ? value.trim() : "";
  return /^[\w.-]+\/[\w.-]+$/.test(repository) ? repository : null;
}

function line(value: string, prefix: "-" | "+") {
  return value.split("\n").map((part) => `${prefix}${part}`).join("\n");
}

export async function POST(request: Request) {
  const body = await request.clone().json().catch(() => ({}));
  const repository = cleanRepository(body?.repository);
  const suggestionIndex = Number(body?.suggestionIndex);
  const suppliedProviderToken = typeof body?.providerToken === "string" ? body.providerToken : undefined;
  if (!repository || !Number.isSafeInteger(suggestionIndex)) {
    return NextResponse.json({ error: "Choose a valid repository and fix." }, { status: 400 });
  }

  try {
    const { userId, teamId, accessToken } = await requireSelectedWorkspaceTeam(request);
    const providerToken = await resolveGitHubToken(userId, suppliedProviderToken);
    const scans = await loadOwnedWorkflowScans(request, repository);
    const suggestion = readSuggestion(scans, suggestionIndex);
    if (!suggestion?.file || !suggestion.currentCode || !suggestion.replacementCode) {
      throw new Error("This fix does not contain enough exact code to build a safe patch.");
    }
    const file = suggestion.file.replaceAll("\\", "/").replace(/^\.\//, "");
    if (!file || file.startsWith("/") || file.includes("../") || protectedPath.test(file)) {
      throw new Error("This file requires a manual security review and cannot be drafted automatically.");
    }
    if (suggestion.currentCode.length > 20_000 || suggestion.replacementCode.length > 20_000) {
      throw new Error("The proposed change is too large for automatic drafting.");
    }
    if (secretLike.test(suggestion.replacementCode)) {
      throw new Error("The proposed change resembles a credential and was blocked.");
    }
    const githubFile = await resolveGitHubFile({ repository, path: file, providerToken });
    const firstMatch = githubFile.content.indexOf(suggestion.currentCode);
    if (firstMatch < 0) throw new Error("The scanned code no longer matches the current GitHub file. Run a new scan before drafting this fix.");
    if (githubFile.content.indexOf(suggestion.currentCode, firstMatch + suggestion.currentCode.length) >= 0) throw new Error("The proposed snippet appears more than once. A manual file-level review is required.");
    const fullDraftContent = `${githubFile.content.slice(0, firstMatch)}${suggestion.replacementCode}${githubFile.content.slice(firstMatch + suggestion.currentCode.length)}`;
    if (secretLike.test(fullDraftContent)) throw new Error("The proposed file resembles a credential and was blocked.");
    const oldLines = suggestion.currentCode.split("\n").length;
    const newLines = suggestion.replacementCode.split("\n").length;
    const startLine = Math.max(1, Number(suggestion.line) || 1);
    const patch = `--- a/${file}\n+++ b/${file}\n@@ -${startLine},${oldLines} +${startLine},${newLines} @@\n${line(suggestion.currentCode, "-")}\n${line(suggestion.replacementCode, "+")}\n`;
    const workspaceResponse = await adminSupabaseFetch("repository_workspaces", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({ team_id: teamId, repository, base_branch: githubFile.baseBranch, base_commit_sha: githubFile.baseCommitSha, title: suggestion.title.slice(0, 200), created_by: userId }) });
    if (!workspaceResponse.ok) throw new Error("Unable to create the persistent workspace. Apply the latest database migration.");
    const workspace = (await workspaceResponse.json())?.[0];
    const fileResponse = await adminSupabaseFetch("workspace_files", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({ workspace_id: workspace.id, path: file, base_blob_sha: githubFile.blobSha, original_content: githubFile.content, content: fullDraftContent, last_edited_by: userId }) });
    if (!fileResponse.ok) {
      await adminSupabaseFetch(`repository_workspaces?id=eq.${workspace.id}`, { method: "DELETE" }).catch(() => undefined);
      throw new Error("Unable to save the workspace file.");
    }
    const workspaceFile = (await fileResponse.json())?.[0];
    await auditWorkspace(workspace.id, userId, "workspace.created", { repository, base_branch: githubFile.baseBranch, base_commit_sha: githubFile.baseCommitSha, path: file });
    await deliverWorkspaceWebhook(accessToken, { userId, teamId, event: "workspace.created", workspace, details: { source: "guided_fix", initial_path: file } }).catch(() => undefined);
    return NextResponse.json({
      workspaceId: workspace.id,
      repository,
      file,
      title: suggestion.title,
      originalContent: githubFile.content,
      draftContent: fullDraftContent,
      baseBranch: githubFile.baseBranch,
      baseCommitSha: githubFile.baseCommitSha,
      version: workspaceFile.version,
      patch,
      patchSha256: createHash("sha256").update(patch).digest("hex"),
      expiresInSeconds: 900,
      publishSupported: false,
      safetyNotice: "Review every line. This preview is not applied or published automatically.",
    });
  } catch (error) {
    if (error instanceof RequestAuthError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to draft this change." }, { status: 403 });
  }
}
