# Krythiq CLI architecture

CLI 0.3.0 is bundled from `src/index.ts`; importing the package exposes `defineConfig` without running the CLI.

```text
Commander CLI
  ├─ init → project configuration and .gitignore
  ├─ doctor → local configuration and bounded executable probes
  ├─ scan → file discovery + custom regex rules
  │          ├─ optional Semgrep and npm audit (independently disabled)
  │          ├─ optional Mistral summary
  │          ├─ shared renderer → stdout and optional local artifact
  │          └─ optional dashboard save / Supabase publishing
  ├─ report → validate saved JSON → severity filter → shared renderer
  │          └─ original findings determine CI status
  ├─ run → shell child process → optional Anthropic trace explanation
  ├─ connect / whoami / token → authenticated dashboard workflows
  └─ auth → local Anthropic credential storage
```

`src/config.ts` loads runtime JavaScript/JSON configuration. `src/commands/scan.ts` owns discovery, rules, external engines, and publishing. `src/lib/scan-report.ts` owns the finding schema, validation, formatting (text/JSON/Markdown/SARIF), and CI threshold comparison. `src/utils/report-file.ts` writes color-free, owner-only report files through a temporary file in the destination directory; exclusive linking preserves existing destinations unless replacement is explicit. Artifacts are complete before CI returns failure.

`doctor` and `report` skip the background package update check. `report` reads only a regular JSON file up to 20 MiB. It never scans, uploads, or runs a provider. Its display filter cannot hide evidence from CI. `doctor` checks local prerequisites and environment-key presence without printing secrets or contacting the dashboard. Both configuration loading and executables on PATH are trusted local code.

There is no HTTP server, daemon, cache, automatic fixer, AST engine, dependency graph, or Python runtime in this package. Engine subprocesses have 120-second timeouts; doctor version probes have five-second timeouts, Mistral requests 30 seconds, and legacy Supabase publishing 15 seconds. Optional integration failures are warnings. Invalid report input/output exits 2, CI threshold violations exit 1, and failed doctor checks (or warnings in strict mode) exit 1.

The site uses `app/api/scans/recent` for summary-only history. Owner and selected-scope filters run in PostgREST before the 50-row limit; code findings stay in report details. `app/lib/scan-history.ts` groups repository results, selects the newest evidence, and powers history search, severity filtering, and sorting. This does not change team membership or invitation behavior.

`backend/test/cli.test.mjs` exercises the built executable, including artifact round-trips, safe replacement, filtered CI decisions, malformed evidence, and diagnostic redaction. `app/lib/scan-history.test.mjs` covers grouping, scope query construction, and filters.


## Terminal session protocol

The CLI stores one atomic `dashboardSession` containing its issuer, access and
refresh credentials, and expiry metadata. `dashboardRequest` renews near expiry
or once on a 401; 503/network errors retain credentials. Issuer changes never
forward saved credentials to another origin. Environment tokens remain explicit,
non-renewable overrides.

The website owns session state through service-role-only PostgreSQL RPCs. Device
claiming issues credentials and consumes approval in one transaction. Renewals
issue overlapping one-hour credentials tied to the same parent terminal, with a
fixed 90-day authorization window. Revocation of that parent blocks every access
credential and future renewal. Existing durable tokens still authenticate; old
clients making new connections receive 90-day non-renewable access. Browser
clients can read only terminal display fields and cannot update the credential
rows. CLI Settings and the terminal share aggregate usage totals without row caps.

The migration is `20261017020000_cli_session_lifecycle.sql`. The independent
PostgreSQL regression runner is `npm run test:cli-db`; it never connects to a
configured Supabase or development database. Connection tests use isolated local
mock servers and private CLI config directories.


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
