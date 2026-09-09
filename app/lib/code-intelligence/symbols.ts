import { findingFingerprint } from "./report.ts";
import type { AnalysisDiagnostic, DependencyGraph, EntryPointEvidence, UnusedExportFinding } from "./types.ts";

export function detectUnusedExports(input: {
  graph: DependencyGraph;
  reachable: Set<string>;
  entryPoints: EntryPointEvidence[];
  diagnostics: AnalysisDiagnostic[];
}) {
  const entryFiles = new Set(input.entryPoints.map((entry) => entry.file));
  const demanded = new Map<string, Set<string>>();
  const demand = (file: string, name: string) => {
    const names = demanded.get(file) ?? new Set<string>();
    const before = names.size;
    names.add(name);
    demanded.set(file, names);
    return names.size !== before;
  };

  for (const [from, edges] of input.graph.outgoing) {
    if (!input.reachable.has(from)) continue;
    for (const edge of edges) {
      if (!edge.to || edge.kind === "re-export") continue;
      for (const binding of edge.bindings) demand(edge.to, binding.imported);
    }
  }

  let changed = true;
  while (changed) {
    changed = false;
    for (const [barrel, edges] of input.graph.outgoing) {
      if (!input.reachable.has(barrel)) continue;
      const barrelDemand = demanded.get(barrel);
      if (!barrelDemand) continue;
      for (const edge of edges) {
        if (!edge.to || edge.kind !== "re-export") continue;
        for (const binding of edge.bindings) {
          if (binding.exposedAs === "*" && barrelDemand.size) {
            for (const name of barrelDemand) if (name !== "default") changed = demand(edge.to, name) || changed;
          } else if (barrelDemand.has("*") || (binding.exposedAs && barrelDemand.has(binding.exposedAs))) {
            changed = demand(edge.to, binding.imported) || changed;
          }
        }
      }
    }
  }

  const hasParseError = input.diagnostics.some((item) => item.code === "parse-error");
  const hasUncertainty = input.diagnostics.some((item) => ["incomplete-inventory", "unknown-dynamic-import", "unresolved-import"].includes(item.code));
  const confidence = hasParseError ? "low" as const : hasUncertainty ? "medium" as const : "high" as const;
  const caveats = input.diagnostics.map((item) => item.message).filter((item, index, values) => values.indexOf(item) === index).slice(0, 8);
  const findings: UnusedExportFinding[] = [];
  for (const moduleFacts of [...input.graph.modules.values()].sort((a, b) => a.path.localeCompare(b.path))) {
    if (!input.reachable.has(moduleFacts.path) || entryFiles.has(moduleFacts.path) || moduleFacts.generated) continue;
    const names = demanded.get(moduleFacts.path) ?? new Set<string>();
    if (names.has("*")) continue;
    for (const exported of moduleFacts.exports) {
      if (names.has(exported.name)) continue;
      const evidence = [
        `Export ${exported.name} is declared in a reachable file.`,
        "No reachable named import requests this export.",
        "No demanded re-export chain exposes this export.",
      ];
      findings.push({
        schemaVersion: 1,
        fingerprint: findingFingerprint("UNUSED_EXPORT_CANDIDATE", moduleFacts.path, exported.name),
        file: moduleFacts.path,
        line: exported.line,
        severity: "low",
        score: 20,
        type: "UNUSED_EXPORT_CANDIDATE",
        symbol: exported.name,
        message: `Export ${exported.name} has no reachable consumer`,
        suggestion: "Review whether this export is public API or framework-consumed before removing it.",
        source: "code-graph",
        category: "code",
        confidence,
        evidence,
        caveats,
        suggestedAction: "review-export-surface",
        autoFixSafe: false,
        technicalDetails: `${evidence.join(" ")} Automatic removal is disabled.`,
      });
    }
  }
  return findings;
}
