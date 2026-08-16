import Conf from "conf";

type DashboardConfig = { dashboardToken?: string; dashboardUrl?: string };

function store() {
  return new Conf<DashboardConfig>({ projectName: "krythiq" });
}

export function dashboardUrl() {
  return (process.env.KRYTHIQ_DASHBOARD_URL || store().get("dashboardUrl") || "https://krythiq.dev").replace(/\/$/, "");
}

export function dashboardToken() {
  return process.env.KRYTHIQ_CLI_TOKEN || store().get("dashboardToken");
}

export function saveDashboardConnection(token: string, url: string) {
  const config = store();
  config.set("dashboardToken", token);
  config.set("dashboardUrl", url.replace(/\/$/, ""));
}

export function clearDashboardConnection() {
  const config = store();
  config.delete("dashboardToken");
  config.delete("dashboardUrl");
}

export async function loadDashboardAccount() {
  const token = dashboardToken();
  if (!token) return null;
  const response = await fetch(`${dashboardUrl()}/api/cli/account`, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(15_000) });
  if (!response.ok) throw new Error(response.status === 401 ? "CLI connection expired. Run krythiq connect again." : `Dashboard returned HTTP ${response.status}.`);
  return response.json() as Promise<{
    connected: boolean;
    balance: number;
    profile: { username: string | null; fullName: string | null; email: string | null };
    cli: { scanCount: number; tokensUsed: number };
  }>;
}

export async function publishDashboardScan(payload: { repository: string; severity: string; score: number; findings: unknown[] }) {
  const token = dashboardToken();
  if (!token) return null;
  const response = await fetch(`${dashboardUrl()}/api/cli/scans`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ ...payload, cliVersion: "0.2.1" }), signal: AbortSignal.timeout(20_000) });
  if (!response.ok) throw new Error(response.status === 401 ? "CLI connection expired. Run krythiq connect again." : `Dashboard upload returned HTTP ${response.status}.`);
  return response.json();
}
