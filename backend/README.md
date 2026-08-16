# Krythiq CLI

Krythiq is a local command-line wrapper for security scanning and optional terminal stack-trace analysis.

## Requirements and installation

- Node.js 20 or newer
- Optional: [Semgrep](https://semgrep.dev/) on `PATH` for Semgrep findings
- Optional: an Anthropic API key for trace analysis
- Optional: a Mistral API key for scan summaries

```bash
npm install --global krythiq
krythiq --help
```

For a project-local install that provides the `defineConfig` helper:

```bash
npm install --save-dev krythiq
```

The package can also be installed from the npm registry with pnpm or Bun after it is published:

```bash
pnpm add --global krythiq
bun add --global krythiq
```

The package exposes the `krythiq` executable and the `defineConfig` TypeScript helper. It does not expose a JavaScript scanning API or run an HTTP server.

## Minimal verified usage

```bash
cd your-project
krythiq init
krythiq scan .
krythiq run "npm test" --no-ai
```

`init` creates `krythiq.config.mjs`, creates `.krythiq/`, and adds `.krythiq/` to `.gitignore` unless `--skip-gitignore` is set.

## `krythiq connect`

```bash
npx krythiq connect
```

The CLI opens a short-lived browser authorization page. After approval, future
`krythiq scan` results sync to the signed-in dashboard automatically and the CLI
shows the account's Token balance. The browser session and Supabase credentials
are never copied into the terminal.

```bash
npx krythiq connect --status
npx krythiq whoami
npx krythiq connect --disconnect
```

`krythiq whoami` verifies the saved session with Krythiq.dev and prints the
signed-in account, dashboard address, Token balance, CLI scan count, and scan
Tokens used. A missing, expired, or revoked session exits with an error and a
reconnect instruction.

Use `KRYTHIQ_DASHBOARD_URL=http://localhost:3000` when testing against a local
Krythiq web app. Use `--no-browser` on remote or headless machines.

## `krythiq scan [path]`

The scan command accepts a directory (default `.`) and discovers `ts`, `tsx`, `js`, `jsx`, `py`, `go`, `rs`, `java`, `cs`, and `php` files. It combines:

- patterns from `.krythiq/rules.json` or `--rules`;
- Semgrep `scan --config auto`, when Semgrep is installed; and
- `npm audit --omit=dev`, when the scanned directory contains `package-lock.json`.

Semgrep and npm-audit failures are warnings: the other available engines still run. No built-in pattern rules are bundled, so a scan without Semgrep and without a custom rules file performs only npm-audit when a lockfile exists.

```bash
krythiq scan ./src
krythiq scan --format json
krythiq scan --format markdown
krythiq scan --format sarif
krythiq scan --ci --fail-on high
krythiq scan --ignore "generated/**" "fixtures/**"
krythiq scan --rules ./security-rules.json
```

Supported severities are `low`, `medium`, `high`, and `critical`. With `--ci`, the process exits 1 when a finding meets or exceeds `--fail-on`; an invalid option is rejected, and a missing/non-directory scan path exits 2. Otherwise a completed scan exits 0, even when findings exist.

JSON output has this shape (fields omitted by an engine remain absent):

```json
{
  "findings": [
    {
      "file": "src/example.js",
      "line": 1,
      "severity": "high",
      "score": 75,
      "type": "CUSTOM_DANGEROUS_CALL",
      "message": "Avoid dangerousFunction in production code.",
      "snippet": "dangerousFunction();",
      "suggestion": "Use the validated wrapper.",
      "source": "rules"
    }
  ],
  "aiSummary": null
}
```

Custom rules are regular expressions evaluated against each discovered file:

```json
{
  "ignore": ["legacy/**"],
  "patterns": [
    {
      "pattern": "dangerousFunction\\(",
      "severity": "high",
      "type": "CUSTOM_DANGEROUS_CALL",
      "message": "Avoid dangerousFunction in production code.",
      "suggestion": "Use the validated wrapper."
    }
  ]
}
```

Default ignores are `node_modules/**`, `.git/**`, `.next/**`, `dist/**`, `build/**`, and `**/*.min.js`. Krythiq does not parse `.gitignore`.

### Optional AI summary

```bash
MISTRAL_API_KEY=your-key krythiq scan --ai
krythiq scan --ai --ai-model mistral-large-latest
```

At most 50 structured findings—including stored snippets—are sent to Mistral. A failed or timed-out request leaves `aiSummary` as `null` and does not fail the scan. The CLI does not use AI to discover findings.

### Optional Supabase publishing

```bash
SUPABASE_URL=https://your-project.supabase.co \
SUPABASE_ANON_KEY=your-public-anon-key \
SUPABASE_ACCESS_TOKEN=your-user-session-jwt \
krythiq scan --publish
```

Publishing posts the summary and full finding objects to `/rest/v1/scan_history`. A compatible table and Row Level Security policy are required. A missing credential, rejected request, or timeout is reported but currently does not make the scan fail.

## `krythiq run <command>`

`run` executes the supplied command through the operating-system shell, streams stdout/stderr, and preserves the child exit code.

```bash
krythiq run "npm test" --no-ai
ANTHROPIC_API_KEY=your-anthropic-api-key krythiq run "npm start"
krythiq run "npm start" --model claude-sonnet-4-20250514
```

When AI is enabled and a credential is available, recognizable JavaScript, Python, Go, or Rust stack traces from stderr are sent to Anthropic for a streamed explanation. Arbitrary stderr and stdout are not analyzed. Because the command is intentionally interpreted by a shell, only run trusted command strings.

`krythiq auth` validates an Anthropic key and stores it in the operating system's per-user configuration directory. `ANTHROPIC_API_KEY` takes precedence. `krythiq auth --clear` removes the stored key.

## Configuration

Runtime-loadable names are `krythiq.config.mjs`, `.js`, `.cjs`, `.json`, or `.krythiq/config.json`. TypeScript config files are not loaded.

```js
import { defineConfig } from "krythiq";

export default defineConfig({
  model: "claude-sonnet-4-20250514",
  traces: { enabled: true },
  scan: {
    ignore: ["generated/**"],
    ai: false,
    aiModel: "mistral-large-latest",
    publish: false,
    rules: ".krythiq/rules.json"
  }
});
```

Environment overrides: `KRYTHIQ_TRACE_MODEL`, `KRYTHIQ_MODEL`, or `ANTHROPIC_MODEL` select the trace model; `KRYTHIQ_SCAN_AI=true` and `KRYTHIQ_SCAN_AI_MODEL` configure scan summaries; `KRYTHIQ_PUBLISH=true` enables publishing.

## Known limitations

- No auto-fix, watch mode, AI-code detection, git blame, architecture analysis, caching, background daemon, HTTP API, or HTML report is implemented in this package.
- Custom regular expressions are trusted project configuration; review them before running because JavaScript regex evaluation has no per-rule timeout.
- Semgrep's `auto` rules may download configuration and send scan metadata according to Semgrep's own behavior.
- AI and Supabase integrations require network access and user-provided third-party credentials.

## Troubleshooting and security

- Run `krythiq --help` to confirm the binary is available. If a global install is not on `PATH`, use your package manager's documented global-bin setup or run a project-local binary through that manager.
- If Semgrep is unavailable, install it separately or provide `.krythiq/rules.json`; Krythiq does not silently substitute built-in rules.
- Use `--no-ai` when source-derived trace data must not leave the machine. Review Semgrep's network behavior before using `--config auto` in restricted environments.
- Never commit Anthropic, Mistral, or Supabase credentials. Treat custom rules and shell command strings as trusted input.
- A publish failure is a warning; inspect stderr and your Supabase RLS policy before assuming history was stored.

## Links

- Website and documentation: <https://krythiq.dev/documentation>
- npm package: <https://www.npmjs.com/package/krythiq>
- Repository: <https://github.com/shaypat112/Krythiq>
- Issues: <https://github.com/shaypat112/Krythiq/issues>

## Development and publishing

```bash
npm ci
npm run typecheck
npm run lint
npm test
npm pack --dry-run
```

The npm registry page is generated from this README and `package.json`. Publishing is intentionally not performed by these commands.

## License

MIT
