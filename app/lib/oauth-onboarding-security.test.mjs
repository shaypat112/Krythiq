import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const authClient = await readFile(new URL("../auth/AuthClient.tsx", import.meta.url), "utf8");
const callbackRoute = await readFile(new URL("../auth/callback/route.ts", import.meta.url), "utf8");
const onboarding = await readFile(new URL("../onboarding/page.tsx", import.meta.url), "utf8");
const account = await readFile(new URL("../settings/profile/account.tsx", import.meta.url), "utf8");
const teamRoute = await readFile(new URL("../api/teams/create/route.ts", import.meta.url), "utf8");

test("uses current Supabase Discord and LinkedIn OIDC provider identifiers", () => {
  assert.match(authClient, /loginWithSocial\("discord", "discord", "identify email"\)/);
  assert.match(authClient, /loginWithSocial\("linkedin_oidc", "linkedin", "openid profile email"\)/);
  assert.match(account, /provider: "discord" as Provider/);
  assert.match(account, /provider: "linkedin_oidc" as Provider/);
});

test("social sign-in does not request administrative provider permissions", () => {
  for (const source of [authClient, account]) {
    assert.doesNotMatch(source, /guilds\.join|guilds\.members\.read|manage_pages|rw_organization_admin|w_member_social/);
  }
  assert.match(authClient, /next=.*onboarding/);
});

test("OAuth callback copies only bounded display metadata into the profile", () => {
  assert.match(callbackRoute, /full_name: String\(fullName\)\.trim\(\)\.slice\(0, 200\)/);
  assert.match(callbackRoute, /value\.startsWith\("https:\/\/"\)/);
  assert.match(callbackRoute, /avatar_url: String\(avatarUrl\)\.slice\(0, 2000\)/);
  assert.doesNotMatch(callbackRoute, /provider_token/);
});

test("organization onboarding is bounded and retry-safe", () => {
  assert.match(onboarding, /workspace_type: workspaceType/);
  assert.match(onboarding, /source: "onboarding"/);
  assert.match(teamRoute, /normalizedName\.length < 2 \|\| normalizedName\.length > 120/);
  assert.match(teamRoute, /source === "onboarding"/);
  assert.match(teamRoute, /existing: true/);
});
