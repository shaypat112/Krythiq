import { Command, Option } from "commander";
import chalk from "chalk";
import { createRequire } from "module";
import { runCommand } from "./commands/run.js";
import { initCommand } from "./commands/init.js";
import { scanCommand } from "./commands/scan.js";
import { authCommand } from "./commands/auth.js";
import { checkUpdate } from "./utils/update.js";

export function runCli() {
  const require = createRequire(import.meta.url);
  const pkg = require("../package.json");

  // Check for updates in background (non-blocking)
  checkUpdate(pkg.name, pkg.version);

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
    .option("--publish", "publish scan summary to Supabase scan_history")
    .option("--ai", "enable a Mistral remediation summary")
    .option("--ai-model <model>", "Mistral model name", "mistral-large-latest")
    .action(scanCommand);

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
