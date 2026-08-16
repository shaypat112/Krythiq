import assert from "node:assert/strict";

const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
assert.ok(baseUrl && serviceKey, "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");

const apiTables = [
  "activity_log", "ai_token_usages", "billing_customers", "cli_access_tokens",
  "cli_device_codes", "cli_scan_events", "connected_repos", "finding_reviews",
  "integration_connections", "notification_preferences", "notifications", "profiles",
  "referral_codes", "referral_invitations", "referral_opt_outs",
  "referral_relationships", "referral_request_attempts", "repository_workspaces",
  "scan_history", "social_comments",
  "social_connections", "social_messages", "social_posts", "social_projects",
  "social_reactions", "team_environments", "team_invitations", "team_members", "teams",
  "token_action_costs", "token_purchases", "token_requests", "token_transactions",
  "user_settings", "webhook_deliveries", "webhook_endpoints", "workspace_audit_events",
  "workspace_file_revisions", "workspace_files", "workspace_presence",
];

const failures = [];
for (const table of apiTables) {
  const response = await fetch(`${baseUrl}/rest/v1/${table}?select=*&limit=0`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
  });
  if (!response.ok) failures.push(`${table}: ${response.status} ${await response.text()}`);
}

assert.deepEqual(failures, [], `Production schema is missing or cannot access required tables:\n${failures.join("\n")}`);
console.log(`Production schema smoke test passed for ${apiTables.length} API tables.`);
