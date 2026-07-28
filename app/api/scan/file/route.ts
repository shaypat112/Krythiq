import path from "path";
import { NextResponse } from "next/server";

import { securityRuleRegistry } from "@/app/lib/scanner/rules/registry";
import { RequestAuthError, requireRequestAuth } from "@/app/lib/server/supabaseRest";

export const runtime = "nodejs";

const MAX_FILE_BYTES = 1024 * 1024;
const LANGUAGE_BY_EXTENSION: Record<string, string> = {
  ".ts": "TypeScript", ".tsx": "TypeScript", ".js": "JavaScript", ".jsx": "JavaScript",
  ".py": "Python", ".go": "Go", ".rs": "Rust", ".java": "Java", ".cs": "C#",
  ".php": "PHP", ".rb": "Ruby", ".sh": "Shell", ".yml": "YAML", ".yaml": "YAML",
  ".json": "JSON",
};

export async function POST(request: Request) {
  try {
    requireRequestAuth(request);
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "Choose a file to scan." }, { status: 400 });
    if (file.size > MAX_FILE_BYTES) return NextResponse.json({ error: "Files must be 1 MB or smaller." }, { status: 413 });
    if (!/\.(?:tsx?|jsx?|py|go|rs|java|cs|php|rb|sh|ya?ml|json|txt)$/i.test(file.name)) {
      return NextResponse.json({ error: "Choose a supported source, config, or manifest file." }, { status: 400 });
    }
    const content = await file.text();
    if (content.includes("\u0000")) return NextResponse.json({ error: "Binary files are not supported." }, { status: 400 });

    const lines = content.split("\n");
    const findings = securityRuleRegistry.rules.flatMap((rule) =>
      [...content.matchAll(rule.pattern)].flatMap((match) => {
        const line = content.slice(0, match.index ?? 0).split("\n").length;
        const sourceLine = lines[line - 1]?.trim() ?? "";
        if (rule.validator && !rule.validator(match, sourceLine)) return [];
        return [{
          file: file.name, line, severity: rule.severity, score: rule.score, type: rule.id,
          message: rule.message, snippet: sourceLine, suggestion: rule.suggestion, source: "regex" as const,
          category: rule.category, confidence: "high" as const, advisoryId: rule.advisoryId,
          technicalDetails: `Matched Krythiq ruleset ${securityRuleRegistry.rulesetVersion}, rule ${rule.id}, in ${file.name}:${line}.`,
        }];
      }),
    );
    const extension = path.extname(file.name).toLowerCase();
    const language = LANGUAGE_BY_EXTENSION[extension] ?? (extension.replace(".", "").toUpperCase() || "Text");
    const dependencyNames = file.name === "package.json" ? extractPackageDependencies(content) : [];
    const technologies = [language, ...dependencyNames.filter((name) => /next|react|tailwind|supabase|prisma|three|express|stripe/i.test(name))];

    return NextResponse.json({
      sourceType: "file",
      repoUrl: file.name,
      totalFindings: findings.length,
      findings,
      profile: {
        metadata: { description: `Local analysis of ${file.name}. The file was processed for this request only.`, defaultBranch: "local", visibility: "local", stars: 0, forks: 0, openIssues: 0, sizeKb: Math.ceil(file.size / 1024), pushedAt: null },
        metrics: { repositoryFiles: 1, scannedFiles: 1, scannedLines: lines.length, scannedBytes: file.size, directories: 0 },
        languages: [{ name: language, bytes: file.size, files: 1, lines: lines.length, percent: 100 }],
        fileTypes: [{ name: extension || "text", files: 1, lines: lines.length }],
        largestFiles: [{ path: file.name, bytes: file.size, lines: lines.length }],
        manifests: /^(package\.json|requirements\.txt|go\.mod|Cargo\.toml)$/i.test(file.name) ? [file.name] : [],
        technologies: [...new Set(technologies)].slice(0, 24),
        dependencies: dependencyNames.slice(0, 60),
      },
      systemDesign: { summary: "System-design scenarios require a repository scan.", disclaimer: "A single-file scan cannot establish repository architecture or production capacity.", scenarios: [] },
      intelligence: null,
      scan: null,
    });
  } catch (error) {
    if (error instanceof RequestAuthError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to scan file." }, { status: 500 });
  }
}

function extractPackageDependencies(content: string) {
  try {
    const manifest = JSON.parse(content) as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
    return Object.keys({ ...manifest.dependencies, ...manifest.devDependencies });
  } catch {
    return [];
  }
}
