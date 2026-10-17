import assert from "node:assert/strict";
import test from "node:test";
import { fetchWithSession } from "./session-fetch.ts";

test("browser requests renew on 401, preserve the request, and retry only once", async () => {
  const original = globalThis.fetch;
  let refreshes = 0;
  const calls = [];
  const client = { auth: { getSession: async () => ({ data: { session: { access_token: "old" } } }), refreshSession: async () => { refreshes++; return { data: { session: { access_token: "new" } } }; } } };
  globalThis.fetch = async (_url, init) => { calls.push(init); return new Response("{}", { status: calls.length === 1 ? 401 : 200 }); };
  try {
    const response = await fetchWithSession(client, "/api/cli/device/approve", { method: "POST", body: '{"userCode":"ABCD-EFGH"}' });
    assert.equal(response.status, 200);
    assert.equal(refreshes, 1);
    assert.equal(calls[1].headers.get("Authorization"), "Bearer new");
    assert.equal(calls[1].body, calls[0].body);
  } finally { globalThis.fetch = original; }
});

test("a service outage does not attempt browser credential refresh", async () => {
  const original = globalThis.fetch;
  let refreshes = 0;
  const client = { auth: { getSession: async () => ({ data: { session: { access_token: "valid" } } }), refreshSession: async () => { refreshes++; throw new Error("should not refresh"); } } };
  globalThis.fetch = async () => new Response("{}", { status: 503 });
  try { assert.equal((await fetchWithSession(client, "/api/cli/settings")).status, 503); assert.equal(refreshes, 0); }
  finally { globalThis.fetch = original; }
});

test("persistent unauthorized responses stop after one browser renewal", async () => {
  const original = globalThis.fetch;
  let calls = 0, refreshes = 0;
  const client = { auth: { getSession: async () => ({ data: { session: { access_token: "old" } } }), refreshSession: async () => { refreshes++; return { data: { session: { access_token: "new" } } }; } } };
  globalThis.fetch = async () => { calls++; return new Response("{}", { status: 401 }); };
  try { assert.equal((await fetchWithSession(client, "/api/cli/settings")).status, 401); assert.equal(calls, 2); assert.equal(refreshes, 1); }
  finally { globalThis.fetch = original; }
});
