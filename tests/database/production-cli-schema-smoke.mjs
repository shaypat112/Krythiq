import assert from "node:assert/strict";

const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const publicKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
assert.ok(baseUrl && serviceKey && publicKey, "Supabase URL, service key and public API key are required");
const headers = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" };
const rest = (route, init = {}) => fetch(`${baseUrl}/rest/v1/${route}`, { ...init, headers: { ...headers, ...init.headers }, cache: "no-store" });

for (const route of [
  "cli_access_tokens?select=id,refresh_token_hash,refresh_expires_at&limit=0",
  "cli_device_codes?select=terminal_name,session_version&limit=0",
  "cli_access_credentials?select=token_hash,cli_token_id,expires_at&limit=0",
]) assert.equal((await rest(route)).status, 200, `Missing lifecycle schema: ${route}`);

// Invalid synthetic hashes prove RPC visibility without issuing, renewing or revoking any real credential.
for (const [name, body] of [
  ["authenticate_cli_session", { p_access_hash: "0".repeat(64) }],
  ["refresh_cli_session", { p_refresh_hash: "0".repeat(64), p_access_hash: "0".repeat(64) }],
  ["revoke_cli_session", { p_refresh_hash: "0".repeat(64), p_access_hash: "0".repeat(64) }],
  ["cli_usage_summary", { p_user_id: "00000000-0000-0000-0000-000000000000" }],
]) {
  const response = await rest(`rpc/${name}`, { method: "POST", body: JSON.stringify(body) });
  assert.equal(response.status, 200, `Service RPC unavailable: ${name}`);
  const rows = await response.json();
  if (name === "cli_usage_summary") assert.deepEqual(rows, [{ scan_count: 0, tokens_used: 0 }]);
  else assert.deepEqual(rows, [], `Synthetic credentials must not match: ${name}`);
  const denied = await fetch(`${baseUrl}/rest/v1/rpc/${name}`, { method: "POST", headers: { apikey: publicKey, "Content-Type": "application/json" }, body: JSON.stringify(body) });
  assert.ok([401, 403, 404].includes(denied.status), `Anonymous RPC access must be denied: ${name}`);
}
const retired = await rest("token_action_costs?action=in.(agent_prompt,draft_patch,verification_run)&select=action,enabled");
assert.equal(retired.status, 200);
assert.ok((await retired.json()).every(row => row.enabled === false), "Retired action prices must be disabled");
for (const table of ["social_projects", "social_posts", "social_reactions", "social_comments", "social_connections", "social_messages"]) {
  const response = await fetch(`${baseUrl}/rest/v1/${table}?select=*&limit=0`, { headers: { apikey: publicKey } });
  assert.ok([401, 403, 404].includes(response.status), `Anonymous social access must be denied: ${table}`);
}
console.log("Production CLI lifecycle schema, service-only RPCs, retired pricing and anonymous social restrictions verified. No live sessions or Token balances were changed.");
