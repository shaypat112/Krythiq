import { normalizeProjectPath } from "./paths.ts";
import type { EntryPointEvidence, ModuleFacts, SourceInput } from "./types.ts";

const nextConvention = /^(?:src\/)?app\/(?:.+\/)?(?:page|layout|route|loading|error|not-found|template|default|global-error|sitemap|robots|manifest)\.[cm]?[jt]sx?$/;
const pagesConvention = /^(?:src\/)?pages\/(?!.*(?:\.test|\.spec)\.)[^/]+(?:\/[^/]+)*\.[cm]?[jt]sx?$/;
const toolingConvention = /^(?:next\.config|vite\.config|vitest\.config|jest\.config|playwright\.config|eslint\.config|tailwind\.config|postcss\.config|middleware|proxy)\.[cm]?[jt]s$/;
const testConvention = /(?:^|\/)(?:__tests__\/.*|.*\.(?:test|spec)\.[cm]?[jt]sx?)$/;

export function resolveEntryPoints(input: {
  modules: Map<string, ModuleFacts>;
  files: SourceInput[];
  explicit?: string[];
}) {
  const evidence = new Map<string, EntryPointEvidence>();
  const add = (entry: EntryPointEvidence) => {
    const file = normalizeProjectPath(entry.file);
    if (input.modules.has(file) && !evidence.has(file)) evidence.set(file, { ...entry, file });
  };

  for (const file of input.explicit ?? []) {
    add({ file, source: "user-config", reason: "Configured application entry point." });
  }

  const packageFile = input.files.find((file) => normalizeProjectPath(file.path) === "package.json");
  if (packageFile) {
    try {
      const manifest = JSON.parse(packageFile.content) as Record<string, unknown>;
      for (const candidate of packageTargets(manifest)) {
        add({ file: candidate, source: "package-manifest", reason: "Published or executable package target." });
      }
    } catch {
      // Manifest parse errors are reported by the inventory/security layers today.
    }
  }

  for (const file of input.modules.keys()) {
    if (nextConvention.test(file) || pagesConvention.test(file)) {
      add({ file, source: "framework", reason: "Next.js file-system convention." });
    } else if (toolingConvention.test(file)) {
      add({ file, source: "tooling", reason: "Tool or framework configuration executed outside the import graph." });
    } else if (testConvention.test(file)) {
      add({ file, source: "test", reason: "Test runner discovery convention." });
    }
  }

  return [...evidence.values()].sort((a, b) => a.file.localeCompare(b.file));
}

function packageTargets(manifest: Record<string, unknown>) {
  const targets = new Set<string>();
  collectTarget(manifest.main, targets);
  collectTarget(manifest.module, targets);
  collectTarget(manifest.types, targets);
  collectTarget(manifest.typings, targets);
  collectTarget(manifest.bin, targets);
  collectTarget(manifest.exports, targets);
  return [...targets];
}

function collectTarget(value: unknown, targets: Set<string>) {
  if (typeof value === "string" && value.startsWith(".")) {
    targets.add(value);
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const nested of Object.values(value as Record<string, unknown>)) collectTarget(nested, targets);
}
