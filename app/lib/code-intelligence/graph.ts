import { isPotentialProjectSpecifier, resolveModuleSpecifier } from "./resolution.ts";
import type { DependencyGraph, ModuleFacts, ModuleResolutionIndex, ResolvedModuleEdge } from "./types.ts";

export function buildDependencyGraph(facts: ModuleFacts[], resolution: ModuleResolutionIndex): DependencyGraph {
  const modules = new Map(facts.map((fact) => [fact.path, fact]));
  const outgoing = new Map<string, ResolvedModuleEdge[]>();
  const incoming = new Map<string, ResolvedModuleEdge[]>();
  const diagnostics = facts.flatMap((fact) => fact.diagnostics);

  for (const fact of facts) {
    const resolvedEdges = fact.edges.map((edge): ResolvedModuleEdge => {
      const to = resolveModuleSpecifier({ from: fact.path, specifier: edge.specifier, modules, index: resolution });
      if (edge.specifier && isPotentialProjectSpecifier(edge.specifier, resolution) && !to) {
        diagnostics.push({
          code: "unresolved-import",
          file: fact.path,
          line: edge.line,
          message: `Could not resolve project import ${JSON.stringify(edge.specifier)}.`,
        });
      }
      return { ...edge, from: fact.path, to };
    });
    outgoing.set(fact.path, resolvedEdges);
    for (const edge of resolvedEdges) {
      if (!edge.to) continue;
      const consumers = incoming.get(edge.to) ?? [];
      consumers.push(edge);
      incoming.set(edge.to, consumers);
    }
  }

  return { modules, outgoing, incoming, diagnostics };
}

export function traverseReachable(graph: DependencyGraph, roots: Iterable<string>) {
  const reachable = new Set<string>();
  const pending = [...roots].filter((root) => graph.modules.has(root)).sort().reverse();
  while (pending.length) {
    const current = pending.pop()!;
    if (reachable.has(current)) continue;
    reachable.add(current);
    const targets = (graph.outgoing.get(current) ?? [])
      .flatMap((edge) => edge.to ? [edge.to] : [])
      .sort()
      .reverse();
    pending.push(...targets);
  }
  return reachable;
}
