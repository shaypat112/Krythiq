# Krythiq CLI architecture

The publishable package is a single Node.js CLI bundled from `src/index.ts`.

```text
dist/index.js
  └─ Commander CLI
     ├─ init → runtime config and .gitignore setup
     ├─ run  → shell child process → optional Anthropic trace explanation
     ├─ scan → file discovery ┬→ custom regex rules
     │                        ├→ optional Semgrep process
     │                        ├→ optional npm audit process
     │                        ├→ optional Mistral summary
     │                        └→ optional Supabase REST insert
     └─ auth → local Anthropic credential storage and validation
```

There is no server, database layer, job runner, cache, plugin system, AST engine, dependency graph, or Python runtime in this package. External scan subprocesses have 120-second timeouts, Mistral requests have a 30-second timeout, and Supabase publishing has a 15-second timeout. Engine and optional-integration failures degrade to warnings rather than aborting an otherwise usable scan.

`src/config.ts` defines the public `defineConfig` helper and loads JavaScript/JSON configuration. `src/commands/scan.ts` owns discovery, normalization, output formatting, CI thresholds, and publishing. `src/commands/run.ts` owns child-process execution and Anthropic streaming. Integration tests in `test/cli.test.mjs` exercise the built executable.
