import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

const appUrl = process.env.NEXT_PUBLIC_SITE_URL;
const dbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
assert.equal(new URL(dbUrl).hostname, "localhost", "This test runs only against local Docker services.");
const email = `local-stack-${randomUUID()}@krythiq.local`;
const password = `Krythiq-${randomUUID()}-Aa1!`;
let userId;

async function jsonRequest(url, { token, key = anonKey, body, method = "GET" } = {}) {
  const response = await fetch(url, {
    method,
    headers: { apikey: key, ...(token ? { Authorization: `Bearer ${token}` } : {}), "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(60_000),
  });
  const text = await response.text();
  assert.ok(response.ok, `${method} ${new URL(url).pathname}: ${response.status} ${text}`);
  return text ? JSON.parse(text) : null;
}

try {
  const home = await fetch(appUrl);
  assert.equal(home.status, 200);
  assert.match(home.headers.get("content-security-policy"), /http:\/\/localhost:\*/);
  const protectedPage = await fetch(`${appUrl}/dashboard`, { redirect: "manual" });
  assert.equal(protectedPage.status, 307);
  assert.equal(new URL(protectedPage.headers.get("location"), appUrl).pathname, "/auth");

  await jsonRequest(`${appUrl}/api/auth/email-link`, { method: "POST", body: { kind: "signup", email, password } });
  const users = await jsonRequest(`${dbUrl}/auth/v1/admin/users?per_page=1000`, { key: serviceKey, token: serviceKey });
  userId = users.users.find((user) => user.email === email)?.id;
  assert.ok(userId, "Signup creates the local Auth user.");
  const messages = await jsonRequest("http://localhost:54324/api/v1/messages");
  const message = messages.messages.find((item) => item.To.some((recipient) => recipient.Address === email));
  assert.ok(message, "Signup email arrives in Mailpit.");
  const detail = await jsonRequest(`http://localhost:54324/api/v1/message/${message.ID}`);
  const link = detail.Text.match(/http:\/\/localhost:3000\/auth\/callback\?[^\s]+/)?.[0];
  assert.ok(link, "Confirmation URL points to the local app.");
  const callback = await fetch(link, { redirect: "manual" });
  assert.equal(callback.status, 307);
  assert.equal(new URL(callback.headers.get("location"), appUrl).pathname, "/dashboard");
  const cookies = callback.headers.getSetCookie().map((cookie) => cookie.split(";")[0]).join("; ");
  assert.match(cookies, /sb-localhost-auth-token/);
  const signedIn = await fetch(`${appUrl}/dashboard`, { headers: { Cookie: cookies }, redirect: "manual" });
  assert.equal(signedIn.status, 307);
  assert.equal(new URL(signedIn.headers.get("location"), appUrl).pathname, "/onboarding", "Proxy recognizes the callback session.");

  const session = await jsonRequest(`${dbUrl}/auth/v1/token?grant_type=password`, { method: "POST", body: { email, password } });
  const token = session.access_token;
  const team = await jsonRequest(`${appUrl}/api/teams/create`, { token, method: "POST", body: { name: "Docker smoke team", source: "onboarding" } });
  assert.ok(team.team.id);
  const members = await jsonRequest(`${appUrl}/api/teams/members?teamId=${team.team.id}`, { token });
  assert.equal(members.members[0].user_id, userId);
  assert.ok(members.members[0].profiles, "PostgREST resolves the membership profile relationship.");
  for (const path of ["/api/settings/load", "/api/notifications", "/api/scans/recent", "/api/teams/list", "/api/billing/summary"]) {
    await jsonRequest(`${appUrl}${path}`, { token });
  }
  const device = await jsonRequest(`${appUrl}/api/cli/device`, { method: "POST" });
  assert.ok(device.userCode);
  assert.equal(new URL(device.verificationUrl).origin, appUrl);
  console.log("Local signup, email confirmation, session cookies, protected pages, teams, settings, notifications, scan history, billing summary, and CLI authorization passed.");
} finally {
  if (userId) await jsonRequest(`${dbUrl}/auth/v1/admin/users/${userId}`, { key: serviceKey, token: serviceKey, method: "DELETE" });
}
