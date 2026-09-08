export { analyzeFileReachability } from "./analyze";
export { buildDependencyGraph, traverseReachable } from "./graph";
export { extractModuleFacts, isSupportedModule } from "./extract";
export { resolveEntryPoints } from "./entry-points";
export { buildModuleResolutionIndex, resolveModuleSpecifier } from "./resolution";
export type * from "./types";
