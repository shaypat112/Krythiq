import fs from "fs/promises";
import path from "path";
import chalk from "chalk";
import ora from "ora";

interface InitOptions {
  skipGitignore: boolean;
}

const CONFIG_TEMPLATE = `import { defineConfig } from "krythiq";

export default defineConfig({
  // AI model for trace analysis
  model: "claude-sonnet-4-20250514",

  // Stack trace analysis settings
  traces: {
    enabled: true,
  },

  // Security scanning settings
  scan: {
    // Glob patterns to ignore
    ignore: ["node_modules/**", ".next/**", "dist/**", "build/**"],
    // Opt in to Mistral summaries
    ai: false,
    aiModel: "mistral-large-latest",
  },
});
`;

export async function initCommand(options: InitOptions) {
  const cwd = process.cwd();
  const configPath = path.join(cwd, "krythiq.config.mjs");
  const legacyConfigPath = path.join(cwd, "krythiq.config.ts");
  const krythiqDir = path.join(cwd, ".krythiq");

  console.log(`\n${chalk.bold("krythiq")} ${chalk.dim("—")} initializing\n`);

  const spinner = ora({ text: "Detecting project stack...", color: "green" }).start();
  await sleep(600);

  // Detect stack
  const detected = await detectStack(cwd);
  spinner.succeed(`Detected: ${chalk.cyan(detected.join(", "))}`);

  // Create .krythiq dir
  const dirSpinner = ora("Creating .krythiq/ directory...").start();
  await fs.mkdir(krythiqDir, { recursive: true });
  await fs.writeFile(path.join(krythiqDir, ".gitkeep"), "");
  dirSpinner.succeed("Created .krythiq/");

  // Write config
  const configSpinner = ora("Writing krythiq.config.mjs...").start();
  const exists = (await fileExists(configPath)) || (await fileExists(legacyConfigPath));
  if (exists) {
    configSpinner.warn("krythiq.config already exists — skipping");
  } else {
    await fs.writeFile(configPath, CONFIG_TEMPLATE, "utf-8");
    configSpinner.succeed("Created krythiq.config.mjs");
  }

  // Update .gitignore
  if (!options.skipGitignore) {
    const gitignoreSpinner = ora("Updating .gitignore...").start();
    const gitignorePath = path.join(cwd, ".gitignore");
    const entry = "\n# krythiq\n.krythiq/\n";
    const giExists = await fileExists(gitignorePath);
    if (giExists) {
      const content = await fs.readFile(gitignorePath, "utf-8");
      if (!content.includes(".krythiq/")) {
        await fs.appendFile(gitignorePath, entry);
        gitignoreSpinner.succeed("Added .krythiq/ to .gitignore");
      } else {
        gitignoreSpinner.succeed(".gitignore already up to date");
      }
    } else {
      await fs.writeFile(gitignorePath, entry.trim() + "\n");
      gitignoreSpinner.succeed("Created .gitignore with .krythiq/");
    }
  }

  // Done
  console.log(`\n${chalk.green("✓")} ${chalk.bold("Ready.")}\n`);
  console.log(
    `  Run your app:  ${chalk.cyan('krythiq run "npm start"')}`
  );
  console.log(
    `  Scan now:      ${chalk.cyan("krythiq scan")}\n`
  );
}

async function detectStack(cwd: string): Promise<string[]> {
  const detected: string[] = [];
  const checks: [string, string][] = [
    ["package.json", "Node.js"],
    ["tsconfig.json", "TypeScript"],
    ["next.config.js", "Next.js"],
    ["next.config.ts", "Next.js"],
    ["vite.config.ts", "Vite"],
    ["requirements.txt", "Python"],
    ["Cargo.toml", "Rust"],
    ["go.mod", "Go"],
  ];

  for (const [file, label] of checks) {
    if (await fileExists(path.join(cwd, file))) {
      if (!detected.includes(label)) detected.push(label);
    }
  }

  return detected.length > 0 ? detected : ["Unknown"];
}

async function fileExists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
