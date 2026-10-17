import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

// The historical migration also introduced the team membership RPC.
const connectionsMigration = await readFile(new URL("../../supabase/migrations/20260814010000_social_connections_messages.sql", import.meta.url), "utf8");
const addMemberRoute = await readFile(new URL("../api/teams/add-member/route.ts", import.meta.url), "utf8");

test("team member addition uses an atomic manager-authorized function", () => {
  assert.match(connectionsMigration, /not public\.can_manage_team\(target_team_id\)/);
  assert.match(connectionsMigration, /from auth\.users where id = target_user_id/);
  assert.match(addMemberRoute, /rpc\/add_team_member_by_user_id/);
  assert.match(addMemberRoute, /adminSupabaseFetch\(profileLookup\)/);
});
