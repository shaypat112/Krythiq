import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DocumentationCodeBlock } from "../documentation-code-block";

const commands = [
  { name: "init", usage: "krythiq init [--skip-gitignore]", body: "Creates .krythiq/, writes krythiq.config.mjs unless a config already exists, detects a small set of project markers, and normally adds .krythiq/ to .gitignore." },
  { name: "run", usage: "krythiq run <command> [--no-ai] [--model <model>] [--verbose]", body: "Runs a trusted command through the operating-system shell, streams both output channels, preserves its exit code, and optionally explains recognized stack traces from stderr with Anthropic." },
  { name: "scan", usage: "krythiq scan [path] [--ci] [--fail-on <severity>] [--format <format>] [--ignore <patterns...>] [--rules <path>] [--publish] [--ai] [--ai-model <model>]", body: "Scans a directory with custom regex rules, optional Semgrep, and npm audit when a package lock exists. Formats are text, json, markdown, and sarif; severities are low, medium, high, and critical." },
  { name: "connect", usage: "krythiq connect [--status] [--disconnect] [--no-browser]", body: "Connects this terminal to Krythiq.dev through a short browser approval flow, checks the connection and Token balance, or removes the local connection." },
  { name: "whoami", usage: "krythiq whoami", body: "Checks the saved CLI session with Krythiq.dev and shows the signed-in account, dashboard, Token balance, CLI scan count, and scan Tokens used. It exits with an error when the session is missing, expired, or revoked." },
  { name: "auth", usage: "krythiq auth [--clear]", body: "Validates and stores an Anthropic key in the current user's OS configuration directory, or removes it. ANTHROPIC_API_KEY takes precedence over stored data." },
];

export default function CommandsPage() {
  return <article className="space-y-8">
    <header><h1 className="text-3xl font-semibold">CLI command reference</h1><p className="mt-3 text-muted-foreground">These are the commands and options registered by the published executable.</p></header>
    {commands.map((command) => <Card key={command.name}><CardHeader><CardTitle><code>krythiq {command.name}</code></CardTitle></CardHeader><CardContent className="space-y-4"><DocumentationCodeBlock code={command.usage} /><p className="text-sm leading-6 text-muted-foreground">{command.body}</p></CardContent></Card>)}
    <Card><CardHeader><CardTitle>Exit and error behavior</CardTitle></CardHeader><CardContent className="space-y-2 text-sm text-muted-foreground"><p><code>scan --ci</code> exits 1 only when a finding meets the selected threshold. A missing/non-directory scan path exits 2. Commander rejects unsupported formats and severities.</p><p>Semgrep, npm-audit, Mistral, and publish failures are warnings and currently do not fail an otherwise completed scan.</p><p>There is no <code>fix</code> command, <code>--fix</code>, <code>--watch</code>, or <code>--sandbox</code> option.</p></CardContent></Card>
  </article>;
}
