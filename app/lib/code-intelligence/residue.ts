import { findingFingerprint } from "./report.ts";

export type ResidueSignalInput = {
  fingerprint: string;
  file: string;
  line: number;
  type: string;
  symbol?: string;
  changeStatus?: "new" | "existing" | "not-compared";
  evidence?: string[];
};

export type ChangedFileEvidence = {
  file: string;
  status: string;
  additions: number;
  deletions: number;
};

export function detectEngineeringResidue(findings: ResidueSignalInput[], changedFiles: ChangedFileEvidence[]) {
  const changes = new Map(changedFiles.map((change) => [change.file, change]));
  return findings
    .filter((finding) => finding.changeStatus === "new")
    .flatMap((finding) => {
      const change = changes.get(finding.file);
      if (!change) return [];
      const signals: string[] = [];
      if (change.status === "added") signals.push(`File was added in this change (+${change.additions} lines).`);
      else signals.push(`Affected implementation changed in this comparison (+${change.additions}/-${change.deletions} lines).`);
      if (finding.type === "UNUSED_FILE_CANDIDATE") signals.push("The new file is unreachable from recognized entry points.");
      if (finding.type === "UNUSED_EXPORT_CANDIDATE") signals.push(`The new export ${finding.symbol ?? ""} has no reachable consumer.`.trim());
      if (finding.type === "DUPLICATE_IMPLEMENTATION_CANDIDATE") signals.push("The changed function structurally duplicates a reachable implementation.");
      if (signals.length < 2) return [];
      const type = finding.type === "DUPLICATE_IMPLEMENTATION_CANDIDATE"
        ? "POSSIBLE_REDUNDANT_IMPLEMENTATION"
        : "POSSIBLE_ABANDONED_CHANGE_RESIDUE";
      return [{
        schemaVersion: 1 as const,
        fingerprint: findingFingerprint(type, finding.file, finding.symbol ?? `${finding.line}`),
        file: finding.file,
        line: finding.line,
        severity: "low" as const,
        score: 35 as const,
        type,
        symbol: finding.symbol,
        message: type === "POSSIBLE_REDUNDANT_IMPLEMENTATION"
          ? "Changed code appears to duplicate an existing implementation"
          : "Changed code appears unconnected to the reachable application",
        suggestion: type === "POSSIBLE_REDUNDANT_IMPLEMENTATION"
          ? "Compare callers and behavior, then consider consolidating around the established implementation."
          : "Confirm whether the change is intentionally staged or registered dynamically before removing it.",
        source: "code-graph" as const,
        category: "code" as const,
        confidence: "medium" as const,
        evidence: signals,
        caveats: [
          "This finding describes engineering residue signals; it does not infer who or what authored the code.",
          "Git and static evidence cannot prove runtime intent.",
        ],
        suggestedAction: "review-change-intent" as const,
        autoFixSafe: false as const,
        changeStatus: "new" as const,
        relatedFindingFingerprints: [finding.fingerprint],
        technicalDetails: `${signals.join(" ")} Multiple independent signals are required for this composite finding.`,
      }];
    })
    .sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line || a.type.localeCompare(b.type));
}
