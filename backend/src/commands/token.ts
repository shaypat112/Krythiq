import chalk from "chalk";
import { loadDashboardAccount } from "../utils/dashboard.js";

export async function tokenCommand() {
  try {
    const account = await loadDashboardAccount();
    if (!account) {
      console.error(`\n${chalk.yellow("Not signed in to Krythiq.dev.")} Run ${chalk.cyan("krythiq connect")} first.\n`);
      process.exitCode = 1;
      return;
    }
    console.log(`\n${chalk.bold("Krythiq Tokens")}`);
    console.log(`  Left: ${chalk.cyan.bold(account.balance.toLocaleString())}`);
    console.log(`  Used by saved CLI scans: ${account.cli.tokensUsed.toLocaleString()}`);
    console.log(`  ${chalk.dim("Static terminal scans and --save cost 0 Tokens.")}\n`);
  } catch (error) {
    console.error(chalk.red(`\n${error instanceof Error ? error.message : "Unable to load your Token balance."}\n`));
    process.exitCode = 1;
  }
}
