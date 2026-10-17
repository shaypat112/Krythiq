import assert from "node:assert/strict";
import test from "node:test";
import { cliDeviceStatus, signInRedirect } from "./cli-session.ts";

const now = Date.parse("2026-10-17T12:00:00Z");
const old = "2026-10-17T11:00:00Z";
const future = "2026-10-18T12:00:00Z";
test("authorization status matches access renewal, hard expiry, and revocation", () => {
  assert.equal(cliDeviceStatus({ revoked_at: null, expires_at: old, refresh_expires_at: future }, now), "active");
  assert.equal(cliDeviceStatus({ revoked_at: null, expires_at: future, refresh_expires_at: old }, now), "expired");
  assert.equal(cliDeviceStatus({ revoked_at: future, expires_at: future, refresh_expires_at: future }, now), "revoked");
  assert.equal(cliDeviceStatus({ revoked_at: null, expires_at: null }, now), "active");
  assert.equal(cliDeviceStatus({ revoked_at: null, expires_at: "invalid" }, now), "expired");
});
test("sign-in preserves a CLI authorization code and rejects external destinations", () => {
  const next = new URLSearchParams(signInRedirect("/cli/connect", "?code=ABCD-EFGH").split("?")[1]).get("next");
  assert.equal(next, "/cli/connect?code=ABCD-EFGH");
  assert.equal(new URLSearchParams(signInRedirect("//evil.example").split("?")[1]).get("next"), "/scan");
});
