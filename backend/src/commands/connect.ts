import { spawn } from "node:child_process";
import chalk from "chalk";
import ora from "ora";
import { clearDashboardConnection, dashboardUrl, loadDashboardAccount, saveDashboardConnection } from "../utils/dashboard.js";

type ConnectOptions = { disconnect?: boolean; status?: boolean; noBrowser?: boolean };

function openBrowser(url: string) {
  const command = process.platform === "darwin" ? "open" : process.platform === "win32" ? "cmd" : "xdg-open";
  const args = process.platform === "win32" ? ["/c", "start", "", url] : [url];
  const child = spawn(command, args, { detached: true, stdio: "ignore" });
  child.unref();
  child.on("error", () => undefined);
}

export async function connectCommand(options: ConnectOptions) {
  if (options.disconnect) {
    clearDashboardConnection();
    console.log(`\n${chalk.green("✓")} Dashboard connection removed.\n`);
    return;
  }
  if (options.status) {
    try {
      const account = await loadDashboardAccount();
      if (!account) console.log(`\n${chalk.yellow("Not connected.")} Run ${chalk.cyan("krythiq connect")}.\n`);
      else console.log(`\n${chalk.green("✓ Connected to Krythiq Dashboard")}\n  Tokens: ${chalk.cyan(account.balance.toLocaleString())}\n`);
    } catch (error) {
      console.error(chalk.red(`\n${error instanceof Error ? error.message : "Unable to check connection."}\n`));
      process.exitCode = 1;
    }
    return;
  }

  const baseUrl = dashboardUrl();
  const spinner = ora("Starting secure browser authorization...").start();
  try {
    const response = await fetch(`${baseUrl}/api/cli/device`, { method: "POST", signal: AbortSignal.timeout(15_000) });
    const payload = await response.json() as { deviceCode?: string; userCode?: string; verificationUrl?: string; interval?: number; expiresIn?: number; error?: string };
    if (!response.ok || !payload.deviceCode || !payload.userCode || !payload.verificationUrl) throw new Error(payload.error || `Dashboard returned HTTP ${response.status}.`);
    spinner.stop();
    console.log(`\n${chalk.bold("Connect Krythiq CLI")}\n\n  Code: ${chalk.cyan.bold(payload.userCode)}\n  Open: ${chalk.underline(payload.verificationUrl)}\n`);
    if (!options.noBrowser) openBrowser(payload.verificationUrl);
    const waiting = ora("Waiting for approval in your browser...").start();
    const deadline = Date.now() + (payload.expiresIn ?? 600) * 1000;
    while (Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, Math.max(2, payload.interval ?? 2) * 1000));
      const poll = await fetch(`${baseUrl}/api/cli/device/token`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ deviceCode: payload.deviceCode }), signal: AbortSignal.timeout(15_000) });
      const result = await poll.json() as { accessToken?: string; balance?: number; error?: string };
      if (poll.status === 428 && result.error === "authorization_pending") continue;
      if (!poll.ok || !result.accessToken) throw new Error(result.error === "expired_token" ? "The authorization code expired." : result.error || `Dashboard returned HTTP ${poll.status}.`);
      saveDashboardConnection(result.accessToken, baseUrl);
      waiting.succeed("Terminal connected to your dashboard");
      console.log(`\n  Tokens: ${chalk.cyan(Number(result.balance ?? 0).toLocaleString())}\n  Future ${chalk.cyan("krythiq scan")} results will appear in your dashboard automatically.\n`);
      return;
    }
    waiting.fail("Authorization timed out");
    process.exitCode = 1;
  } catch (error) {
    spinner.fail(error instanceof Error ? error.message : "Unable to connect to the dashboard.");
    process.exitCode = 1;
  }
}
