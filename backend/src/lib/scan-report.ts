import chalk from "chalk";

export type Severity = "low" | "medium" | "high" | "critical";
export type ReportFormat = "text" | "json" | "markdown" | "sarif";
export interface Finding {
  file: string;
  line: number;
  severity: Severity;
  score: number;
  type: string;
  message: string;
  snippet?: string;
  suggestion?: string;
  source: "rules" | "semgrep" | "npm-audit" | "ai";
}
export const SEVERITY_SCORE: Record<Severity, number> = { low: 30, medium: 55, high: 75, critical: 90 };
export function exceedsThreshold(findings: Finding[], severity: Severity) {
  return findings.some(finding => SEVERITY_SCORE[finding.severity] >= SEVERITY_SCORE[severity]);
}

function cell(value: string | number) {
  return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\|/g, "\\|").replace(/[\r\n]+/g, " ");
}

export function renderReport(findings: Finding[], format: ReportFormat, aiSummary: string | null = null): string {
  if (format === "json") return JSON.stringify({ findings, aiSummary }, null, 2) + "\n";
  if (format === "sarif") return JSON.stringify(toSarif(findings), null, 2) + "\n";
  if (format === "markdown") {
    const rows = findings.map(f => `| ${[f.severity, f.file, f.line, f.type, f.message].map(cell).join(" | ")} |`);
    return ["# Krythiq Scan Report", "", "| Severity | File | Line | Type | Message |", "|---|---|---|---|---|", ...rows, ...(aiSummary ? ["", "## AI Summary", "", aiSummary] : []), ""].join("\n");
  }
  const tones = { low: chalk.blue, medium: chalk.yellow, high: chalk.red, critical: chalk.bgRed.white };
  const rows = findings.flatMap(f => [
    `${tones[f.severity](`[${f.severity.toUpperCase()}]`)} ${f.type} (${f.score}) ${f.file}:${f.line}`,
    `  ${f.message}`,
    ...(f.snippet ? [`  → ${f.snippet}`] : []),
    ...(f.suggestion ? [`  fix ${f.suggestion}`] : []), "",
  ]);
  return [...rows, findings.length ? `${findings.length} issue(s) detected` : "No issues found in the checks that ran.", ...(aiSummary ? ["", "AI summary", aiSummary] : []), ""].join("\n");
}

export function parseScanReport(value: unknown): { findings: Finding[]; aiSummary: string | null } {
  if (!value || typeof value !== "object" || !("findings" in value) || !Array.isArray(value.findings) || value.findings.length > 100_000) {
    throw new Error("Expected a Krythiq JSON report with a findings array (at most 100,000 findings).");
  }
  const findings = value.findings as unknown[];
  const sources = ["rules", "semgrep", "npm-audit", "ai"];
  for (const [index, finding] of findings.entries()) {
    const f = finding as Partial<Finding> | null;
    if (!f || typeof f !== "object" || typeof f.file !== "string" || !f.file ||
      !Number.isInteger(f.line) || Number(f.line) < 1 || typeof f.severity !== "string" || !Object.prototype.hasOwnProperty.call(SEVERITY_SCORE, f.severity) ||
      typeof f.score !== "number" || !Number.isFinite(f.score) || f.score < 0 || f.score > 100 ||
      typeof f.type !== "string" || !f.type || typeof f.message !== "string" ||
      typeof f.source !== "string" || !sources.includes(f.source) ||
      (f.snippet !== undefined && typeof f.snippet !== "string") ||
      (f.suggestion !== undefined && typeof f.suggestion !== "string")) {
      throw new Error(`Invalid finding at index ${index}; expected file, positive line, severity, score, type, message, and source.`);
    }
  }
  const summary = "aiSummary" in value ? value.aiSummary : null;
  if (summary !== null && typeof summary !== "string") throw new Error("aiSummary must be a string or null.");
  return { findings: findings as Finding[], aiSummary: summary };
}

function toSarif(findings: Finding[]) {
  const rules: Array<{
    id: string;
    name: string;
    shortDescription: { text: string };
    properties?: Record<string, unknown>;
  }> = [];
  const ruleIndex = new Map<string, number>();

  for (const f of findings) {
    if (ruleIndex.has(f.type)) continue;
    ruleIndex.set(f.type, rules.length);
    rules.push({
      id: f.type,
      name: f.type,
      shortDescription: { text: f.message },
      properties: { severity: f.severity, score: f.score },
    });
  }

  const results = findings.map((f) => ({
    ruleId: f.type,
    level: sarifLevel(f.severity),
    message: { text: f.message },
    locations: [
      {
        physicalLocation: {
          artifactLocation: { uri: f.file },
          region: { startLine: Math.max(1, f.line) },
        },
      },
    ],
    properties: { severity: f.severity, score: f.score },
  }));

  return {
    $schema:
      "https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json",
    version: "2.1.0",
    runs: [
      {
        tool: {
          driver: {
            name: "krythiq",
            informationUri: "https://krythiq.dev",
            rules,
          },
        },
        results,
      },
    ],
  };
}

function sarifLevel(severity: Severity) {
  switch (severity) {
    case "critical":
    case "high":
      return "error";
    case "medium":
      return "warning";
    default:
      return "note";
  }
}
