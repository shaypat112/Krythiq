import { findingFingerprint } from "./report.ts";
import type { AnalysisDiagnostic, DependencyGraph, DuplicateImplementationFinding } from "./types.ts";

export function detectStructuralDuplicates(input: {
  graph: DependencyGraph;
  reachable: Set<string>;
  diagnostics: AnalysisDiagnostic[];
}) {
  const groups = new Map<string, Array<{ file: string; name: string; line: number; endLine: number; tokenCount: number }>>();
  for (const moduleFacts of input.graph.modules.values()) {
    if (!input.reachable.has(moduleFacts.path) || moduleFacts.generated) continue;
    for (const unit of moduleFacts.functions) {
      const group = groups.get(unit.structuralHash) ?? [];
      group.push({ file: moduleFacts.path, name: unit.name, line: unit.line, endLine: unit.endLine, tokenCount: unit.tokenCount });
      groups.set(unit.structuralHash, group);
    }
  }

  const caveats = input.diagnostics.map((item) => item.message).filter((item, index, values) => values.indexOf(item) === index).slice(0, 8);
  const findings: DuplicateImplementationFinding[] = [];
  for (const matches of [...groups.values()]) {
    if (matches.length < 2) continue;
    matches.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);
    const canonical = matches[0];
    for (const duplicate of matches.slice(1)) {
      const relatedLocations = matches
        .filter((match) => match !== duplicate)
        .map((match) => ({ file: match.file, symbol: match.name, line: match.line }));
      const evidence = [
        `Function ${duplicate.name} has the same normalized ${duplicate.tokenCount}-token structure as ${canonical.name}.`,
        `Canonical comparison location: ${canonical.file}:${canonical.line}.`,
        `${matches.length} reachable implementations share this structural fingerprint.`,
      ];
      findings.push({
        schemaVersion: 1,
        fingerprint: findingFingerprint("DUPLICATE_IMPLEMENTATION_CANDIDATE", duplicate.file, `${duplicate.name}:${duplicate.line}`),
        file: duplicate.file,
        line: duplicate.line,
        severity: "low",
        score: 30,
        type: "DUPLICATE_IMPLEMENTATION_CANDIDATE",
        symbol: duplicate.name,
        message: `${duplicate.name} duplicates another reachable implementation`,
        suggestion: "Compare behavior, side effects, and callers before consolidating these implementations.",
        source: "code-graph",
        category: "code",
        confidence: "medium",
        evidence,
        caveats: [...caveats, "Normalized syntax can match implementations whose runtime intent differs."],
        suggestedAction: "review-for-consolidation",
        autoFixSafe: false,
        relatedLocations,
        technicalDetails: `${evidence.join(" ")} This is deterministic structural similarity, not proof of behavioral equivalence.`,
      });
    }
  }
  return findings.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);
}
