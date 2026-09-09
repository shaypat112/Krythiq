import { normalizeProjectPath } from "./paths.ts";

export type RuntimeFileEvidence = {
  file: string;
  executedLines: number;
  totalLines: number;
  invocations?: number;
};

export type RuntimeEvidenceReport = {
  schemaVersion: 1;
  revision: string;
  source: "coverage-upload";
  collectedAt: string;
  files: RuntimeFileEvidence[];
};

export type FindingWithRuntime = {
  file?: string;
  caveats?: string[];
  confidence?: "high" | "medium" | "low";
  autoFixSafe?: boolean;
  runtimeEvidence?: {
    status: "observed" | "not-observed" | "no-data";
    executedLines: number;
    totalLines: number;
    invocations: number | null;
    source: "coverage-upload";
    revision: string;
  };
};

export function mergeRuntimeEvidence<T extends FindingWithRuntime>(findings: T[], report: RuntimeEvidenceReport): T[] {
  const evidence = new Map(report.files.map((file) => [normalizeProjectPath(file.file), file]));
  return findings.map((finding) => {
    if (!finding.file) return finding;
    const fileEvidence = evidence.get(normalizeProjectPath(finding.file));
    if (!fileEvidence) return { ...finding, runtimeEvidence: { status: "no-data", executedLines: 0, totalLines: 0, invocations: null, source: report.source, revision: report.revision }, autoFixSafe: false };
    const observed = fileEvidence.executedLines > 0 || (fileEvidence.invocations ?? 0) > 0;
    const caveat = observed
      ? "Runtime coverage observed this file at the analyzed revision; investigate the static entry-point model before cleanup."
      : "This file was not observed in the supplied coverage run, which is not proof that it is unused.";
    return {
      ...finding,
      confidence: observed ? "low" : finding.confidence,
      caveats: [...new Set([...(finding.caveats ?? []), caveat])],
      autoFixSafe: false,
      runtimeEvidence: {
        status: observed ? "observed" : "not-observed",
        executedLines: fileEvidence.executedLines,
        totalLines: fileEvidence.totalLines,
        invocations: fileEvidence.invocations ?? null,
        source: report.source,
        revision: report.revision,
      },
    };
  });
}
