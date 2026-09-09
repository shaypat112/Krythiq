export type SourceInput = {
  path: string;
  content: string;
};

export type ModuleEdgeKind =
  | "static-import"
  | "type-import"
  | "re-export"
  | "dynamic-import"
  | "commonjs-require";

export type ModuleEdgeFact = {
  specifier: string | null;
  kind: ModuleEdgeKind;
  line: number;
  isLiteral: boolean;
  bindings: Array<{ imported: string; exposedAs?: string }>;
};

export type ExportFact = {
  name: string;
  line: number;
  kind: "value" | "type" | "default";
};

export type AnalysisDiagnostic = {
  code:
    | "parse-error"
    | "unresolved-import"
    | "unknown-dynamic-import"
    | "incomplete-inventory"
    | "no-entry-points";
  file?: string;
  line?: number;
  message: string;
};

export type ModuleFacts = {
  path: string;
  edges: ModuleEdgeFact[];
  parseComplete: boolean;
  generated: boolean;
  exports: ExportFact[];
  diagnostics: AnalysisDiagnostic[];
};

export type ResolvedModuleEdge = ModuleEdgeFact & {
  from: string;
  to: string | null;
};

export type EntryPointEvidence = {
  file: string;
  source: "user-config" | "package-manifest" | "framework" | "tooling" | "test";
  reason: string;
};

export type DependencyGraph = {
  modules: Map<string, ModuleFacts>;
  outgoing: Map<string, ResolvedModuleEdge[]>;
  incoming: Map<string, ResolvedModuleEdge[]>;
  diagnostics: AnalysisDiagnostic[];
};

export type FindingConfidence = "high" | "medium" | "low";

export type ReachabilityFinding = {
  schemaVersion: 1;
  fingerprint: string;
  file: string;
  line: number;
  severity: "low";
  score: 25;
  type: "UNUSED_FILE_CANDIDATE";
  message: string;
  suggestion: string;
  source: "code-graph";
  category: "code";
  confidence: FindingConfidence;
  evidence: string[];
  caveats: string[];
  suggestedAction: "review-for-deletion";
  autoFixSafe: false;
  technicalDetails: string;
};

export type UnusedExportFinding = Omit<ReachabilityFinding,
  "score" | "type" | "message" | "suggestion" | "suggestedAction"
> & {
  score: 20;
  type: "UNUSED_EXPORT_CANDIDATE";
  symbol: string;
  message: string;
  suggestion: string;
  suggestedAction: "review-export-surface";
};

export type CodeGraphFinding = ReachabilityFinding | UnusedExportFinding;

export type ReachabilityAnalysis = {
  graph: DependencyGraph;
  entryPoints: EntryPointEvidence[];
  reachable: Set<string>;
  findings: CodeGraphFinding[];
  diagnostics: AnalysisDiagnostic[];
};

export type PersistedCodeGraphReport = {
  schemaVersion: 1;
  analyzer: "krythiq-file-reachability";
  entryPoints: EntryPointEvidence[];
  diagnostics: AnalysisDiagnostic[];
  modules: Array<{
    file: string;
    reachable: boolean;
    generated: boolean;
    parseComplete: boolean;
    exports: ExportFact[];
    outgoing: Array<{
      to: string | null;
      specifier: string | null;
      kind: ModuleEdgeKind;
      line: number;
    }>;
  }>;
  summary: {
    modules: number;
    reachable: number;
    unreachable: number;
    unresolvedImports: number;
    parseErrors: number;
    unknownDynamicImports: number;
    coverageComplete: boolean;
  };
};

export type CodeGraphOptions = {
  explicitEntryPoints?: string[];
  coverageComplete?: boolean;
};

export type PathAliasRule = {
  configFile: string;
  scopeDirectory: string;
  pattern: string;
  targets: string[];
};

export type WorkspacePackage = {
  name: string;
  directory: string;
  publicEntryPoints: string[];
};

export type ModuleResolutionIndex = {
  aliases: PathAliasRule[];
  workspacePackages: Map<string, WorkspacePackage>;
};
