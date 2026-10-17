import fs from "fs/promises";
import { parseScanReport, renderReport, exceedsThreshold, SEVERITY_SCORE, type Severity, type ReportFormat } from "../lib/scan-report.js";
import { writeReport } from "../utils/report-file.js";

interface ReportOptions {
  format: ReportFormat;
  minSeverity: Severity;
  ci?: boolean;
  failOn: Severity;
  output?: string;
  overwrite?: boolean;
}

export async function reportCommand(file: string, options: ReportOptions) {
  try {
    const handle = await fs.open(file, "r");
    let raw: string;
    try {
      const stat = await handle.stat();
      if (!stat.isFile() || stat.size > 20 * 1024 * 1024) throw new Error("Report must be a regular JSON file no larger than 20 MiB.");
      raw = await handle.readFile("utf8");
    } finally { await handle.close(); }
    const report = parseScanReport(JSON.parse(raw));
    const findings = report.findings.filter(f => SEVERITY_SCORE[f.severity] >= SEVERITY_SCORE[options.minSeverity]);
    const output = renderReport(findings, options.format, report.aiSummary);
    if (options.output) await writeReport(options.output, output, options.overwrite);
    process.stdout.write(output);
    // Filters affect the displayed report; CI always evaluates the original evidence.
    if (options.ci && exceedsThreshold(report.findings, options.failOn)) process.exitCode = 1;
  } catch (error) {
    console.error(`Unable to read or write report: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 2;
  }
}
