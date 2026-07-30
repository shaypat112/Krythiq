import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
const migrationUrl = new URL("../../supabase/migrations/20260730050000_tokens_and_referrals.sql", import.meta.url);
const migration = await readFile(migrationUrl, "utf8");
const purchaseMigration = await readFile(
  new URL("../../supabase/migrations/20260730052000_token_purchases.sql", import.meta.url),
  "utf8",
);
const referralRoute = await readFile(new URL("../api/referrals/route.ts", import.meta.url), "utf8");
const tokenSource = await readFile(new URL("./tokens.ts", import.meta.url), "utf8");

test("all paid actions have positive server-defined integer costs", () => {
  const costs = [...tokenSource.matchAll(/cost:\s*(\d+)/g)].map((match) => Number(match[1]));
  assert.ok(costs.length >= 10);
  assert.equal(costs.every((cost) => Number.isInteger(cost) && cost > 0), true);
});

test("repository scan tiers use the required fixed prices", () => {
  assert.match(tokenSource, /scan_low: .*cost: 30/);
  assert.match(tokenSource, /scan_mid: .*cost: 50/);
  assert.match(tokenSource, /scan_high: .*cost: 70/);
  assert.match(migration, /'scan_low', 30/);
  assert.match(migration, /'scan_mid', 50/);
  assert.match(migration, /'scan_high', 70/);
});

test("token reservations are serialized and idempotent", () => {
  assert.match(migration, /pg_advisory_xact_lock\(hashtextextended\(target_user_id::text, 0\)\)/);
  assert.match(migration, /unique \(user_id, idempotency_key\)/);
  assert.match(migration, /idempotency_key text not null unique/);
  assert.match(migration, /on conflict \(idempotency_key\) do nothing/);
});

test("browser roles cannot mutate token or referral records", () => {
  assert.match(migration, /force row level security/);
  assert.match(migration, /revoke all on public\.token_action_costs, public\.token_transactions/);
  assert.doesNotMatch(migration, /create policy .*insert/i);
  assert.match(migration, /revoke all on function public\.reserve_ai_tokens[\s\S]*from public, anon, authenticated/);
});

test("referral reward requires a completed paid usage and is awarded once", () => {
  assert.match(migration, /where referred_user_id = target_user_id and status = 'claimed'/);
  assert.match(migration, /qualifying_usage_id uuid unique/);
  assert.match(migration, /'referral_reward:' \|\| relationship\.id::text/);
  assert.match(migration, /and created_at <= auth_created_at/);
});

test("failed AI usage has an idempotent compensating refund", () => {
  assert.match(migration, /and status = 'pending'[\s\S]*'Automatic refund for failed AI generation'/);
  assert.match(migration, /'refund:' \|\| target_user_id::text \|\| ':' \|\| request_idempotency_key/);
});

test("referral requests reject self/disposable addresses and apply three rate-limit dimensions", () => {
  assert.match(referralRoute, /email === normalizeReferralEmail\(user\.email\)/);
  assert.match(referralRoute, /isDisposableEmail\(email\)/);
  assert.match(referralRoute, /userCount >= 5 \|\| emailCount >= 3 \|\| ipCount >= 20/);
  assert.match(referralRoute, /If this address is eligible, an invitation will be sent\./);
});

test("database uniqueness blocks duplicate invitations, users, and rewards under races", () => {
  assert.match(migration, /unique \(inviter_id, email_hash\)/);
  assert.match(migration, /referred_user_id uuid not null unique/);
  assert.match(migration, /invitation_id uuid not null unique/);
  assert.match(migration, /qualifying_usage_id uuid unique/);
});

test("Stripe token fulfillment is service-only, serialized, and idempotent", () => {
  assert.match(purchaseMigration, /stripe_checkout_session_id text not null unique/);
  assert.match(purchaseMigration, /pg_advisory_xact_lock\(hashtextextended\(target_user_id::text, 0\)\)/);
  assert.match(purchaseMigration, /on conflict \(stripe_checkout_session_id\) do nothing/);
  assert.match(purchaseMigration, /'stripe_token_purchase:' \|\| checkout_session_id/);
  assert.match(
    purchaseMigration,
    /revoke all on function public\.credit_token_purchase[\s\S]*from public, anon, authenticated/,
  );
  assert.doesNotMatch(purchaseMigration, /create policy .*insert/i);
});
