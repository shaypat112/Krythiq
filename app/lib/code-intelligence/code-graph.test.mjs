import assert from "node:assert/strict";
import test from "node:test";

import { analyzeFileReachability } from "./analyze.ts";

const file = (path, content = "export const value = 1") => ({ path, content });

test("walks imports, re-exports, type imports, dynamic imports, and cycles", () => {
  const result = analyzeFileReachability([
    file("package.json", JSON.stringify({ main: "./src/index.ts" })),
    file("src/index.ts", "import './a'; export * from './types'; import('./lazy')"),
    file("src/a.ts", "import './b'"),
    file("src/b.ts", "import './a'; import type { Shape } from './types'"),
    file("src/types.ts", "export type Shape = { id: string }"),
    file("src/lazy.ts"),
    file("src/orphan.ts"),
  ]);

  assert.deepEqual([...result.reachable].sort(), [
    "src/a.ts", "src/b.ts", "src/index.ts", "src/lazy.ts", "src/types.ts",
  ]);
  assert.deepEqual(result.findings.map((finding) => finding.file), ["src/orphan.ts"]);
  assert.equal(result.findings[0].confidence, "high");
  assert.equal(result.findings[0].autoFixSafe, false);
});

test("treats Next routes, tests, and config files as independent roots", () => {
  const result = analyzeFileReachability([
    file("tsconfig.json", JSON.stringify({ compilerOptions: { paths: { "@/*": ["./*"] } } })),
    file("app/page.tsx", "import Widget from '@/components/widget'; export default () => <Widget />"),
    file("components/widget.tsx", "export default () => null"),
    file("app/api/users/route.ts"),
    file("src/value.test.ts", "import './helper'"),
    file("src/helper.ts"),
    file("next.config.ts"),
  ]);

  assert.equal(result.findings.length, 0);
  assert.equal(result.entryPoints.length, 4);
});

test("resolves tsconfig path aliases", () => {
  const result = analyzeFileReachability([
    file("tsconfig.json", JSON.stringify({ compilerOptions: { baseUrl: ".", paths: { "@/*": ["./*"] } } })),
    file("app/page.tsx", "import Widget from '@/components/widget'; export default () => <Widget />"),
    file("components/widget.tsx", "export default () => null"),
  ]);

  assert.deepEqual([...result.reachable].sort(), ["app/page.tsx", "components/widget.tsx"]);
  assert.equal(result.diagnostics.length, 0);
});

test("resolves workspace package names and subpaths in a monorepo", () => {
  const result = analyzeFileReachability([
    file("apps/web/app/page.tsx", "import { api } from '@acme/core'; import { helper } from '@acme/core/helper'; export default () => api(helper)"),
    file("packages/core/package.json", JSON.stringify({ name: "@acme/core", private: true, exports: "./src/index.ts" })),
    file("packages/core/src/index.ts", "export const api = (value) => value"),
    file("packages/core/helper.ts", "export const helper = 1"),
    file("packages/unused/src/index.ts"),
  ]);

  assert.deepEqual([...result.reachable].sort(), [
    "apps/web/app/page.tsx", "packages/core/helper.ts", "packages/core/src/index.ts",
  ]);
  assert.deepEqual(result.findings.map((finding) => finding.file), ["packages/unused/src/index.ts"]);
});

test("reports unresolved and non-literal dynamic imports as uncertainty", () => {
  const result = analyzeFileReachability([
    file("package.json", JSON.stringify({ main: "./index.ts" })),
    file("index.ts", "import './missing'; const target = './maybe'; import(target)"),
    file("orphan.ts"),
  ]);

  assert.deepEqual(result.diagnostics.map((item) => item.code).sort(), [
    "unknown-dynamic-import", "unresolved-import",
  ]);
  assert.equal(result.findings[0].confidence, "medium");
  assert.ok(result.findings[0].caveats.length >= 2);
});

test("withholds findings when no legitimate root can be established", () => {
  const result = analyzeFileReachability([file("src/a.ts", "import './b'"), file("src/b.ts")]);
  assert.equal(result.findings.length, 0);
  assert.equal(result.diagnostics.at(-1).code, "no-entry-points");
});

test("lowers confidence when any source file has malformed syntax", () => {
  const result = analyzeFileReachability([
    file("package.json", JSON.stringify({ main: "./index.ts" })),
    file("index.ts", "import './broken'"),
    file("broken.ts", "export function broken( {"),
    file("orphan.ts"),
  ]);

  assert.ok(result.diagnostics.some((item) => item.code === "parse-error"));
  assert.equal(result.findings[0].confidence, "low");
});

test("marks capped inventories uncertain and excludes generated files", () => {
  const result = analyzeFileReachability([
    file("package.json", JSON.stringify({ main: "./index.ts" })),
    file("index.ts"),
    file("unused.ts"),
    file("generated/client.generated.ts"),
  ], { coverageComplete: false });

  assert.deepEqual(result.findings.map((finding) => finding.file), ["unused.ts"]);
  assert.equal(result.findings[0].confidence, "medium");
  assert.equal(result.diagnostics.at(-1).code, "incomplete-inventory");
});

test("keeps malformed-source candidates but lowers confidence", () => {
  const result = analyzeFileReachability([
    file("package.json", JSON.stringify({ main: "./index.ts" })),
    file("index.ts", "import {"),
    file("orphan.ts"),
  ]);

  assert.ok(result.diagnostics.some((diagnostic) => diagnostic.code === "parse-error"));
  assert.equal(result.findings[0].confidence, "low");
  assert.equal(result.findings[0].autoFixSafe, false);
});
