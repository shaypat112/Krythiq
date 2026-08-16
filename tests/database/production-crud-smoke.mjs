import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
assert.ok(baseUrl && serviceKey && anonKey, "Supabase URL, service role key, and anon/publishable key are required");

const email = `db-smoke-${randomUUID()}@example.invalid`;
const password = `Krythiq-${randomUUID()}-Aa1!`;
let userId;

async function request(path, { token = serviceKey, method = "GET", body, prefer } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      apikey: token === serviceKey ? serviceKey : anonKey,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(prefer ? { Prefer: prefer } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;
  assert.ok(response.ok, `${method} ${path} failed (${response.status}): ${text}`);
  return payload;
}

try {
  const created = await request("/auth/v1/admin/users", { method: "POST", body: { email, password, email_confirm: true } });
  userId = created.id;
  const session = await request("/auth/v1/token?grant_type=password", { token: anonKey, method: "POST", body: { email, password } });
  const token = session.access_token;
  const row = { user_id: userId, team_id: null, channel: "in_app", event: "workspace.pull_request_created", enabled: true };

  const inserted = await request("/rest/v1/notification_preferences", { token, method: "POST", body: row, prefer: "return=representation" });
  assert.equal(inserted.length, 1);
  const selected = await request(`/rest/v1/notification_preferences?user_id=eq.${userId}&event=eq.workspace.pull_request_created`, { token });
  assert.equal(selected[0]?.enabled, true);
  const updated = await request(`/rest/v1/notification_preferences?user_id=eq.${userId}&event=eq.workspace.pull_request_created`, { token, method: "PATCH", body: { enabled: false }, prefer: "return=representation" });
  assert.equal(updated[0]?.enabled, false);
  await request(`/rest/v1/notification_preferences?user_id=eq.${userId}`, { token, method: "DELETE" });
  const removed = await request(`/rest/v1/notification_preferences?user_id=eq.${userId}`, { token });
  assert.equal(removed.length, 0);
  console.log("Production notification-preference CRUD smoke test passed.");
} finally {
  if (userId) await request(`/auth/v1/admin/users/${userId}`, { method: "DELETE" });
}
