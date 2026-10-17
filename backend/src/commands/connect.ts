import { hostname } from "node:os";
import { spawn } from "node:child_process";
import chalk from "chalk";
import ora from "ora";
import { dashboardUrl, disconnectDashboardConnection, loadDashboardAccount, refreshDashboardConnection, saveDashboardConnection } from "../utils/dashboard.js";

type ConnectOptions = { disconnect?: boolean; status?: boolean; browser?: boolean; refresh?: boolean; name?: string };

function openBrowser(url: string) {
  const command = process.platform === "darwin" ? "open" : process.platform === "win32" ? "cmd" : "xdg-open";
  const args = process.platform === "win32" ? ["/c", "start", "", url] : [url];
  const child = spawn(command, args, { detached: true, stdio: "ignore" });
  child.unref();
  child.on("error", () => undefined);
}

export async function connectCommand(options: ConnectOptions) {
  if (options.disconnect) {
    try {
      await disconnectDashboardConnection();
      console.log(`\n${chalk.green("✓")} Terminal revoked and local connection removed.${process.env.KRYTHIQ_CLI_TOKEN ? " Unset KRYTHIQ_CLI_TOKEN to remove the environment credential." : ""}\n`);
    } catch (error) { console.error(error instanceof Error ? error.message : "Unable to disconnect."); process.exitCode = 1; }
    return;
  }
  if (options.refresh) {
    try { await refreshDashboardConnection(); console.log("CLI session renewed."); }
    catch (error) { console.error(error instanceof Error ? error.message : "Unable to renew connection."); process.exitCode = 1; }
    return;
  }
  if (options.status) {
    try {
      const account = await loadDashboardAccount();
      if (!account) { console.log(`\n${chalk.yellow("Not connected.")} Run ${chalk.cyan("krythiq connect")}.\n`); process.exitCode = 1; }
      else console.log(`\n${chalk.green("✓ Connected to Krythiq Dashboard")}\n  Tokens: ${chalk.cyan(account.balance.toLocaleString())}\n`);
    } catch (error) {
      console.error(chalk.red(`\n${error instanceof Error ? error.message : "Unable to check connection."}\n`));
      process.exitCode = 1;
    }
    return;
  }

  if (process.env.KRYTHIQ_CLI_TOKEN) { console.error("KRYTHIQ_CLI_TOKEN overrides saved sessions. Unset it before browser sign-in."); process.exitCode = 1; return; }
  const spinner = ora("Starting secure browser authorization...").start();
  let waiting: ReturnType<typeof ora> | undefined;
  try {
    const baseUrl = dashboardUrl();
    const response = await fetch(`${baseUrl}/api/cli/device`, { method: "POST", redirect: "error", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionVersion: 2, name: options.name?.trim().slice(0, 100) || hostname() }), signal: AbortSignal.timeout(15_000) });
    const payload = await response.json().catch(() => ({})) as { deviceCode?: string; userCode?: string; verificationUrl?: string; interval?: number; expiresIn?: number; error?: string };
    if (!response.ok || !payload.deviceCode || !payload.userCode || !payload.verificationUrl) throw new Error(payload.error || `Dashboard returned HTTP ${response.status}.`);
    spinner.stop();
    console.log(`\n${chalk.bold("Connect Krythiq CLI")}\n\n  Code: ${chalk.cyan.bold(payload.userCode)}\n  Open: ${chalk.underline(payload.verificationUrl)}\n`);
    const verification = new URL(payload.verificationUrl);
    if (verification.origin !== baseUrl || verification.pathname !== "/cli/connect" || verification.searchParams.get("code") !== payload.userCode) throw new Error("Dashboard returned an unexpected verification URL.");
    if (options.browser !== false) openBrowser(`${baseUrl}/cli/connect?code=${encodeURIComponent(payload.userCode)}`);
    waiting = ora("Waiting for approval in your browser...").start();
    const deadline = Date.now() + (Math.min(600, Math.max(1, payload.expiresIn ?? 600))) * 1000;
    while (Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, Math.min(30, Math.max(2, payload.interval ?? 2)) * 1000));
      let poll: Response;
      try {
        poll = await fetch(`${baseUrl}/api/cli/device/token`, { method: "POST", redirect: "error", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ deviceCode: payload.deviceCode }), signal: AbortSignal.timeout(15_000) });
      } catch { waiting.text = "Connection interrupted; retrying approval check…"; continue; }
      if (poll.status === 429 || poll.status >= 500) { waiting.text = "Authorization service is busy; retrying…"; continue; }
      const result = await poll.json().catch(() => ({})) as { accessToken?: string; refreshToken?: string; expiresAt?: string; refreshExpiresAt?: string; error?: string };
      if (poll.status === 428 && result.error === "authorization_pending") continue;
      if (!poll.ok || !result.accessToken) throw new Error(result.error === "expired_token" ? "The authorization code expired." : result.error || `Dashboard returned HTTP ${poll.status}.`);
      saveDashboardConnection(result.accessToken, baseUrl, { refreshToken: result.refreshToken, expiresAt: result.expiresAt, refreshExpiresAt: result.refreshExpiresAt });
      waiting.text = "Verifying the saved terminal connection…";
      await loadDashboardAccount();
      waiting.succeed("Terminal connected and verified with your dashboard");
      console.log(`\n  Use ${chalk.cyan("krythiq tokens")} to check your live Token balance.\n  Use ${chalk.cyan("krythiq scan --save")} to save results to your dashboard.\n  Use ${chalk.cyan("krythiq review <file>")} or ${chalk.cyan('krythiq ask "question" --file <paths...>')} for hosted AI using account Tokens.\n`);
      return;
    }
    waiting.fail("Authorization timed out");
    process.exitCode = 1;
  } catch (error) {
    waiting?.stop();
    spinner.fail(error instanceof Error ? error.message : "Unable to connect to the dashboard.");
    process.exitCode = 1;
  }
}
