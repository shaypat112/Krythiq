import path from "node:path";

import { normalizeProjectPath } from "./paths.ts";
import type { DependencyGraph, ModuleFacts, ResolvedModuleEdge } from "./types.ts";

const resolutionSuffixes = [
  "", ".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs",
  "/index.ts", "/index.tsx", "/index.mts", "/index.cts", "/index.js", "/index.jsx", "/index.mjs", "/index.cjs",
];

export function buildDependencyGraph(facts: ModuleFacts[]): DependencyGraph {
  const modules = new Map(facts.map((fact) => [fact.path, fact]));
  const outgoing = new Map<string, ResolvedModuleEdge[]>();
  const incoming = new Map<string, ResolvedModuleEdge[]>();
  const diagnostics = facts.flatMap((fact) => fact.diagnostics);

  for (const fact of facts) {
    const resolvedEdges = fact.edges.map((edge): ResolvedModuleEdge => {
      const to = resolveProjectModule(fact.path, edge.specifier, modules);
      if (edge.specifier && isProjectSpecifier(edge.specifier) && !to) {
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

function isProjectSpecifier(specifier: string) {
  return specifier.startsWith(".") || specifier.startsWith("@/");
}

function resolveProjectModule(from: string, specifier: string | null, modules: Map<string, ModuleFacts>) {
  if (!specifier || !isProjectSpecifier(specifier)) return null;
  const base = specifier.startsWith("@/")
    ? normalizeProjectPath(specifier.slice(2))
    : normalizeProjectPath(path.posix.join(path.posix.dirname(from), specifier));
  for (const suffix of resolutionSuffixes) {
    const candidate = `${base}${suffix}`;
    if (modules.has(candidate)) return candidate;
  }
  return null;
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
