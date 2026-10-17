import chalk from "chalk";
import { loadDashboardAccount } from "../utils/dashboard.js";

export async function tokenCommand(options: { history?: boolean; json?: boolean } = {}) {
  try {
    const account = await loadDashboardAccount();
    if (!account) {
      console.error(`\n${chalk.yellow("Not signed in to Krythiq.dev.")} Run ${chalk.cyan("krythiq connect")} first.\n`);
      process.exitCode = 1;
      return;
    }
    if (options.json) { console.log(JSON.stringify(account, null, 2)); return; }
    console.log(`\n${chalk.bold("Krythiq Tokens")}`);
    console.log(`  Left: ${chalk.cyan.bold(account.balance.toLocaleString())}`);
    console.log(`  Used by saved CLI scans: ${account.cli.tokensUsed.toLocaleString()}`);
    if (options.history) for (const tx of account.transactions ?? []) console.log(`  ${tx.created_at}  ${tx.amount > 0 ? "+" : ""}${tx.amount}  ${tx.description}`);
    console.log("  Hosted actions: krythiq review <file> (15 Tokens), krythiq ask <question> --file <paths...> (10 Tokens).");
    console.log(`  ${chalk.dim("Static terminal scans and --save cost 0 Tokens.")}\n`);
  } catch (error) {
    console.error(chalk.red(`\n${error instanceof Error ? error.message : "Unable to load your Token balance."}\n`));
    process.exitCode = 1;
  }
}
