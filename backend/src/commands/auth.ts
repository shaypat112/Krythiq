import chalk from "chalk";
import Conf from "conf";
import inquirer from "inquirer";
import Anthropic from "@anthropic-ai/sdk";

interface AuthOptions {
  clear: boolean;
}

export async function authCommand(options: AuthOptions) {
  let store: Conf<{ apiKey?: string }>;
  try {
    store = new Conf<{ apiKey?: string }>({ projectName: "krythiq" });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(chalk.red(`\nUnable to access the local credential store: ${message}\n`));
    process.exitCode = 1;
    return;
  }
  if (options.clear) {
    store.delete("apiKey");
    console.log(`\n${chalk.green("✓")} Credentials cleared.\n`);
    return;
  }

  const envKey = process.env.ANTHROPIC_API_KEY;

  if (envKey) {
    console.log(
      `\n${chalk.green("✓")} ANTHROPIC_API_KEY found in environment — krythiq will use it automatically.\n`
    );
    return;
  }

  console.log(`\n${chalk.bold("krythiq")} ${chalk.dim("— Enable AI Logic ")}\n`);
  console.log(
    chalk.dim("  Your key is stored in your operating system's user configuration directory.\n")
  );


  const { apiKey } = await inquirer.prompt([
    {
      type: "password",
      name: "apiKey",
      message: "Anthropic API key:",
      mask: "•",
      validate: (v: string) => v.startsWith("sk-ant-") || "Must be a valid Anthropic key (starts with sk-ant-)",
    },
  ]);

  // Validate key
  const spinner = (await import("ora")).default("Verifying key...").start();
  try {
    const client = new Anthropic({ apiKey });
    await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 10,
      messages: [{ role: "user", content: "hi" }],
    });
    store.set("apiKey", apiKey);
    spinner.succeed("Key verified and saved");
    console.log(`\n  You're all set. Run ${chalk.cyan('krythiq run "npm start"')} to begin.\n`);
  } catch (err: unknown) {
    spinner.fail("Key verification failed");
    const message = err instanceof Error ? err.message : String(err);
    console.error(chalk.red(`  ${message}\n`));
    process.exitCode = 1;
  }
}
