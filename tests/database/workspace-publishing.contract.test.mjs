import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const workspaceSource = await readFile(new URL("../../app/lib/server/repository-workspaces.ts", import.meta.url), "utf8");
const connectionSource = await readFile(new URL("../../app/lib/server/githubConnection.ts", import.meta.url), "utf8");
const publishSource = await readFile(new URL("../../app/api/workspaces/[workspaceId]/publish/route.ts", import.meta.url), "utf8");

test("workspace editor accepts ordinary source containing credential-shaped names", () => {
  assert.doesNotMatch(workspaceSource, /secretLike\.test\(value\)/);
  assert.match(workspaceSource, /Buffer\.byteLength\(value, "utf8"\) > 1_048_576/);
});

test("stale browser session tokens cannot replace durable GitHub credentials", () => {
  assert.match(connectionSource, /if \(stored\) return stored/);
  assert.doesNotMatch(connectionSource, /saveGitHubConnection\(userId, providerToken\)/);
});

test("read-only GitHub OAuth grants return an actionable publishing error", () => {
  assert.match(publishSource, /can read this repository but cannot write to it/);
  assert.match(publishSource, /response\.status === 404 && init\.method/);
});
