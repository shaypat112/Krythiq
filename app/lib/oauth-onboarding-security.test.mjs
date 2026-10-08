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
  assert.match(account, /provider: "github" as Provider/);
  assert.doesNotMatch(account, /provider: "linkedin" as Provider/);
});

test("social sign-in does not request administrative provider permissions", () => {
  for (const source of [authClient, account]) {
    assert.doesNotMatch(source, /guilds\.join|guilds\.members\.read|manage_pages|rw_organization_admin|w_member_social/);
  }
  assert.match(authClient, /const nextPath = safeNextPath\(searchParams\.get\("next"\)\)/);
  assert.match(authClient, /callback\?next=\$\{encodeURIComponent\(nextPath\)\}/);
});

test("OAuth callback copies only bounded display metadata into the profile", () => {
  assert.match(callbackRoute, /full_name: String\(fullName\)\.trim\(\)\.slice\(0, 200\)/);
  assert.match(callbackRoute, /value\.startsWith\("https:\/\/"\)/);
  assert.match(callbackRoute, /avatar_url: String\(avatarUrl\)\.slice\(0, 2000\)/);
  // Provider credentials may be stored by the encrypted server integration,
  // but must never be copied into the public profile record.
  const profileWrite = callbackRoute.match(/adminSupabaseFetch\("profiles[\s\S]*?\)\.catch/)?.[0];
  assert.ok(profileWrite);
  assert.doesNotMatch(profileWrite, /provider_token/);
  assert.match(callbackRoute, /saveGitHubConnection\(data\.user\.id, authData\.session\.provider_token\)/);
});

test("organization onboarding is bounded and retry-safe", () => {
  assert.match(onboarding, /workspace_type: workspaceType/);
  assert.match(onboarding, /source: "onboarding"/);
  assert.match(teamRoute, /normalizedName\.length < 2 \|\| normalizedName\.length > 120/);
  assert.match(teamRoute, /source === "onboarding"/);
  assert.match(teamRoute, /existing: true/);
  assert.match(teamRoute, /getUserEntitlements\(userId\)/);
  assert.match(teamRoute, /TEAM_LIMIT_REACHED/);
  assert.match(teamRoute, /owned\.length >= entitlements\.maxOwnedTeams/);
});
