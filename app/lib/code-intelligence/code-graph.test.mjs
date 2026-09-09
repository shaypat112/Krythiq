import assert from "node:assert/strict";
import test from "node:test";

import { analyzeFileReachability } from "./analyze.ts";
import { findingFingerprint, toPersistedCodeGraphReport } from "./report.ts";
import { detectEngineeringResidue } from "./residue.ts";
import { parseSemanticAssessments } from "./semantic.ts";
import { mergeRuntimeEvidence } from "./runtime.ts";

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
  assert.deepEqual(result.findings.filter((finding) => finding.type === "UNUSED_FILE_CANDIDATE").map((finding) => finding.file), ["src/orphan.ts"]);
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
    file("src/helper.ts", ""),
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
  assert.deepEqual(result.findings.filter((finding) => finding.type === "UNUSED_FILE_CANDIDATE").map((finding) => finding.file), ["packages/unused/src/index.ts"]);
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

  assert.deepEqual(result.findings.filter((finding) => finding.type === "UNUSED_FILE_CANDIDATE").map((finding) => finding.file), ["unused.ts"]);
  assert.equal(result.findings[0].confidence, "medium");
  assert.equal(result.diagnostics.at(-1).code, "incomplete-inventory");
});

test("creates stable fingerprints and a deterministic persisted report", () => {
  const inputs = [
    file("package.json", JSON.stringify({ main: "./index.ts" })),
    file("index.ts", "import './used'"),
    file("used.ts"),
    file("orphan.ts"),
  ];
  const first = analyzeFileReachability(inputs);
  const second = analyzeFileReachability([...inputs].reverse());
  const firstReport = toPersistedCodeGraphReport(first, true);
  const secondReport = toPersistedCodeGraphReport(second, true);

  assert.equal(first.findings[0].fingerprint, findingFingerprint("UNUSED_FILE_CANDIDATE", "orphan.ts"));
  assert.deepEqual(firstReport, secondReport);
  assert.equal(firstReport.schemaVersion, 1);
  assert.deepEqual(firstReport.summary, {
    modules: 3, reachable: 2, unreachable: 1, unresolvedImports: 0,
    parseErrors: 0, unknownDynamicImports: 0, coverageComplete: true,
  });
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

test("finds unused exports and propagates named demand through barrels", () => {
  const result = analyzeFileReachability([
    file("package.json", JSON.stringify({ main: "./src/index.ts" })),
    file("src/index.ts", "import { used } from './barrel'; console.log(used)"),
    file("src/barrel.ts", "export { used, abandoned as renamed } from './utilities'"),
    file("src/utilities.ts", "export const used = 1; export const abandoned = 2; export type Shape = string"),
  ]);
  const unused = result.findings.filter((finding) => finding.type === "UNUSED_EXPORT_CANDIDATE");

  assert.deepEqual(unused.map((finding) => `${finding.file}:${finding.symbol}`), [
    "src/utilities.ts:abandoned", "src/utilities.ts:Shape",
  ]);
  assert.ok(unused.every((finding) => finding.autoFixSafe === false));
});

test("namespace consumers conservatively retain every export", () => {
  const result = analyzeFileReachability([
    file("package.json", JSON.stringify({ main: "./index.ts" })),
    file("index.ts", "import * as utilities from './utilities'; console.log(utilities)"),
    file("utilities.ts", "export const one = 1; export const two = 2"),
  ]);
  assert.equal(result.findings.length, 0);
});

test("groups deterministic structural function duplicates without enabling fixes", () => {
  const result = analyzeFileReachability([
    file("package.json", JSON.stringify({ main: "./index.ts" })),
    file("index.ts", "import { first } from './first'; import { second } from './second'; console.log(first(2), second(3))"),
    file("first.ts", "export function first(input) { const adjusted = input + 1; return adjusted * 2; }"),
    file("second.ts", "export function second(value) { const result = value + 9; return result * 4; }"),
  ]);
  const duplicates = result.findings.filter((finding) => finding.type === "DUPLICATE_IMPLEMENTATION_CANDIDATE");

  assert.equal(duplicates.length, 1);
  assert.equal(duplicates[0].file, "second.ts");
  assert.equal(duplicates[0].confidence, "medium");
  assert.equal(duplicates[0].autoFixSafe, false);
  assert.deepEqual(duplicates[0].relatedLocations, [{ file: "first.ts", symbol: "first", line: 1 }]);
});

test("composes Git and static evidence without claiming AI authorship", () => {
  const source = {
    fingerprint: "static-finding", file: "src/new-helper.ts", line: 1,
    type: "UNUSED_FILE_CANDIDATE", changeStatus: "new",
  };
  const findings = detectEngineeringResidue([source], [
    { file: "src/new-helper.ts", status: "added", additions: 40, deletions: 0 },
  ]);

  assert.equal(findings.length, 1);
  assert.equal(findings[0].type, "POSSIBLE_ABANDONED_CHANGE_RESIDUE");
  assert.equal(findings[0].autoFixSafe, false);
  assert.doesNotMatch(findings[0].message, /chatgpt|authored by ai/i);
  assert.deepEqual(findings[0].relatedFindingFingerprints, ["static-finding"]);
});

test("validates semantic assessments against known deterministic candidates", () => {
  const assessments = parseSemanticAssessments({ assessments: [
    { candidateFingerprint: "known", relationship: "same-purpose", similarityBand: "strong", rationale: "Both format the same domain value.", behavioralRisks: ["Timezone behavior differs"], refactorRecommendation: "consider-consolidation" },
    { candidateFingerprint: "invented", relationship: "same-purpose" },
  ] }, new Set(["known"]));

  assert.equal(assessments.length, 1);
  assert.equal(assessments[0].status, "unverified");
  assert.equal(assessments[0].autoFixSafe, false);
});

test("runtime evidence lowers confidence on observed static-dead candidates without proving negatives", () => {
  const report = { schemaVersion: 1, revision: "abc1234", source: "coverage-upload", collectedAt: "2026-01-01T00:00:00.000Z", files: [
    { file: "src/observed.ts", executedLines: 8, totalLines: 20, invocations: 3 },
    { file: "src/cold.ts", executedLines: 0, totalLines: 20 },
  ] };
  const merged = mergeRuntimeEvidence([
    { file: "src/observed.ts", confidence: "high", caveats: [], autoFixSafe: false },
    { file: "src/cold.ts", confidence: "high", caveats: [], autoFixSafe: false },
  ], report);

  assert.equal(merged[0].runtimeEvidence.status, "observed");
  assert.equal(merged[0].confidence, "low");
  assert.equal(merged[1].runtimeEvidence.status, "not-observed");
  assert.match(merged[1].caveats[0], /not proof/i);
  assert.ok(merged.every((finding) => finding.autoFixSafe === false));
});
