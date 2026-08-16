import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const config = await readFile(new URL("../../next.config.ts", import.meta.url), "utf8");

test("CSP permits Supabase REST and Realtime connections", () => {
  const connectSource = config.match(/connect-src ([^;]+);/)?.[1] ?? "";
  assert.match(connectSource, /https:\/\/\*\.supabase\.co/);
  assert.match(connectSource, /wss:\/\/\*\.supabase\.co/);
});

test("CSP does not allow arbitrary WebSocket origins", () => {
  const connectSource = config.match(/connect-src ([^;]+);/)?.[1] ?? "";
  assert.doesNotMatch(connectSource, /(?:^|\s)wss:(?:\s|$)/);
});
