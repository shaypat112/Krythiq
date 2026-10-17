import assert from "node:assert/strict";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { mkdtemp, writeFile, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

const cli = path.resolve("dist/index.js");
const oldToken = "kry_cli_" + "a".repeat(43);
const newToken = "kry_cli_" + "b".repeat(43);
const refreshToken = "kry_refresh_" + "r".repeat(43);
const account = { connected: true, balance: 42, profile: { fullName: "Fixture account" }, cli: { scanCount: 7, tokensUsed: 0 } };

async function fixture(handler) {
  const directory = await mkdtemp(path.join(tmpdir(), "krythiq-session-"));
  const requests = [];
  const server = createServer(async (req, res) => {
    let body = "";
    for await (const chunk of req) body += chunk;
    const request = { path: req.url, method: req.method, headers: req.headers, body: body ? JSON.parse(body) : null };
    requests.push(request);
    const response = handler(request, requests);
    res.writeHead(response.status ?? 200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(response.body));
  });
  await new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
  const url = `http://127.0.0.1:${server.address().port}`;
  const session = { accessToken: oldToken, refreshToken, url, expiresAt: new Date(Date.now() - 1000).toISOString(), refreshExpiresAt: new Date(Date.now() + 90 * 86400_000).toISOString() };
  const save = async (value = session) => writeFile(path.join(directory, "config.json"), JSON.stringify({ apiKey: "other-credential-must-stay", dashboardSession: value }));
  const read = async () => JSON.parse(await readFile(path.join(directory, "config.json"), "utf8"));
  const run = (args, extraEnv = {}) => new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [cli, ...args], { env: { ...process.env, KRYTHIQ_CONFIG_DIR: directory, KRYTHIQ_DASHBOARD_URL: url, KRYTHIQ_CLI_TOKEN: "", NO_COLOR: "1", NO_UPDATE_NOTIFIER: "1", ...extraEnv } });
    let stdout = "", stderr = "";
    child.stdout.on("data", data => { stdout += data; });
    child.stderr.on("data", data => { stderr += data; });
    child.on("error", reject);
    child.on("close", status => resolve({ status, stdout, stderr }));
  });
  return { directory, requests, url, session, save, read, run, close: () => new Promise(resolve => server.close(resolve)) };
}
const renewal = () => ({ accessToken: newToken, expiresAt: new Date(Date.now() + 3600_000).toISOString() });

test("expired access renews automatically and persists the session without exposing secrets", async () => {
  const f = await fixture(req => req.path === "/api/cli/session" ? { body: renewal() } : { body: account });
  try {
    await f.save();
    const result = await f.run(["whoami"]);
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(f.requests.map(req => req.path), ["/api/cli/session", "/api/cli/account"]);
    assert.equal(f.requests[0].body.refreshToken, refreshToken);
    assert.equal(f.requests[1].headers.authorization, `Bearer ${newToken}`);
    assert.equal((await f.read()).dashboardSession.accessToken, newToken);
    assert.equal((await f.read()).apiKey, "other-credential-must-stay");
    assert.doesNotMatch(result.stdout + result.stderr, new RegExp(`${newToken}|${refreshToken}`));
  } finally { await f.close(); }
});

test("a rejected access token retries once with a renewed credential", async () => {
  const f = await fixture(req => req.path === "/api/cli/session" ? { body: renewal() } : req.headers.authorization === `Bearer ${oldToken}` ? { status: 401, body: { error: "expired" } } : { body: account });
  try {
    await f.save({ ...f.session, expiresAt: new Date(Date.now() + 3600_000).toISOString() });
    const result = await f.run(["token"]);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(f.requests.filter(req => req.path === "/api/cli/account").length, 2);
    assert.equal(f.requests.filter(req => req.path === "/api/cli/session").length, 1);
  } finally { await f.close(); }
});

test("outages retain credentials while revoked refresh sessions are removed", async () => {
  let status = 503;
  const f = await fixture(() => ({ status, body: { error: "unavailable" } }));
  try {
    await f.save();
    const unavailable = await f.run(["whoami"]);
    assert.equal(unavailable.status, 1);
    assert.equal((await f.read()).dashboardSession.refreshToken, refreshToken);
    status = 401;
    const revoked = await f.run(["whoami"]);
    assert.equal(revoked.status, 1);
    assert.match(revoked.stderr, /expired or was revoked/);
    assert.equal((await f.read()).dashboardSession, undefined);
    assert.equal((await f.read()).apiKey, "other-credential-must-stay");
  } finally { await f.close(); }
});

test("changing dashboard origins never sends a stored credential to the other issuer", async () => {
  const f = await fixture(() => ({ body: account }));
  try {
    await f.save({ ...f.session, url: "https://original.example" });
    const result = await f.run(["whoami"]);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /different dashboard/);
    assert.equal(f.requests.length, 0);
    assert.ok((await f.read()).dashboardSession);
  } finally { await f.close(); }
});

test("disconnect revokes the remote terminal and removes only dashboard credentials", async () => {
  const f = await fixture(() => ({ body: { ok: true } }));
  try {
    await f.save();
    const result = await f.run(["connect", "--disconnect"]);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(f.requests[0].method, "DELETE");
    assert.equal(f.requests[0].body.refreshToken, refreshToken);
    assert.equal((await f.read()).dashboardSession, undefined);
    assert.equal((await f.read()).apiKey, "other-credential-must-stay");
  } finally { await f.close(); }
});

test("offline disconnect clears local state but does not claim remote success", async () => {
  const f = await fixture(() => ({ status: 503, body: { error: "unavailable" } }));
  try {
    await f.save();
    const result = await f.run(["connect", "--disconnect"]);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /remote revocation could not be confirmed/);
    assert.equal((await f.read()).dashboardSession, undefined);
  } finally { await f.close(); }
});

test("parallel terminal processes can renew the same authorization", async () => {
  const f = await fixture(req => req.path === "/api/cli/session" ? { body: renewal() } : { body: account });
  try {
    await f.save();
    const results = await Promise.all([f.run(["whoami"]), f.run(["token"])]);
    assert.ok(results.every(result => result.status === 0), JSON.stringify(results));
    assert.ok((await f.read()).dashboardSession.refreshToken);
  } finally { await f.close(); }
});

test("browser connection persists refresh credentials and a terminal name", async () => {
  const f = await fixture(req => {
    if (req.path === "/api/cli/device") return { body: { deviceCode: "d".repeat(43), userCode: "ABCD-EFGH", verificationUrl: `${f.url}/cli/connect?code=ABCD-EFGH`, expiresIn: 20, interval: 2 } };
    if (req.path === "/api/cli/account") return { body: account };
    return { body: { ...renewal(), refreshToken, refreshExpiresAt: new Date(Date.now() + 86400_000).toISOString() } };
  });
  try {
    const result = await f.run(["connect", "--no-browser", "--name", "Fixture laptop"]);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(f.requests[0].body.name, "Fixture laptop");
    assert.equal(f.requests[0].body.sessionVersion, 2);
    assert.equal((await f.read()).dashboardSession.refreshToken, refreshToken);
    assert.doesNotMatch(result.stdout, /Tokens: 0/);
  } finally { await f.close(); }
});

test("explicit environment tokens cannot silently override a new browser connection", async () => {
  const f = await fixture(() => ({ body: account }));
  try {
    await f.save();
    const result = await f.run(["connect", "--no-browser"], { KRYTHIQ_CLI_TOKEN: oldToken });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Unset it before browser sign-in/);
    assert.equal(f.requests.length, 0);
    assert.equal((await f.read()).dashboardSession.refreshToken, refreshToken);
  } finally { await f.close(); }
});


test("legacy production origin sends Authorization directly to canonical www without redirect", async () => {
  const f = await fixture(() => ({ body: account }));
  try {
    await writeFile(path.join(f.directory, "config.json"), JSON.stringify({ dashboardToken: oldToken, dashboardUrl: "https://krythiq.dev" }));
    const preload = path.join(f.directory, "fetch.mjs");
    await writeFile(preload, `const original = globalThis.fetch; globalThis.fetch = (url, init) => { if (!String(url).startsWith("https://www.krythiq.dev/")) throw new Error("Noncanonical issuer"); return original(String(url).replace("https://www.krythiq.dev", ${JSON.stringify(f.url)}), init); };`);
    const result = await f.run(["tokens"], { KRYTHIQ_DASHBOARD_URL: "", NODE_OPTIONS: `--import=${preload}` });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(f.requests[0].headers.authorization, `Bearer ${oldToken}`);
    assert.match(result.stdout, /42/);
  } finally { await f.close(); }
});

test("tokens alias supports JSON and account transaction history", async () => {
  const f = await fixture(() => ({ body: { ...account, transactions: [{ id: "tx", amount: -15, description: "Security analysis", created_at: "2026-10-17" }] } }));
  try {
    await f.save({ ...f.session, expiresAt: new Date(Date.now() + 3600_000).toISOString() });
    const result = await f.run(["tokens", "--history"]);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /-15.*Security analysis/);
    const json = await f.run(["tokens", "--json"]);
    assert.equal(JSON.parse(json.stdout).balance, 42);
  } finally { await f.close(); }
});

test("paid commands require upload consent and use stable content-bound retry keys", async () => {
  const f = await fixture(req => req.path === "/api/cli/session" ? { body: renewal() } : { body: { analysis: "No exploitable issue found", tokenCharge: { cost: 15, balance: 27, replayed: false } } });
  try {
    await f.save();
    const file = path.join(f.directory, "example.js");
    await writeFile(file, "const safe = true;");
    const denied = await f.run(["review", file]);
    assert.equal(denied.status, 1);
    assert.equal(f.requests.length, 0);
    const args = ["review", file, "--yes", "--json", "--request-id", "retry-test"];
    const first = await f.run(args);
    assert.equal(first.status, 0, first.stderr);
    assert.equal(JSON.parse(first.stdout).tokenCharge.balance, 27);
    assert.equal(f.requests[1].path, "/api/ai/security-analysis");
    assert.equal(f.requests[1].body.codeContext, "const safe = true;");
    assert.equal(f.requests[1].body.filePath, "example.js");
    assert.equal(f.requests[1].headers.authorization, `Bearer ${newToken}`);
    await f.run(args);
    assert.equal(f.requests[1].headers["idempotency-key"], f.requests[2].headers["idempotency-key"]);
    await writeFile(file, "const changed = true;");
    await f.run(args);
    assert.notEqual(f.requests[1].headers["idempotency-key"], f.requests[3].headers["idempotency-key"]);
  } finally { await f.close(); }
});

test("ask sends only selected files and paid errors expose balance without retrying charges", async () => {
  const f = await fixture(() => ({ status: 402, body: { error: "This action costs 10 Tokens.", balance: 3 } }));
  try {
    await f.save({ ...f.session, expiresAt: new Date(Date.now() + 3600_000).toISOString() });
    const file = path.join(f.directory, "example.js");
    await writeFile(file, "export const value = 1;");
    const result = await f.run(["ask", "What does this do?", "--file", file, "--yes"]);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /10 Tokens.*Balance: 3/);
    assert.equal(f.requests.length, 1);
    assert.equal(f.requests[0].path, "/api/ai/ask-codebase");
    assert.equal(f.requests[0].body.codebaseContext.relevantFiles.length, 1);
    await writeFile(file, "x".repeat(4001));
    const oversized = await f.run(["review", file, "--yes"]);
    assert.equal(oversized.status, 1);
    assert.equal(f.requests.length, 1);
  } finally { await f.close(); }
});

test("connect does not report success when account verification rejects the new credential", async () => {
  const f = await fixture(req => {
    if (req.path === "/api/cli/device") return { body: { deviceCode: "d".repeat(43), userCode: "ABCD-EFGH", verificationUrl: `${f.url}/cli/connect?code=ABCD-EFGH`, interval: 2 } };
    if (req.path === "/api/cli/account") return { status: 401, body: { error: "invalid" } };
    return { body: { accessToken: oldToken, expiresAt: new Date(Date.now() + 3600_000).toISOString() } };
  });
  try {
    const result = await f.run(["connect", "--no-browser"]);
    assert.equal(result.status, 1);
    assert.doesNotMatch(result.stdout + result.stderr, /Terminal connected/);
  } finally { await f.close(); }
});
