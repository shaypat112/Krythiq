import fs from "fs/promises";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import chalk from "chalk";
import ora from "ora";
import { glob } from "glob";

import { summarizeFindings as mistralSummarizeFindings } from "../lib/mistral";
import { renderReport, exceedsThreshold, SEVERITY_SCORE, type Finding, type Severity, type ReportFormat } from "../lib/scan-report.js";
import { writeReport } from "../utils/report-file.js";
import { loadConfig } from "../config.js";
import { publishDashboardScan } from "../utils/dashboard.js";

const execFileAsync = promisify(execFile);

interface ScanOptions {
  ci: boolean;
  ai?: boolean;
  aiModel?: string;
  failOn: Severity;
  format: ReportFormat;
  ignore: string[];
  publish?: boolean;
  rules?: string;
  save?: boolean;
  output?: string;
  overwrite?: boolean;
  semgrep?: boolean;
  audit?: boolean;
}

interface PatternCheck {
  pattern: RegExp;
  severity: Severity;
  type: string;
  message: string;
  suggestion?: string;
}

interface RulesFile {
  ignore?: string[];
  patterns?: Array<{
    pattern: string;
    flags?: string;
    severity: Severity;
    type: string;
    message: string;
    suggestion?: string;
  }>;
}

export async function scanCommand(
  scanPath: string = ".",
  options: ScanOptions
) {
  const { config, warnings } = await loadConfig();
  if (warnings.length) {
    for (const warning of warnings) {
      console.error(chalk.yellow(warning));
    }
  }

  const scanConfig = config.scan ?? {};
  const rulesPath =
    options.rules ||
    scanConfig.rules ||
    (await defaultRulesPath(process.cwd()));
  const rules = await loadRules(rulesPath);
  for (const warning of rules.warnings) {
    console.error(chalk.yellow(warning));
  }

  const resolved = path.resolve(process.cwd(), scanPath);

  const stat = await fs.stat(resolved).catch(() => null);
  if (!stat?.isDirectory()) {
    console.error(chalk.red(`Error: scan path is not a directory: ${scanPath}`));
    process.exitCode = 2;
    return;
  }

  if (options.format === "text") {
    console.log(`\n${chalk.bold("krythiq")} ${chalk.dim("scan")}\n`);
  }

  const ignore = [
    "node_modules/**",
    ".git/**",
    ".next/**",
    "dist/**",
    "build/**",
    "**/*.min.js",
    ...(scanConfig.ignore ?? []),
    ...(rules.ignore ?? []),
    ...(options.ignore ?? [])
  ];

  const aiEnabled =
    options.ai ||
    scanConfig.ai ||
    process.env.KRYTHIQ_SCAN_AI === "true";
  const aiModel =
    options.aiModel ||
    scanConfig.aiModel ||
    process.env.KRYTHIQ_SCAN_AI_MODEL ||
    "mistral-large-latest";

  const publishEnabled =
    options.publish ||
    scanConfig.publish ||
    process.env.KRYTHIQ_PUBLISH === "true";

  const files = await discoverFiles(resolved, ignore);

  const rulesFindings = await scanFiles(files, {
    ...options,
    aiModel,
    extraPatterns: rules.patterns,
  });
  const engineResult = await runSecurityEngines(resolved, options);
  for (const warning of engineResult.warnings) console.error(chalk.yellow(warning));
  const findings = [...rulesFindings, ...engineResult.findings];

  const deduped = dedupe(findings);
  const aiSummary =
    aiEnabled && deduped.length > 0
      ? await mistralSummarizeFindings(deduped, aiModel)
      : null;

  const output = renderReport(deduped, options.format, aiSummary);
  if (options.output) {
    try {
      await writeReport(options.output, output, options.overwrite);
      console.error(`Report saved to ${options.output}`);
    } catch (error) {
      console.error(`Unable to save report: ${error instanceof Error ? error.message : String(error)}`);
      process.exitCode = 2;
      return;
    }
  }
  process.stdout.write(output);

  if (options.save) {
    const repo = await inferRepoSlug(resolved);
    const summary = summarizeFindings(deduped);
    try {
      await publishDashboardScan({ repository: repo, severity: summary.severity, score: summary.avgScore, findings: deduped });
      console.error(`${chalk.green("✓")} Saved to Krythiq Dashboard\n`);
    } catch (error) {
      console.error(chalk.yellow(`Scan was not saved: ${error instanceof Error ? error.message : "upload failed"}\n`));
    }
  }

  if (publishEnabled) {
    await publishScanSummary(deduped);
  }

  if (options.ci && exceedsThreshold(deduped, options.failOn)) process.exitCode = 1;
}

async function discoverFiles(root: string, ignore: string[]) {
  const spinner = ora("Discovering files").start();

  const files = await glob("**/*.{ts,tsx,js,jsx,py,go,rs,java,cs,php}", {
    cwd: root,
    ignore,
    absolute: true
  });

  spinner.succeed(`Found ${chalk.cyan(files.length)} files`);

  return files;
}

async function scanFiles(
  files: string[],
  options: ScanOptions & { extraPatterns?: PatternCheck[] }
) {
  const spinner = ora("Scanning").start();

  const findings: Finding[] = [];
  const checks = options.extraPatterns ?? [];

  let index = 0;

  for (const file of files) {
    index++;

    spinner.text = `Scanning ${index}/${files.length}`;

    let content: string;

    try {
      content = await fs.readFile(file, "utf8");
    } catch {
      continue;
    }

    const lines = content.split("\n");

    for (const check of checks) {
      const matches = [...content.matchAll(check.pattern)];

      for (const match of matches) {
        const line = content.slice(0, match.index).split("\n").length;

        findings.push({
          file: path.relative(process.cwd(), file),
          line,
          severity: check.severity,
          score: SEVERITY_SCORE[check.severity],
          type: check.type,
          message: check.message,
          snippet: lines[line - 1]?.trim(),
          suggestion: check.suggestion,
          source: "rules"
        });
      }
    }

  }

  spinner.succeed(`Scanned ${files.length} files`);

  return findings;
}

async function runSecurityEngines(root: string, options: ScanOptions): Promise<{ findings: Finding[]; warnings: string[] }> {
  const [semgrep, npmAudit] = await Promise.all([options.semgrep === false ? { findings: [], warnings: [] } : runSemgrep(root), options.audit === false ? { findings: [], warnings: [] } : runNpmAudit(root)]);
  return { findings: [...semgrep.findings, ...npmAudit.findings], warnings: [...semgrep.warnings, ...npmAudit.warnings] };
}

async function runSemgrep(root: string): Promise<{ findings: Finding[]; warnings: string[] }> {
  try {
    const { stdout } = await execFileAsync("semgrep", ["scan", "--config", "auto", "--json", "--quiet", root], { maxBuffer: 20 * 1024 * 1024, timeout: 120_000 });
    return parseSemgrep(stdout, root);
  } catch (error) {
    const output = typeof error === "object" && error && "stdout" in error ? String((error as { stdout?: unknown }).stdout ?? "") : "";
    if (output) return parseSemgrep(output, root);
    return { findings: [], warnings: ["Semgrep is unavailable; install Semgrep or provide .krythiq/rules.json for code-rule scanning."] };
  }
}

function parseSemgrep(output: string, root: string): { findings: Finding[]; warnings: string[] } {
  try {
    const payload = JSON.parse(output) as { results?: Array<{ check_id?: string; path?: string; start?: { line?: number }; extra?: { severity?: string; message?: string; lines?: string; metadata?: { confidence?: string; remediation?: string } } }> };
    const findings = (payload.results ?? []).map((result): Finding => {
      const severity = normalizeSeverity(result.extra?.severity);
      return { file: path.relative(process.cwd(), result.path ?? root), line: result.start?.line ?? 1, severity, score: SEVERITY_SCORE[severity], type: result.check_id ?? "SEMGREP", message: result.extra?.message ?? "Semgrep finding", snippet: result.extra?.lines?.trim(), suggestion: result.extra?.metadata?.remediation, source: "semgrep" };
    });
    return { findings, warnings: [] };
  } catch { return { findings: [], warnings: ["Semgrep returned unreadable output; no Semgrep findings were accepted."] }; }
}

async function runNpmAudit(root: string): Promise<{ findings: Finding[]; warnings: string[] }> {
  if (!(await exists(path.join(root, "package-lock.json")))) return { findings: [], warnings: [] };
  try {
    const { stdout } = await execFileAsync("npm", ["audit", "--json", "--omit=dev"], { cwd: root, maxBuffer: 20 * 1024 * 1024, timeout: 120_000 });
    return parseNpmAudit(stdout);
  } catch (error) {
    const output = typeof error === "object" && error && "stdout" in error ? String((error as { stdout?: unknown }).stdout ?? "") : "";
    if (output) return parseNpmAudit(output);
    return { findings: [], warnings: ["npm audit could not run; dependency vulnerability checks were skipped."] };
  }
}

function parseNpmAudit(output: string): { findings: Finding[]; warnings: string[] } {
  try {
    const payload = JSON.parse(output) as { vulnerabilities?: Record<string, { severity?: string; via?: Array<{ title?: string; url?: string }> }> };
    const findings = Object.entries(payload.vulnerabilities ?? {}).map(([name, vulnerability]): Finding => {
      const severity = normalizeSeverity(vulnerability.severity);
      const advisory = vulnerability.via?.find((item) => typeof item === "object");
      return { file: "package-lock.json", line: 1, severity, score: SEVERITY_SCORE[severity], type: `NPM_AUDIT_${name.toUpperCase().replace(/[^A-Z0-9]/g, "_")}`, message: advisory?.title ?? `npm audit reported a vulnerability in ${name}`, suggestion: advisory?.url, source: "npm-audit" };
    });
    return { findings, warnings: [] };
  } catch { return { findings: [], warnings: ["npm audit returned unreadable output; no dependency findings were accepted."] }; }
}

function normalizeSeverity(value?: string): Severity {
  return value === "critical" || value === "high" || value === "medium" || value === "low" ? value : "medium";
}

async function defaultRulesPath(cwd: string): Promise<string | undefined> {
  const p = path.join(cwd, ".krythiq", "rules.json");
  return (await exists(p)) ? p : undefined;
}

async function loadRules(rulesPath?: string) {
  const warnings: string[] = [];
  if (!rulesPath) {
    return { patterns: [] as PatternCheck[], ignore: [] as string[], warnings };
  }

  const absolute = path.isAbsolute(rulesPath)
    ? rulesPath
    : path.join(process.cwd(), rulesPath);

  if (!(await exists(absolute))) {
    warnings.push(`Rules file not found: ${rulesPath}`);
    return { patterns: [] as PatternCheck[], ignore: [] as string[], warnings };
  }

  try {
    const raw = await fs.readFile(absolute, "utf8");
    const data = JSON.parse(raw) as RulesFile;
    const patterns: PatternCheck[] = [];

    for (const rule of data.patterns ?? []) {
      if (typeof rule.pattern !== "string" || !rule.pattern || !Object.prototype.hasOwnProperty.call(SEVERITY_SCORE, rule.severity) || typeof rule.type !== "string" || !rule.type || typeof rule.message !== "string" || !rule.message) {
        warnings.push(`Invalid rule in ${rulesPath} — invalid pattern, severity, type, or message.`);
        continue;
      }
      try {
        patterns.push({
          pattern: new RegExp(
            rule.pattern,
            rule.flags?.includes("g") ? rule.flags : `${rule.flags ?? ""}g`,
          ),
          severity: rule.severity,
          type: rule.type,
          message: rule.message,
          suggestion: rule.suggestion,
        });
      } catch {
        warnings.push(`Invalid regex in ${rulesPath}: ${rule.pattern}`);
      }
    }

    return {
      patterns,
      ignore: data.ignore ?? [],
      warnings,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    warnings.push(`Failed to parse ${rulesPath}: ${message}`);
    return { patterns: [] as PatternCheck[], ignore: [] as string[], warnings };
  }
}

function dedupe(findings: Finding[]) {
  const map = new Map<string, Finding>();

  for (const f of findings) {
    const key = `${f.file}:${f.line}:${f.type}`;
    if (!map.has(key)) map.set(key, f);
  }

  return [...map.values()].sort(
    (a, b) => SEVERITY_SCORE[b.severity] - SEVERITY_SCORE[a.severity]
  );
}

async function publishScanSummary(
  findings: Finding[],
  options?: { repoOverride?: string }
) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
  const accessToken = process.env.SUPABASE_ACCESS_TOKEN;

  if (!supabaseUrl || !supabaseAnonKey || !accessToken) {
    console.error(
      chalk.yellow(
        "\nPublish skipped: SUPABASE_URL, SUPABASE_ANON_KEY, and SUPABASE_ACCESS_TOKEN are required.\n"
      )
    );
    return;
  }

  const repo = options?.repoOverride || (await inferRepoSlug(process.cwd()));
  const { total, severity, avgScore } = summarizeFindings(findings);
  const userId = decodeUserId(accessToken);

  const payload: Record<string, unknown> = {
    repo,
    created_at: new Date().toISOString(),
    severity,
    issues: total,
    score: avgScore,
    findings: { list: findings },
  };

  if (userId) payload.user_id = userId;

  const spinner = ora("Publishing scan summary...").start();

  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/scan_history`, {
      method: "POST",
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      spinner.fail(`Publish failed: HTTP ${res.status}`);
      return;
    }

    spinner.succeed("Published scan summary");
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    spinner.fail(`Publish failed: ${message}`);
  }
}

function summarizeFindings(findings: Finding[]) {
  const total = findings.length;
  const maxScore = findings.reduce((max, item) => Math.max(max, item.score), 0);
  const severity =
    findings.find((item) => item.score === maxScore)?.severity ?? "low";
  const avgScore =
    total > 0
      ? Math.round(findings.reduce((sum, item) => sum + item.score, 0) / total)
      : 0;
  return { total, severity, avgScore };
}

function decodeUserId(token: string): string | null {
  try {
    const [, payload] = token.split(".");
    if (!payload) return null;
    const json = Buffer.from(payload, "base64url").toString("utf8");
    const data = JSON.parse(json) as { sub?: string; user_id?: string };
    return data.sub ?? data.user_id ?? null;
  } catch {
    return null;
  }
}

async function inferRepoSlug(cwd: string): Promise<string> {
  const gitConfigPath = path.join(cwd, ".git", "config");
  if (await exists(gitConfigPath)) {
    try {
      const content = await fs.readFile(gitConfigPath, "utf8");
      const match = content.match(/\[remote "origin"\][^\[]*?url = (.+)/);
      if (match?.[1]) {
        const url = match[1].trim();
        const slug = parseRepoSlug(url);
        if (slug) return slug;
      }
    } catch {
      // ignore parsing errors
    }
  }
  return path.basename(cwd);
}

function parseRepoSlug(remoteUrl: string): string | null {
  if (remoteUrl.startsWith("git@")) {
    const match = remoteUrl.match(/:(.+?)(\.git)?$/);
    return match?.[1] ?? null;
  }

  try {
    const url = new URL(remoteUrl);
    const slug = url.pathname.replace(/^\/+/, "").replace(/\.git$/, "");
    return slug || null;
  } catch {
    return null;
  }
}

async function exists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}
