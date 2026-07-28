# krythiq

> AI-powered terminal trace analysis, security scanning, and code quality for developers who ship fast.

```bash
npm install -g krythiq
```

## Features

- **Live trace analysis** — wraps any process and explains stack traces in real time using Claude AI
- **Security scanning** — detects hardcoded secrets, XSS, SQLi, eval injection, and more
- **Git-aware** — knows which commit introduced the error
- **Zero egress** — your code never leaves your machine (AI calls go directly to Anthropic's API using your own key)
- **Works with any stack** — Node.js, Python, Go, Rust, and more

## Quick Start

```bash
# Install
npm install -g krythiq

# Initialize in your project
krythiq init

# Wrap your start command
krythiq run "npm start"

# Scan for security issues
krythiq scan
```

## Commands

| Command              | Description                                   |
| -------------------- | --------------------------------------------- |
| `krythiq init`        | Initialize krythiq in the current project      |
| `krythiq run "<cmd>"` | Wrap a process and analyze its output         |
| `krythiq scan [path]` | Scan a directory for security vulnerabilities |
| `krythiq auth`        | Configure your Anthropic API key              |

## Configuration

After running `krythiq init`, a `krythiq.config.ts` file is created:

```ts
import { defineConfig } from "krythiq";

export default defineConfig({
  model: "claude-sonnet-4-20250514",
  traces: {
    enabled: true,
    minConfidence: 70,
    showFix: true,
  },
  scan: {
    ignore: ["node_modules/**", "dist/**"],
    autoFix: false,
  },
});
```

## Authentication

Krythiq uses the Anthropic API for AI features. Set your key via:

```bash
krythiq auth
# or
export ANTHROPIC_API_KEY=sk-ant-...
```

Your key is stored locally and never sent to Krythiq's servers.

## License

MIT © Krythiq, Inc.
