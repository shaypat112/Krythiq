export type ScanTier = "low" | "mid" | "high";

const lowChecks = [
  "Known package dependency vulnerabilities",
  "Exposed API keys, passwords, and secrets",
  "Dangerous environment and credential files",
  "Basic insecure code patterns",
  "Short risk summary",
] as const;

const midChecks = [
  ...lowChecks,
  "Authentication and authorization logic",
  "Database queries and API routes",
  "Weak input validation",
  "Security configuration files",
  "GitHub Actions and dependency files",
  "File locations and recommended fixes",
] as const;

export const scanLevelConfig = {
  low: {
    label: "Low Scan",
    cost: 30,
    action: "scan_low",
    maxFiles: 100,
    summaryMode: "short",
    checks: lowChecks,
    ruleIds: ["EVAL", "CMD_INJECTION", "HARDCODED_SECRET", "TRACKED_ENV_FILE"],
  },
  mid: {
    label: "Medium Scan",
    cost: 50,
    action: "scan_mid",
    maxFiles: 250,
    summaryMode: "detailed",
    checks: midChecks,
    ruleIds: [
      "EVAL", "CMD_INJECTION", "HARDCODED_SECRET", "WEAK_CRYPTO",
      "INSECURE_RANDOMNESS", "TLS_VALIDATION_DISABLED",
      "TLS_VALIDATION_DISABLED_PYTHON", "UNSAFE_DESERIALIZATION",
      "SHELL_INJECTION", "XSS_RISK", "DOM_XSS_RISK", "SQL_INJECTION",
      "AUTH_METADATA_TRUST", "PERMISSIVE_CORS",
    ],
  },
  high: {
    label: "High Scan",
    cost: 70,
    action: "scan_high",
    maxFiles: 500,
    summaryMode: "complete",
    checks: [
      ...midChecks,
      "Deep frontend, backend, infrastructure, Docker, CI/CD, and database review",
      "Injection, XSS, SSRF, permissions, data leaks, and business-logic risks",
      "Cross-file vulnerability tracing",
      "Severity prioritization",
      "Complete report with explanations and remediation",
    ],
    ruleIds: null,
  },
} as const;

export function readScanTier(value: unknown): ScanTier | null {
  return value === "low" || value === "mid" || value === "high" ? value : null;
}
