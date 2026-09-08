import path from "node:path";
import ts from "typescript";

import { normalizeProjectPath } from "./paths.ts";
import type { ModuleFacts, ModuleResolutionIndex, PathAliasRule, SourceInput, WorkspacePackage } from "./types.ts";

const resolutionSuffixes = [
  "", ".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs",
  "/index.ts", "/index.tsx", "/index.mts", "/index.cts", "/index.js", "/index.jsx", "/index.mjs", "/index.cjs",
];

export function buildModuleResolutionIndex(files: SourceInput[]): ModuleResolutionIndex {
  const aliases: PathAliasRule[] = [];
  const workspacePackages = new Map<string, WorkspacePackage>();

  for (const file of files) {
    const filePath = normalizeProjectPath(file.path);
    if (/(?:^|\/)(?:tsconfig|jsconfig)(?:\.[^/]+)?\.json$/i.test(filePath)) {
      const parsed = ts.parseConfigFileTextToJson(filePath, file.content).config as {
        compilerOptions?: { baseUrl?: string; paths?: Record<string, string[]> };
      } | undefined;
      const configDirectory = path.posix.dirname(filePath) === "." ? "" : path.posix.dirname(filePath);
      const baseDirectory = normalizeProjectPath(path.posix.join(configDirectory, parsed?.compilerOptions?.baseUrl ?? "."));
      for (const [pattern, targets] of Object.entries(parsed?.compilerOptions?.paths ?? {})) {
        aliases.push({
          configFile: filePath,
          scopeDirectory: configDirectory,
          pattern,
          targets: targets.map((target) => normalizeProjectPath(path.posix.join(baseDirectory, target))),
        });
      }
    }

    if (path.posix.basename(filePath) === "package.json") {
      try {
        const manifest = JSON.parse(file.content) as Record<string, unknown>;
        if (typeof manifest.name !== "string" || !manifest.name) continue;
        const directory = path.posix.dirname(filePath) === "." ? "" : path.posix.dirname(filePath);
        const publicEntryPoints = packageTargets(manifest)
          .map((target) => normalizeProjectPath(path.posix.join(directory, target)));
        workspacePackages.set(manifest.name, { name: manifest.name, directory, publicEntryPoints });
      } catch {
        // Malformed manifests remain unavailable rather than producing guessed package edges.
      }
    }
  }

  aliases.sort((a, b) => b.scopeDirectory.length - a.scopeDirectory.length || a.pattern.localeCompare(b.pattern));
  return { aliases, workspacePackages };
}

export function resolveModuleSpecifier(input: {
  from: string;
  specifier: string | null;
  modules: Map<string, ModuleFacts>;
  index: ModuleResolutionIndex;
}) {
  const { from, specifier, modules, index } = input;
  if (!specifier) return null;
  if (specifier.startsWith(".")) {
    return resolveCandidate(normalizeProjectPath(path.posix.join(path.posix.dirname(from), specifier)), modules);
  }

  for (const alias of index.aliases) {
    if (alias.scopeDirectory && from !== alias.scopeDirectory && !from.startsWith(`${alias.scopeDirectory}/`)) continue;
    const wildcard = matchPattern(alias.pattern, specifier);
    if (wildcard === null) continue;
    for (const target of alias.targets) {
      const resolved = resolveCandidate(target.replace("*", wildcard), modules);
      if (resolved) return resolved;
    }
  }

  const workspace = findWorkspacePackage(specifier, index.workspacePackages);
  if (!workspace) return null;
  const subpath = specifier === workspace.name ? "" : specifier.slice(workspace.name.length + 1);
  if (subpath) return resolveCandidate(normalizeProjectPath(path.posix.join(workspace.directory, subpath)), modules);
  for (const target of workspace.publicEntryPoints) {
    const resolved = resolveCandidate(target, modules);
    if (resolved) return resolved;
  }
  return resolveCandidate(normalizeProjectPath(path.posix.join(workspace.directory, "index")), modules) ??
    resolveCandidate(normalizeProjectPath(path.posix.join(workspace.directory, "src/index")), modules);
}

export function isPotentialProjectSpecifier(specifier: string, index: ModuleResolutionIndex) {
  return specifier.startsWith(".") ||
    index.aliases.some((alias) => matchPattern(alias.pattern, specifier) !== null) ||
    findWorkspacePackage(specifier, index.workspacePackages) !== null;
}

function matchPattern(pattern: string, specifier: string) {
  const star = pattern.indexOf("*");
  if (star === -1) return pattern === specifier ? "" : null;
  const prefix = pattern.slice(0, star);
  const suffix = pattern.slice(star + 1);
  return specifier.startsWith(prefix) && specifier.endsWith(suffix)
    ? specifier.slice(prefix.length, specifier.length - suffix.length)
    : null;
}

function resolveCandidate(base: string, modules: Map<string, ModuleFacts>) {
  for (const suffix of resolutionSuffixes) {
    const candidate = `${base}${suffix}`;
    if (modules.has(candidate)) return candidate;
  }
  return null;
}

function findWorkspacePackage(specifier: string, packages: Map<string, WorkspacePackage>) {
  return [...packages.values()]
    .sort((a, b) => b.name.length - a.name.length)
    .find((workspace) => specifier === workspace.name || specifier.startsWith(`${workspace.name}/`)) ?? null;
}

function packageTargets(manifest: Record<string, unknown>) {
  const targets = new Set<string>();
  for (const field of [manifest.main, manifest.module, manifest.types, manifest.typings, manifest.bin, manifest.exports]) {
    collectTarget(field, targets);
  }
  return [...targets].filter((target) => target.startsWith("."));
}

function collectTarget(value: unknown, targets: Set<string>) {
  if (typeof value === "string") {
    targets.add(value);
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const nested of Object.values(value as Record<string, unknown>)) collectTarget(nested, targets);
}
