import { createHash } from "node:crypto";

import type { PersistedCodeGraphReport, ReachabilityAnalysis } from "./types.ts";

export function findingFingerprint(type: string, file: string, symbol?: string) {
  return createHash("sha256")
    .update(["krythiq-finding-v1", type, file, symbol ?? ""].join("\0"))
    .digest("hex");
}

export function toPersistedCodeGraphReport(
  analysis: ReachabilityAnalysis,
  coverageComplete: boolean,
): PersistedCodeGraphReport {
  const modules = [...analysis.graph.modules.values()]
    .sort((a, b) => a.path.localeCompare(b.path))
    .map((module) => ({
      file: module.path,
      reachable: analysis.reachable.has(module.path),
      generated: module.generated,
      parseComplete: module.parseComplete,
      exports: module.exports,
      functions: module.functions,
      outgoing: (analysis.graph.outgoing.get(module.path) ?? []).map((edge) => ({
        to: edge.to,
        specifier: edge.specifier,
        kind: edge.kind,
        line: edge.line,
      })),
    }));
  return {
    schemaVersion: 1,
    analyzer: "krythiq-file-reachability",
    entryPoints: analysis.entryPoints,
    diagnostics: analysis.diagnostics,
    modules,
    summary: {
      modules: modules.length,
      reachable: modules.filter((module) => module.reachable).length,
      unreachable: modules.filter((module) => !module.reachable).length,
      unresolvedImports: analysis.diagnostics.filter((item) => item.code === "unresolved-import").length,
      parseErrors: analysis.diagnostics.filter((item) => item.code === "parse-error").length,
      unknownDynamicImports: analysis.diagnostics.filter((item) => item.code === "unknown-dynamic-import").length,
      coverageComplete,
    },
  };
}
