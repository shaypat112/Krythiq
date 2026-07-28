import { spawn } from "child_process";
import chalk from "chalk";
import Anthropic from "@anthropic-ai/sdk";
import { getApiKey } from "../utils/config.js";
import { extractTraces } from "../utils/trace-extractor.js";
import stripAnsi from "strip-ansi";
import { loadConfig } from "../config.js";

interface RunOptions {
  ai: boolean;
  model: string;
  verbose: boolean;
}

const HEADER = chalk.dim("●") + " " + chalk.bold("krythiq");
const DEFAULT_MODEL = "claude-sonnet-4-20250514";

export async function runCommand(userCommand: string, options: RunOptions) {
  const { config, warnings, source } = await loadConfig();
  if (options.verbose && warnings.length) {
    for (const warning of warnings) {
      console.log(chalk.yellow(`\n${HEADER} ${warning}\n`));
    }
  }
  if (options.verbose && source) {
    console.log(chalk.dim(`${HEADER} using config ${source}\n`));
  }

  const traceConfig = config.traces ?? {};
  const envModel =
    process.env.KRYTHIQ_TRACE_MODEL ||
    process.env.KRYTHIQ_MODEL ||
    process.env.ANTHROPIC_MODEL;
  const model =
    options.model !== DEFAULT_MODEL
      ? options.model
      : envModel || config.model || DEFAULT_MODEL;

  const apiKey = await getApiKey();
  const tracesEnabled = traceConfig.enabled ?? true;
  const aiEnabled = options.ai && tracesEnabled && !!apiKey;

  // Print banner
  console.log(
    `\n${HEADER} ${chalk.dim("watching")} — node ${process.version}`
  );
  if (aiEnabled) {
    console.log(
      `${chalk.dim("●")} ${chalk.dim("AI trace analysis")} ${chalk.green("enabled")} ${chalk.dim(`(${model.split("-")[1] ?? model})\n`)}`
    );
  } else if (options.ai && !tracesEnabled) {
    console.log(
      chalk.yellow(
        `${chalk.dim("●")} AI disabled — traces are disabled in config\n`
      )
    );
  } else if (options.ai && !apiKey) {
    console.log(
      chalk.yellow(
        `${chalk.dim("●")} AI disabled — run ${chalk.cyan("krythiq auth")} to enable trace analysis\n`
      )
    );
  }

  // Parse and spawn
  const [cmd, ...args] = parseCommand(userCommand);
  const child = spawn(cmd, args, {
    stdio: ["inherit", "pipe", "pipe"],
    shell: true,
    env: { ...process.env },
  });

  let stderrBuffer = "";

  // Pipe stdout through
  child.stdout?.on("data", (data: Buffer) => {
    process.stdout.write(data);
  });

  // Buffer stderr for trace detection
  child.stderr?.on("data", async (data: Buffer) => {
    const raw = data.toString();
    process.stderr.write(data); // still show it
    stderrBuffer += stripAnsi(raw);

    if (!aiEnabled) return;

    // Look for a complete stack trace
    const traces = extractTraces(stderrBuffer);
    if (traces.length > 0) {
      stderrBuffer = ""; // clear so we don't re-analyze
      for (const trace of traces) {
        await analyzeTrace(trace, model, apiKey!);
      }
    }
  });

  child.on("exit", (code) => {
    if (code !== 0) {
      console.log(
        `\n${HEADER} ${chalk.dim("process exited with code")} ${chalk.red(code ?? "null")}\n`
      );
    }
    process.exit(code ?? 0);
  });

  child.on("error", (err) => {
    console.error(chalk.red(`\n${HEADER} failed to start process: ${err.message}\n`));
    process.exit(1);
  });

  // Forward signals
  process.on("SIGINT", () => child.kill("SIGINT"));
  process.on("SIGTERM", () => child.kill("SIGTERM"));
}

async function analyzeTrace(trace: string, model: string, apiKey: string) {
  const client = new Anthropic({ apiKey });

  const divider = chalk.dim("─".repeat(50));
  console.log(`\n${divider}`);
  console.log(`${HEADER} ${chalk.bold("— trace analysis")}\n`);

  try {
    const stream = client.messages.stream({
      model,
      max_tokens: 800,
      system: `You are an expert debugger embedded in a developer's terminal. 
When given a stack trace or error output, you:
1. Identify the root cause in ONE short sentence
2. Explain why it happens (2-3 sentences max)
3. Give the minimal code fix, if applicable
4. State your confidence percentage

Format your response like this (no markdown headers, keep it concise):
Root cause: <one sentence>
<blank line>
Why: <2-3 sentences>
<blank line>  
Fix: <code block or instruction>
<blank line>
Confidence: <X>%`,
      messages: [
        {
          role: "user",
          content: `Stack trace:\n\n${trace}`,
        },
      ],
    });

    process.stdout.write("  ");
    for await (const chunk of stream) {
      if (
        chunk.type === "content_block_delta" &&
        chunk.delta.type === "text_delta"
      ) {
        // indent output
        const text = chunk.delta.text.replace(/\n/g, "\n  ");
        process.stdout.write(chalk.white(text));
      }
    }

    console.log(`\n${divider}\n`);
  } catch (err: any) {
    console.log(
      chalk.yellow(`  AI analysis unavailable: ${err.message}\n`)
    );
    console.log(`${divider}\n`);
  }
}

function parseCommand(input: string): string[] {
  // Handle quoted args properly
  const parts: string[] = [];
  let current = "";
  let inQuote = false;
  let quoteChar = "";

  for (const char of input) {
    if (inQuote) {
      if (char === quoteChar) {
        inQuote = false;
      } else {
        current += char;
      }
    } else if (char === '"' || char === "'") {
      inQuote = true;
      quoteChar = char;
    } else if (char === " ") {
      if (current) {
        parts.push(current);
        current = "";
      }
    } else {
      current += char;
    }
  }

  if (current) parts.push(current);
  return parts;
}
