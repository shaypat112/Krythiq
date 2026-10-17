# Krythiq CLI

CLI **0.3.0** adds renewable dashboard connections, hosted `review` and `ask`, the `tokens` alias, local `doctor` diagnostics, and saved-report conversion. Install with `npm install -g krythiq@latest` or run `npx krythiq@latest --help`. For a source build, run `npm ci && npm run build` inside `backend/` and use `node dist/index.js`.

Krythiq is a local command-line wrapper for security scanning and optional terminal stack-trace analysis.

## Requirements and installation

- Node.js 22.13 or newer
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

The CLI opens a short-lived browser authorization page. After approval, use
`krythiq scan --save` when you want a local scan to appear in Recent Scans. A
static terminal scan and saving it both cost 0 Tokens. The browser session and
Supabase credentials are never copied into the terminal.

```bash
npx krythiq connect --status
npx krythiq connect --refresh
npx krythiq connect --name work-laptop
npx krythiq whoami
npx krythiq token
npx krythiq connect --disconnect
```

`krythiq whoami` verifies the saved session with Krythiq.dev and prints the
signed-in account, dashboard address, Token balance, CLI scan count, and scan
Tokens used. A missing, expired, or revoked session exits with an error and a
reconnect instruction.

`krythiq token` performs a live Token balance check for the connected account.

### Connection renewal and revocation

New 0.3.0 browser connections use one-hour access credentials and a separate 90-day terminal authorization. Access renews automatically before expiry, or once after an HTTP 401. `connect --refresh` forces renewal. Renewal keeps the same terminal identity and scan attribution; concurrent CLI processes can finish with overlapping access credentials. The 90-day authorization is a hard deadline: connect through the browser again after it expires. Existing durable credentials still work until revoked; reconnect once with this build to enable automatic renewal. An older client starting a new authorization gets 90-day non-renewable access for compatibility.

`connect --disconnect` revokes the terminal remotely and clears its local connection. If the server is unreachable, local credentials are still removed, the command exits 1, and it directs you to revoke the terminal in Settings → CLI. Revoking from the UI blocks both access and renewal. `connect --status` exits 1 when disconnected. `whoami`, `token`, and Settings → CLI use the same full-history CLI usage totals and live account balance; authorized terminals are not necessarily online.

Credentials and the dashboard origin are stored together in the user's private CLI configuration. `KRYTHIQ_CONFIG_DIR` optionally selects a separate config directory. Changing `KRYTHIQ_DASHBOARD_URL` cannot send a saved credential to another dashboard: connect to that origin first. Use HTTPS, except for loopback HTTP development such as `http://localhost:3000`.

`KRYTHIQ_CLI_TOKEN` explicitly overrides a saved browser session. It cannot auto-renew; replace it when expired, or unset it before `connect` to use renewable browser authorization. Temporary network failures and HTTP 503 responses retain saved credentials. A definitive refresh rejection removes only dashboard credentials, keeping the separate Anthropic key.

Use `--no-browser` on remote or headless machines. Keep the terminal running until the browser says **Terminal connected**; approval alone is not the completed exchange. The browser login preserves the terminal code through sign-in.

**Server rollout:** apply `supabase/migrations/20261017020000_cli_session_lifecycle.sql` before deploying the updated CLI API. It adds atomic device exchange, short-lived access credentials, renewal and revocation RPCs, and shared usage totals. Browser clients cannot modify credential hashes or undo revocation. See `tests/database/README.md` for the isolated migration regression test.

## `krythiq doctor [path]`

```bash
krythiq doctor .
krythiq doctor . --format json
krythiq doctor . --strict
```

Checks the Node version, project directory, configuration loading, Semgrep, npm audit prerequisites, Git, and whether optional AI environment keys are present. It never prints key values, validates credentials, or contacts the dashboard. Version probes use the executables on your `PATH`; project config is trusted executable JavaScript, just as it is during a scan. Each probe has a five-second timeout.

Optional missing tools produce warnings. Failed required checks exit 1; `--strict` also exits 1 for warnings. Diagnostics describe local readiness, not a security result or proof that a remote service is reachable.

## `krythiq scan [path]`

The scan command accepts a directory (default `.`) and discovers `ts`, `tsx`, `js`, `jsx`, `py`, `go`, `rs`, `java`, `cs`, and `php` files. It combines:

- patterns from `.krythiq/rules.json` or `--rules`;
- Semgrep `scan --config auto`, when Semgrep is installed; and
- `npm audit --omit=dev`, when the scanned directory contains `package-lock.json`.

Semgrep and npm-audit failures are warnings: the other available engines still run. No built-in pattern rules are bundled, so a scan without Semgrep and without a custom rules file performs only npm-audit when a lockfile exists.

```bash
krythiq scan ./src
krythiq scan ./src --save
krythiq scan --format json
krythiq scan --format markdown
krythiq scan --format sarif
krythiq scan --ci --fail-on high
krythiq scan --ignore "generated/**" "fixtures/**"
krythiq scan --rules ./security-rules.json
```

Scans remain local by default. Add `--save` to put the result in Krythiq.dev
Recent Scans. This requires `krythiq connect` and costs 0 Tokens. Save status and failures go to stderr for every output format; JSON stdout remains machine-readable. Saving no longer makes an extra account-balance request; use `whoami` or `token` for a live balance check.

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

### Save and convert local reports

```bash
krythiq scan . --format json --output .krythiq/reports/scan.json
krythiq report .krythiq/reports/scan.json --min-severity high
krythiq report .krythiq/reports/scan.json --format markdown --output review.md
krythiq report .krythiq/reports/scan.json --format sarif --output results.sarif
krythiq report .krythiq/reports/scan.json --ci --fail-on high
```

`--output` writes the selected format and still prints the report to stdout; the file extension does not choose the format. Parent directories are created. Files use owner-only permissions where supported and contain no terminal color escapes. Existing files are preserved unless `--overwrite` is explicit. A write failure exits 2. Report files can contain source snippets, so keep them private and avoid committing them.

`report` accepts the JSON object produced by `scan --format json`, validates each finding, and converts it without running engines, calling AI, or uploading anything. Input must be a regular file no larger than 20 MiB with at most 100,000 findings. `--min-severity` filters the displayed findings. With `--ci`, **all original findings** determine the exit code, so hiding low-severity rows cannot bypass a CI threshold. `report` exits 2 for invalid input or output errors. A scan writes its report before returning a CI failure.

### Choose the engines

```bash
krythiq scan . --rules ./security-rules.json --no-semgrep --no-audit
```

Both external engines are enabled by default when applicable. `--no-semgrep` skips Semgrep; `--no-audit` skips npm audit. These flags do not disable custom rules, or AI/publishing enabled through config or environment. For a scan with no outbound requests, set `NO_UPDATE_NOTIFIER=1`, use reviewed custom rules and both engine-disabling flags, and leave AI, dashboard saving, and publishing disabled. There is no built-in rule pack: disabling both engines without providing rules performs no vulnerability checks.

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
- package details: <https://npmx.dev/package/krythiq>
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


### Connected terminal actions (0.3.0)

Production CLI requests resolve `https://krythiq.dev` to `https://www.krythiq.dev` before attaching credentials. This fixes false “expired” errors caused by cross-host redirects stripping Authorization. Existing saved connections use the canonical origin automatically. Browser authorization now checks the saved credential against the account endpoint before reporting success.

```bash
krythiq tokens                     # alias for token
krythiq tokens --history           # latest 50 account transactions
krythiq tokens --json
krythiq review src/auth.ts         # 15 account Tokens; prompts before upload
krythiq ask "Explain this handler" --file src/auth.ts src/routes.ts  # 10 Tokens
```

Hosted commands use the same authenticated AI routes, action prices, account balance, idempotent reservations, and automatic provider-failure refunds as the UI. `review` uploads one UTF-8 text file up to 4000 bytes; `ask` uploads 1–5 selected files up to 2000 bytes each. Use `--yes` for scripts and `--json` for machine output. Local static scans remain free. These actions require the updated server and its configured Mistral provider; connecting alone does not enable hosted actions on an older deployment.

Each paid request prints a request ID to stderr before submission. After a network interruption, retry with `--request-id <printed-id>` and identical input. The key includes an action/payload digest; a completed retry returns the cached result with no additional charge. Do not change the selected files when recovering an interrupted request. Pending requests return a retryable conflict; refunded requests require a new ID.

The web project now uses `file:backend` for its CLI dependency so `npx krythiq` uses the local build. Run `npm run install:backend` to prepare source checkouts. For a global source installation, build and run `npm install -g ./backend`; verify both `krythiq --version` and `npx krythiq --version`. Registry users can install this release with `npm install -g krythiq@latest`. Apply `20261017020000_cli_session_lifecycle.sql` before deploying the updated server for renewable 90-day terminal authorizations.
