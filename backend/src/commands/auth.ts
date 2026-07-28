import chalk from "chalk";
import Conf from "conf";
import inquirer from "inquirer";
import Anthropic from "@anthropic-ai/sdk";

interface AuthOptions {
  clear: boolean;
}

const store = new Conf<{ apiKey?: string }>({ projectName: "krythiq" });

export async function authCommand(options: AuthOptions) {
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
    chalk.dim("  Your key is stored locally and never accesed publicly.\n")
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
  } catch (err: any) {
    spinner.fail("Key verification failed");
    console.error(chalk.red(`  ${err.message}\n`));
  }
}