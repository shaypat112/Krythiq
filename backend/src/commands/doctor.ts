import fs from "fs/promises";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import { loadConfig } from "../config.js";

const execFileAsync = promisify(execFile);
type Check = { name: string; status: "pass" | "warn" | "fail"; detail: string };

async function installed(command: string) {
  try {
    await execFileAsync(command, ["--version"], {
      timeout: 5000, maxBuffer: 64 * 1024,
      env: { ...process.env, SEMGREP_ENABLE_VERSION_CHECK: "0", SEMGREP_SEND_METRICS: "off" },
    });
    return true;
  } catch { return false; }
}

export async function doctorCommand(directory: string = ".", options: { format: "text" | "json"; strict?: boolean }) {
  const root = path.resolve(directory);
  const checks: Check[] = [];
  const [major, minor] = process.versions.node.split(".").map(Number);
  const nodeOk = major > 22 || (major === 22 && minor >= 13);
  checks.push({ name: "Node.js", status: nodeOk ? "pass" : "fail", detail: nodeOk ? process.version : "Node.js 22.13 or newer is required." });
  const stat = await fs.stat(root).catch(() => null);
  checks.push({ name: "Project directory", status: stat?.isDirectory() ? "pass" : "fail", detail: stat?.isDirectory() ? root : "Choose an existing project directory." });
  if (stat?.isDirectory()) {
    const [semgrep, npm, git, loaded] = await Promise.all([installed("semgrep"), installed("npm"), installed("git"), loadConfig(root)]);
    checks.push({ name: "Configuration", status: loaded.warnings.length ? "fail" : loaded.source ? "pass" : "warn", detail: loaded.warnings.length ? "Configuration could not be loaded cleanly. Run a scan locally to inspect the config warning." : loaded.source ? path.relative(root, loaded.source) : "No configuration found. Run krythiq init in this directory." });
    checks.push({ name: "Semgrep", status: semgrep ? "pass" : "warn", detail: semgrep ? "Available for code scanning." : "Install Semgrep or configure custom rules for code scanning." });
    const lockfile = await fs.access(path.join(root, "package-lock.json")).then(() => true, () => false);
    checks.push({ name: "npm audit", status: lockfile && !npm ? "warn" : "pass", detail: !lockfile ? "No package-lock.json; npm audit is not applicable." : npm ? "npm and package-lock.json available; audit requires registry access." : "Install npm to check lockfile vulnerabilities." });
    checks.push({ name: "Git", status: git ? "pass" : "warn", detail: git ? "Available." : "Git is not available on PATH." });
    checks.push({ name: "Optional AI credentials", status: "pass", detail: `Environment keys: Anthropic ${process.env.ANTHROPIC_API_KEY ? "present" : "absent"}, Mistral ${process.env.MISTRAL_API_KEY ? "present" : "absent"}. Stored credentials and network access are not tested.` });
  }
  const ok = !checks.some(check => check.status === "fail" || (options.strict && check.status === "warn"));
  if (options.format === "json") console.log(JSON.stringify({ ok, checks }, null, 2));
  else {
    console.log("Krythiq setup diagnostics\n");
    for (const check of checks) console.log(`[${check.status.toUpperCase()}] ${check.name}: ${check.detail}`);
    console.log("\nLocal setup check only; no scan, credential validation, or dashboard request was performed.");
  }
  if (!ok) process.exitCode = 1;
}
