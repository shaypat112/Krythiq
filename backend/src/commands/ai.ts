import { open } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import inquirer from "inquirer";
import stripAnsi from "strip-ansi";
import { requestDashboardAi } from "../utils/dashboard.js";

type Options = { yes?: boolean; json?: boolean; requestId?: string; file?: string[] };

async function readContext(filename: string, maxBytes: number) {
  const handle = await open(filename, "r");
  try {
    const stat = await handle.stat();
    if (!stat.isFile() || stat.size > maxBytes) throw new Error(`${filename}: select a text file of at most ${maxBytes} bytes.`);
    // Bound the read even if the file grows after stat.
    const buffer = Buffer.alloc(maxBytes + 1);
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
    if (bytesRead > maxBytes || buffer.subarray(0, bytesRead).includes(0)) throw new Error(`${filename}: file is too large or binary.`);
    const content = new TextDecoder("utf-8", { fatal: true }).decode(buffer.subarray(0, bytesRead));
    if (!content.trim()) throw new Error(`${filename}: file is empty.`);
    return { path: path.basename(filename), content };
  } finally { await handle.close(); }
}

async function execute(action: "security-analysis" | "ask-codebase", payload: Record<string, unknown>, files: string[], cost: number, options: Options) {
  if (!options.yes) {
    if (!process.stdin.isTTY || options.json) throw new Error(`Add --yes to confirm uploading ${files.join(", ")} and spending ${cost} account Tokens.`);
    const answer = await inquirer.prompt([{ type: "confirm", name: "confirmed", default: false, message: `Send ${files.join(", ")} for hosted AI analysis (${cost} Tokens)?` }]);
    if (!answer.confirmed) return;
  }
  // Bind retries to the exact action and payload so a reused key cannot return another file's result.
  const digest = createHash("sha256").update(JSON.stringify({ action, payload })).digest("hex").slice(0, 32);
  const seed = options.requestId ?? `${Date.now()}`;
  if (!/^[A-Za-z0-9:_-]{1,80}$/.test(seed)) throw new Error("--request-id must contain 1–80 letters, digits, colons, underscores or hyphens.");
  const key = `cli:${seed}:${digest}`;
  console.error(`Request ID: ${seed}. Retry the identical command with --request-id ${seed} if the response is interrupted.`);
  const result = await requestDashboardAi(action, payload, key);
  if (options.json) console.log(JSON.stringify(result, null, 2));
  else {
    console.log(stripAnsi(result.analysis ?? result.answer ?? ""));
    console.log(`\n${result.tokenCharge.cost} Tokens${result.tokenCharge.replayed ? " (cached; no additional charge)" : " charged"}. Balance: ${result.tokenCharge.balance} Tokens.`);
  }
}

export async function reviewCommand(file: string, options: Options) {
  try {
    const context = await readContext(file, 4000);
    await execute("security-analysis", { codeContext: context.content, filePath: context.path }, [file], 15, options);
  } catch (error) { console.error(error instanceof Error ? error.message : "Review failed."); process.exitCode = 1; }
}

export async function askCommand(question: string, options: Options) {
  try {
    if (!question.trim() || question.length > 2000) throw new Error("Provide a question of 1–2000 characters.");
    const files = [...new Set(options.file ?? [])];
    if (!files.length || files.length > 5) throw new Error("Select 1–5 files with --file.");
    const relevantFiles = await Promise.all(files.map(file => readContext(file, 2000)));
    await execute("ask-codebase", { question, codebaseContext: { architecture: "User-selected local files", summary: "Only the explicitly selected files are included.", relevantFiles } }, files, 10, options);
  } catch (error) { console.error(error instanceof Error ? error.message : "Question failed."); process.exitCode = 1; }
}
