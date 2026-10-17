import { Command, Option } from "commander";
import chalk from "chalk";
import { createRequire } from "module";
import { runCommand } from "./commands/run.js";
import { initCommand } from "./commands/init.js";
import { scanCommand } from "./commands/scan.js";
import { doctorCommand } from "./commands/doctor.js";
import { reportCommand } from "./commands/report.js";
import { authCommand } from "./commands/auth.js";
import { connectCommand } from "./commands/connect.js";
import { whoamiCommand } from "./commands/whoami.js";
import { reviewCommand, askCommand } from "./commands/ai.js";
import { tokenCommand } from "./commands/token.js";
import { checkUpdate } from "./utils/update.js";

export function runCli() {
  const require = createRequire(import.meta.url);
  const pkg = require("../package.json");

  // Check for updates in background (non-blocking)
  if (!["doctor", "report"].includes(process.argv[2] ?? "")) checkUpdate(pkg.name, pkg.version);

  const program = new Command();

  program
    .name("krythiq")
    .description(
      chalk.bold("krythiq") +
        " — AI-powered terminal trace analysis & security scanning"
    )
    .version(pkg.version, "-v, --version", "print current version")
    .helpOption("-h, --help", "display help");

  // ─── Commands ───────────────────────────────────────────────────────────────

  program
    .command("init")
    .description("initialize krythiq in the current project")
    .option("--skip-gitignore", "do not modify .gitignore")
    .action(initCommand);

  program
    .command("run <command>")
    .description('wrap a process and analyze its output (e.g. krythiq run "npm start")')
    .option("--no-ai", "disable AI analysis, just pipe output")
    .option("--model <model>", "Anthropic model to use", "claude-sonnet-4-20250514")
    .option("--verbose", "print debug info from krythiq itself")
    .allowUnknownOption()
    .action(runCommand);

  program
    .command("scan [path]")
    .description("scan a directory for security vulnerabilities (default: .)")
    .option("--ci", "exit with code 1 when findings meet the severity threshold")
    .addOption(new Option("--fail-on <severity>", "minimum severity that fails CI").choices(["low", "medium", "high", "critical"]).default("high"))
    .addOption(new Option("--format <fmt>", "output format").choices(["text", "json", "markdown", "sarif"]).default("text"))
    .option("--ignore <patterns...>", "glob patterns to ignore")
    .option("--rules <path>", "path to custom rules JSON (default: .krythiq/rules.json)")
    .option("--output <path>", "save the selected report format to a local file")
    .option("--overwrite", "replace an existing --output file")
    .option("--no-semgrep", "skip the Semgrep engine")
    .option("--no-audit", "skip the npm audit engine")
    .option("--save", "save this free static scan to Krythiq.dev Recent Scans")
    .option("--publish", "publish scan summary to Supabase scan_history")
    .option("--ai", "enable a Mistral remediation summary")
    .option("--ai-model <model>", "Mistral model name", "mistral-large-latest")
    .action(scanCommand);

  program
    .command("doctor [path]")
    .description("check local scan prerequisites without sending credentials or scanning")
    .addOption(new Option("--format <fmt>", "diagnostic output format").choices(["text", "json"]).default("text"))
    .option("--strict", "exit 1 on warnings as well as failed checks")
    .action(doctorCommand);

  program
    .command("report <file>")
    .description("filter and convert a saved Krythiq JSON scan without rescanning")
    .addOption(new Option("--format <fmt>", "output format").choices(["text", "json", "markdown", "sarif"]).default("text"))
    .addOption(new Option("--min-severity <severity>", "minimum displayed severity").choices(["low", "medium", "high", "critical"]).default("low"))
    .option("--output <path>", "save the converted report to a local file")
    .option("--overwrite", "replace an existing --output file")
    .option("--ci", "evaluate all original findings against the CI threshold")
    .addOption(new Option("--fail-on <severity>", "minimum severity that fails CI").choices(["low", "medium", "high", "critical"]).default("high"))
    .action(reportCommand);

  program
    .command("connect")
    .alias("connectx")
    .description("sign in with the web and connect terminal scans to your dashboard")
    .option("--status", "show dashboard connection and Token balance")
    .option("--disconnect", "revoke this terminal and remove its saved connection")
    .option("--refresh", "renew a saved CLI session without browser sign-in")
    .option("--name <name>", "name this terminal in Settings → CLI")
    .option("--no-browser", "print the authorization URL without opening it")
    .action(connectCommand);

  program
    .command("whoami")
    .description("show which Krythiq.dev account this terminal is signed in to")
    .action(whoamiCommand);

  program
    .command("token")
    .alias("tokens")
    .option("--history", "show the latest 50 account Token transactions")
    .option("--json", "print account balance and transactions as JSON")
    .description("show the Token balance for the signed-in Krythiq.dev account")
    .action(tokenCommand);

  program
    .command("review <file>")
    .description("hosted security review of one file (15 account Tokens)")
    .option("--yes", "confirm sending this file and spending 15 Tokens")
    .option("--json", "print the full response as JSON")
    .option("--request-id <id>", "reuse an idempotency key after an interrupted request")
    .action(reviewCommand);

  program
    .command("ask <question>")
    .description("ask about explicitly selected files (10 account Tokens)")
    .requiredOption("--file <paths...>", "files to send as context (up to 5)")
    .option("--yes", "confirm sending these files and spending 10 Tokens")
    .option("--json", "print the full response as JSON")
    .option("--request-id <id>", "reuse an idempotency key after an interrupted request")
    .action(askCommand);

  program
    .command("auth")
    .description("configure your Anthropic API key")
    .option("--clear", "remove stored credentials")
    .action(authCommand);

  // ─── Error handling ─────────────────────────────────────────────────────────

  program.on("command:*", (operands) => {
    console.error(
      chalk.red(`\nError: unknown command '${operands[0]}'\n`)
    );
    console.log(`Run ${chalk.cyan("krythiq --help")} to see available commands.\n`);
    process.exit(1);
  });

  program.parse(process.argv);

  // Show help if no args
  if (!process.argv.slice(2).length) {
    program.outputHelp();
  }
}
