import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migration = await readFile(new URL("../../supabase/migrations/20260814030000_repository_workspaces.sql", import.meta.url), "utf8");
const workspaceService = await readFile(new URL("./server/repository-workspaces.ts", import.meta.url), "utf8");
const workspaceRoute = await readFile(new URL("../api/workspaces/[workspaceId]/route.ts", import.meta.url), "utf8");
const workspaceListRoute = await readFile(new URL("../api/workspaces/route.ts", import.meta.url), "utf8");
const draftRoute = await readFile(new URL("../api/workflow/draft-patch/route.ts", import.meta.url), "utf8");
const publishRoute = await readFile(new URL("../api/workspaces/[workspaceId]/publish/route.ts", import.meta.url), "utf8");
const exportRoute = await readFile(new URL("../api/workspaces/[workspaceId]/export/route.ts", import.meta.url), "utf8");
const sandbox = await readFile(new URL("./server/workspace-sandbox.ts", import.meta.url), "utf8");

test("repository workspaces are team scoped and protected by forced RLS", () => {
  for (const table of ["repository_workspaces", "workspace_files", "workspace_presence", "workspace_audit_events"]) {
    assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security`));
    assert.match(migration, new RegExp(`alter table public\\.${table} force row level security`));
  }
  assert.match(migration, /workspace\.created_by = auth\.uid\(\)/);
  assert.match(migration, /member\.user_id = auth\.uid\(\)/);
  assert.match(migration, /user_id = auth\.uid\(\)/);
});

test("workspace writes use verified auth and optimistic versions", () => {
  assert.match(workspaceService, /requireVerifiedRequestAuth\(request\)/);
  assert.match(workspaceRoute, /version=eq\.\$\{expectedVersion\}/);
  assert.match(workspaceRoute, /version: expectedVersion \+ 1/);
  assert.match(workspaceRoute, /status: 409/);
  assert.match(workspaceRoute, /auditWorkspace\(workspace\.id, userId, "file\.modified"/);
});

test("draft creation resolves a full GitHub file at an exact commit", () => {
  assert.match(workspaceService, /commits\/\$\{encodeURIComponent\(repository\.default_branch\)\}/);
  assert.match(workspaceService, /\?ref=\$\{commit\.sha\}/);
  assert.match(draftRoute, /githubFile\.content\.indexOf\(suggestion\.currentCode\)/);
  assert.match(draftRoute, /base_commit_sha: githubFile\.baseCommitSha/);
  assert.match(draftRoute, /workspace_audit_events|auditWorkspace/);
});

test("repositories can create a bounded starter workspace without a scan suggestion", () => {
  assert.match(workspaceService, /resolveGitHubStarterFile/);
  assert.match(workspaceService, /git\/trees\/\$\{input\.baseCommitSha\}\?recursive=1/);
  assert.match(workspaceService, /file\.size <= 1_048_576/);
  assert.match(workspaceService, /if \(recursive\.truncated\)/);
  assert.match(workspaceService, /MAX_REPOSITORY_FILES = 20_000/);
  assert.match(workspaceListRoute, /requireSelectedWorkspaceTeam\(request\)/);
  assert.match(workspaceListRoute, /resolveGitHubStarterFile/);
  assert.match(workspaceListRoute, /"workspace\.created"/);
});

test("workspace file browsing is lazy, commit-pinned, and server-authorized", () => {
  assert.match(workspaceRoute, /body\?\.action === "repository\.tree"/);
  assert.match(workspaceRoute, /body\?\.action === "file\.open"/);
  assert.match(workspaceRoute, /requireWorkspaceRequest\(request, workspaceId\)/);
  assert.match(workspaceRoute, /resolveGitHubFileAtCommit/);
  assert.match(workspaceRoute, /baseCommitSha: workspace\.base_commit_sha/);
  assert.match(workspaceRoute, /on_conflict=workspace_id,path/);
});

test("publishing blocks drift and enforces owner-only direct main pushes", () => {
  assert.match(publishRoute, /isTeamOwner\(accessToken, userId, workspace\.team_id\)/);
  assert.match(publishRoute, /permissions\?\.push/);
  assert.match(publishRoute, /currentRef\.object\.sha !== workspace\.base_commit_sha/);
  assert.match(publishRoute, /force: false/);
  assert.match(publishRoute, /"main\.pushed"/);
  assert.match(publishRoute, /"pull_request\.created"/);
});

test("ZIP export is bounded and sandbox execution is unavailable by default", () => {
  assert.match(exportRoute, /scannerPolicy\.limits\.maxFiles/);
  assert.match(exportRoute, /scannerPolicy\.limits\.maxScanBytes/);
  assert.match(exportRoute, /"zip\.exported"/);
  assert.match(sandbox, /readonly available = false/);
  assert.doesNotMatch(sandbox, /child_process|exec\(|spawn\(/);
});
