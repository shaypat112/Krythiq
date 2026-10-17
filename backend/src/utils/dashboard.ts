import Conf from "conf";
import packageMetadata from "../../package.json";

type DashboardSession = { accessToken: string; url: string; refreshToken?: string; expiresAt?: string; refreshExpiresAt?: string };
type DashboardConfig = { dashboardSession?: DashboardSession; dashboardToken?: string; dashboardUrl?: string };
const store = () => new Conf<DashboardConfig>({ projectName: "krythiq", configFileMode: 0o600, ...(process.env.KRYTHIQ_CONFIG_DIR ? { cwd: process.env.KRYTHIQ_CONFIG_DIR } : {}) });

function normalizeDashboardUrl(value: string) {
  const url = new URL(value);
  const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if ((url.protocol !== "https:" && !(url.protocol === "http:" && loopback)) || url.username || url.password || url.search || url.hash || url.pathname !== "/") {
    throw new Error("Dashboard URL must be an HTTPS origin, or HTTP localhost for development.");
  }
  // Resolve the known production redirect before attaching Authorization.
  if (url.origin === "https://krythiq.dev") return "https://www.krythiq.dev";
  return url.origin;
}

function savedSession(): DashboardSession | undefined {
  const config = store();
  const current = config.get("dashboardSession");
  if (current) return current;
  const accessToken = config.get("dashboardToken");
  return accessToken ? { accessToken, url: config.get("dashboardUrl") || "https://krythiq.dev" } : undefined;
}

export function dashboardUrl() {
  return normalizeDashboardUrl(process.env.KRYTHIQ_DASHBOARD_URL || savedSession()?.url || "https://krythiq.dev");
}

function connection(): DashboardSession | undefined {
  const url = dashboardUrl();
  if (process.env.KRYTHIQ_CLI_TOKEN) return { accessToken: process.env.KRYTHIQ_CLI_TOKEN, url };
  const session = savedSession();
  if (session && normalizeDashboardUrl(session.url) !== url) throw new Error("Saved CLI credentials belong to a different dashboard. Run krythiq connect for this URL first.");
  return session ? { ...session, url } : undefined;
}

export function saveDashboardConnection(token: string, url: string, details: { refreshToken?: string; expiresAt?: string; refreshExpiresAt?: string } = {}) {
  const config = store();
  // One atomic Conf write keeps access/refresh credentials and their issuer together.
  config.set("dashboardSession", { accessToken: token, url: normalizeDashboardUrl(url), ...details });
  config.delete("dashboardToken");
  config.delete("dashboardUrl");
}

function clearDashboardConnection() {
  const config = store();
  config.delete("dashboardSession");
  config.delete("dashboardToken");
  config.delete("dashboardUrl");
}

const refreshes = new Map<string, Promise<DashboardSession>>();
async function refresh(session: DashboardSession): Promise<DashboardSession> {
  if (!session.refreshToken || process.env.KRYTHIQ_CLI_TOKEN) throw new Error("This credential cannot renew automatically. Run krythiq connect again, or replace KRYTHIQ_CLI_TOKEN.");
  const key = session.refreshToken;
  const pending = refreshes.get(key);
  if (pending) return pending;
  const task = (async () => {
    const response = await fetch(`${session.url}/api/cli/session`, { method: "POST", redirect: "error", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ refreshToken: session.refreshToken }), signal: AbortSignal.timeout(15_000) });
    if (response.status === 401) {
      if (savedSession()?.refreshToken === session.refreshToken) clearDashboardConnection();
      throw new Error("CLI session expired or was revoked. Run krythiq connect again.");
    }
    if (!response.ok) throw new Error(`Session renewal is temporarily unavailable (HTTP ${response.status}). Your saved connection was retained; try again.`);
    const payload = await response.json() as { accessToken?: string; expiresAt?: string; refreshExpiresAt?: string };
    if (!payload.accessToken?.startsWith("kry_cli_") || !payload.expiresAt || (!Number.isFinite(Date.parse(payload.expiresAt)) || Date.parse(payload.expiresAt) <= Date.now())) throw new Error("Dashboard returned an invalid renewal response. Your connection was retained.");
    const updated: DashboardSession = { ...session, accessToken: payload.accessToken, expiresAt: payload.expiresAt, refreshExpiresAt: payload.refreshExpiresAt ?? session.refreshExpiresAt };
    // Do not resurrect a session removed/replaced while the request was running.
    if (savedSession()?.refreshToken === session.refreshToken) saveDashboardConnection(updated.accessToken, updated.url, { refreshToken: updated.refreshToken, expiresAt: updated.expiresAt, refreshExpiresAt: updated.refreshExpiresAt });
    return updated;
  })();
  refreshes.set(key, task);
  try { return await task; } finally { refreshes.delete(key); }
}

export async function refreshDashboardConnection() {
  const session = connection();
  if (!session) throw new Error("Not connected. Run krythiq connect first.");
  return refresh(session);
}

async function dashboardRequest(route: string, init: RequestInit = {}) {
  let session = connection();
  if (!session) return null;
  if (session.refreshToken && (!session.expiresAt || Date.parse(session.expiresAt) <= Date.now() + 60_000)) session = await refresh(session);
  const send = (credential: DashboardSession) => fetch(`${credential.url}${route}`, { ...init, redirect: "error", headers: { ...init.headers, Authorization: `Bearer ${credential.accessToken}` }, signal: AbortSignal.timeout(route.startsWith("/api/ai/") ? 120_000 : 20_000) });
  let response = await send(session);
  if (response.status === 401 && session.refreshToken) {
    // Other terminal processes may have already renewed the same saved session.
    const latest = connection();
    session = latest && latest.accessToken !== session.accessToken ? latest : await refresh(session);
    response = await send(session);
  }
  if (!response.ok) {
    const payload = await response.json().catch(() => ({})) as { error?: string; balance?: number };
    throw new Error(response.status === 401 ? "CLI credential expired or was revoked. Run krythiq connect again." : `${payload.error || `Dashboard returned HTTP ${response.status}.`}${typeof payload.balance === "number" ? ` Balance: ${payload.balance} Tokens.` : ""}`);
  }
  return response;
}

export async function disconnectDashboardConnection() {
  const session = connection();
  try {
    if (session) {
      const response = await fetch(`${session.url}/api/cli/session`, { method: "DELETE", redirect: "error", headers: { Authorization: `Bearer ${session.accessToken}`, "Content-Type": "application/json" }, body: JSON.stringify({ refreshToken: session.refreshToken }), signal: AbortSignal.timeout(15_000) });
      if (!response.ok && response.status !== 401) throw new Error(`Remote revocation failed (HTTP ${response.status}). Revoke this terminal from Settings → CLI.`);
    }
  } catch (error) {
    throw new Error(`Local connection cleared, but remote revocation could not be confirmed. Revoke it from Settings → CLI. ${error instanceof Error ? error.message : ""}`);
  } finally { clearDashboardConnection(); }
}

export async function loadDashboardAccount() {
  const response = await dashboardRequest("/api/cli/account");
  if (!response) return null;
  return response.json() as Promise<{
    connected: boolean;
    balance: number;
    profile: { username: string | null; fullName: string | null; email: string | null };
    transactions?: Array<{ id: string; amount: number; description: string; created_at: string }>;
    cli: { scanCount: number; tokensUsed: number };
  }>;
}

export async function publishDashboardScan(payload: { repository: string; severity: string; score: number; findings: unknown[] }) {
  const response = await dashboardRequest("/api/cli/scans", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...payload, cliVersion: packageMetadata.version }) });
  if (!response) throw new Error("Not connected. Run krythiq connect first.");
  return response.json();
}

export async function requestDashboardAi(action: "security-analysis" | "ask-codebase", payload: Record<string, unknown>, idempotencyKey: string) {
  const response = await dashboardRequest(`/api/ai/${action}`, { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey }, body: JSON.stringify(payload) });
  if (!response) throw new Error("Not connected. Run krythiq connect first.");
  return response.json() as Promise<{ analysis?: string; answer?: string; tokenCharge: { cost: number; balance: number; replayed: boolean } }>;
}
