import { resolveEntryPoints } from "./entry-points.ts";
import { extractModuleFacts, isSupportedModule } from "./extract.ts";
import { buildDependencyGraph, traverseReachable } from "./graph.ts";
import { normalizeProjectPath } from "./paths.ts";
import type { AnalysisDiagnostic, CodeGraphOptions, ReachabilityAnalysis, SourceInput } from "./types.ts";

export function analyzeFileReachability(files: SourceInput[], options: CodeGraphOptions = {}): ReachabilityAnalysis {
  const normalizedFiles = files.map((file) => ({ ...file, path: normalizeProjectPath(file.path) }));
  const facts = normalizedFiles
    .filter((file) => isSupportedModule(file.path))
    .map(extractModuleFacts)
    .sort((a, b) => a.path.localeCompare(b.path));
  const graph = buildDependencyGraph(facts);
  const entryPoints = resolveEntryPoints({
    modules: graph.modules,
    files: normalizedFiles,
    explicit: options.explicitEntryPoints,
  });
  const diagnostics: AnalysisDiagnostic[] = [...graph.diagnostics];
  if (options.coverageComplete === false) {
    diagnostics.push({
      code: "incomplete-inventory",
      message: "Repository limits prevented every eligible source file from being loaded.",
    });
  }
  if (entryPoints.length === 0) {
    diagnostics.push({
      code: "no-entry-points",
      message: "No recognized entry point was found; unused-file findings were withheld.",
    });
  }

  const reachable = traverseReachable(graph, entryPoints.map((entry) => entry.file));
  const findings = entryPoints.length === 0 ? [] : facts
    .filter((fact) => !fact.generated && !reachable.has(fact.path))
    .map((fact) => {
      const directImporters = graph.incoming.get(fact.path) ?? [];
      const reachableImporters = directImporters.filter((edge) => reachable.has(edge.from));
      const hasParseError = diagnostics.some((diagnostic) => diagnostic.code === "parse-error");
      const hasUncertainty = diagnostics.some((diagnostic) =>
        diagnostic.code === "incomplete-inventory" ||
        diagnostic.code === "unknown-dynamic-import" ||
        diagnostic.code === "unresolved-import",
      );
      const confidence = hasParseError ? "low" as const : hasUncertainty ? "medium" as const : "high" as const;
      const caveats = diagnostics
        .filter((diagnostic) => diagnostic.code !== "no-entry-points")
        .map((diagnostic) => diagnostic.message)
        .filter((message, index, values) => values.indexOf(message) === index)
        .slice(0, 8);
      const evidence = [
        `Not reachable from ${entryPoints.length} recognized entry point${entryPoints.length === 1 ? "" : "s"}.`,
        `${directImporters.length} direct project importer${directImporters.length === 1 ? "" : "s"}.`,
        `${reachableImporters.length} reachable importer${reachableImporters.length === 1 ? "" : "s"}.`,
        "No package or framework entry-point registration was recognized for this file.",
      ];
      return {
        file: fact.path,
        line: 1,
        severity: "low" as const,
        score: 25 as const,
        type: "UNUSED_FILE_CANDIDATE" as const,
        message: "File is not reachable from a recognized application entry point",
        suggestion: "Review the file and its framework/runtime registrations before deleting it.",
        source: "code-graph" as const,
        category: "code" as const,
        confidence,
        evidence,
        caveats,
        suggestedAction: "review-for-deletion" as const,
        autoFixSafe: false as const,
        technicalDetails: `${evidence.join(" ")} ${caveats.length ? `Caveats: ${caveats.join(" ")}` : "Graph coverage contains no recorded caveats."}`,
      };
    });

  return { graph, entryPoints, reachable, findings, diagnostics };
}
