import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migration = await readFile(new URL("../../supabase/migrations/20260810190000_repair_social_discovery.sql", import.meta.url), "utf8");
const feedRoute = await readFile(new URL("../api/social/feed/route.ts", import.meta.url), "utf8");
const projectRoute = await readFile(new URL("../api/social/projects/route.ts", import.meta.url), "utf8");
const engageRoute = await readFile(new URL("../api/social/engage/route.ts", import.meta.url), "utf8");

test("social tables use RLS and scope non-public posts to team members", () => {
  for (const table of ["social_projects", "social_posts", "social_reactions", "social_comments"]) {
    assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security`));
  }
  assert.match(migration, /visibility = 'public' or \(team_id is not null and public\.is_team_member\(team_id\)\)/);
  assert.match(migration, /public\.can_manage_team\(team_id\)/);
});

test("social repair is repeatable and private uploads are user-scoped", () => {
  assert.match(migration, /drop policy if exists social_media_insert_own/);
  assert.match(migration, /on conflict \(id\) do update/);
  assert.match(migration, /bucket_id = 'social-media'/);
  assert.match(migration, /storage\.foldername\(name\)\)\[1\] = auth\.uid\(\)::text/);
  assert.match(feedRoute, /team_id: visibility === "team" \? selectedTeamId : null/);
  assert.match(feedRoute, /validMediaPath\(body\?\.mediaPath, userId\)/);
});

test("only safe scan snapshots can enter the public feed", () => {
  assert.match(feedRoute, /visibility === "public" && scan\.findings\?\.profile\?\.metadata\?\.visibility !== "public"/);
  assert.doesNotMatch(feedRoute, /scanSnapshot\s*=\s*\{[^}]*findings/s);
  assert.match(feedRoute, /Posting limit reached/);
  assert.match(feedRoute, /body\.trim\(\)/);
});

test("verified projects require management access and fresh public low-risk evidence", () => {
  assert.match(projectRoute, /canManageTeam\(accessToken, userId, teamId\)/);
  assert.match(projectRoute, /visibility !== "public"/);
  assert.match(projectRoute, /\["critical", "high"\]\.includes\(scan\.severity\)/);
  assert.match(projectRoute, /repositoryFiles \?\? 0\) < 25/);
  assert.match(projectRoute, /30 \* 24 \* 60 \* 60 \* 1000/);
});

test("engagement is authenticated, bounded, and rate limited", () => {
  assert.match(engageRoute, /requireRequestAuth\(request\)/);
  assert.match(engageRoute, /text\.length > 1000/);
  assert.match(engageRoute, /Comment limit reached/);
  assert.match(migration, /social_reactions_own[\s\S]*user_id = auth\.uid\(\)/);
});
