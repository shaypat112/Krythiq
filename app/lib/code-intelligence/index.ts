export { analyzeFileReachability } from "./analyze";
export { buildDependencyGraph, traverseReachable } from "./graph";
export { extractModuleFacts, isSupportedModule } from "./extract";
export { resolveEntryPoints } from "./entry-points";
export { buildModuleResolutionIndex, resolveModuleSpecifier } from "./resolution";
export { findingFingerprint, toPersistedCodeGraphReport } from "./report";
export { detectUnusedExports } from "./symbols";
export type * from "./types";
