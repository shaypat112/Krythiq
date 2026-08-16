import chalk from "chalk";
import { dashboardUrl, loadDashboardAccount } from "../utils/dashboard.js";

export async function whoamiCommand() {
  try {
    const account = await loadDashboardAccount();
    if (!account) {
      console.error(`\n${chalk.yellow("Not signed in to Krythiq.dev.")} Run ${chalk.cyan("krythiq connect")} to connect this terminal.\n`);
      process.exitCode = 1;
      return;
    }

    const displayName = account.profile.fullName || account.profile.username || account.profile.email || "Krythiq user";
    console.log(`\n${chalk.green("✓ Signed in to Krythiq.dev")}`);
    console.log(`  Account: ${chalk.bold(displayName)}`);
    if (account.profile.username) console.log(`  Username: ${chalk.cyan(`@${account.profile.username}`)}`);
    if (account.profile.email) console.log(`  Email: ${account.profile.email}`);
    console.log(`  Dashboard: ${chalk.underline(dashboardUrl())}`);
    console.log(`  Tokens left: ${chalk.cyan(account.balance.toLocaleString())}`);
    console.log(`  CLI scans: ${account.cli.scanCount.toLocaleString()}`);
    console.log(`  Scan Tokens used: ${account.cli.tokensUsed.toLocaleString()}\n`);
  } catch (error) {
    console.error(chalk.red(`\n${error instanceof Error ? error.message : "Unable to verify your Krythiq session."}\n`));
    process.exitCode = 1;
  }
}
