# Votrio CLI

Security scanning and terminal trace analysis from your command line.

Votrio scans source code locally, reports risky patterns in multiple formats, can fail CI at a configured severity, and optionally adds AI-assisted explanations using your own API credentials.

## Install

```bash
npm install --global votrio
```


Votrio requires Node.js 18 or newer.

## Quick start

```bash
cd your-project
votrio init
votrio scan
```

Run `votrio --help` or `votrio scan --help` for the complete command reference.

## Security scanning

```bash
# Scan the current directory
votrio scan

# Scan another path
votrio scan ./src

# Produce machine-readable output
votrio scan --format json
votrio scan --format sarif

# Fail CI when high or critical findings are present
votrio scan --ci --fail-on high

# Add project-specific ignore patterns
votrio scan --ignore "generated/**" "fixtures/**"
```

The scanner supports TypeScript, JavaScript, Python, Go, Rust, Java, C#, and PHP source files. Default exclusions include dependencies, Git metadata, generated builds, minified JavaScript, and common coverage directories.

Supported output formats:

- `text`
- `json`
- `markdown`
- `sarif`

The base scan runs locally. AI features send the relevant analysis context to the configured model provider and are disabled unless explicitly enabled.

## CI example

```yaml
name: Security scan

on:
  pull_request:
  push:
    branches: [main]

jobs:
  votrio:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm install --global votrio
      - run: votrio scan --ci --fail-on high --format sarif
```

## AI-assisted scanning

Set a Mistral API key and opt in for AI-assisted remediation summaries:

```bash
export MISTRAL_API_KEY="your-key"
votrio scan --ai
```

Choose a model with `--ai-model` or `VOTRIO_SCAN_AI_MODEL`:

```bash
votrio scan --ai --ai-model mistral-large-latest
```

## Terminal trace analysis

Wrap a development command to analyze terminal failures:

```bash
votrio auth
votrio run "npm start"
```

`votrio auth` stores the Anthropic key in the operating system's local configuration store. You can also provide `ANTHROPIC_API_KEY` directly. Remove stored credentials with:

```bash
votrio auth --clear
```

Disable AI while preserving command output:

```bash
votrio run "npm test" --no-ai
```

## Configuration

`votrio init` creates `votrio.config.ts` in the current project:

```ts
import { defineConfig } from "votrio";

export default defineConfig({
  traces: {
    enabled: true,
    minConfidence: 70,
    showFix: true,
  },
  scan: {
    ignore: ["generated/**", "fixtures/**"],
    autoFix: false,
    ai: false,
    aiModel: "mistral-large-latest",
  },
});
```

Command-line options override project configuration.

## Custom rules

Pass a JSON rules file with `--rules` or place it at `.votrio/rules.json`:

```json
{
  "ignore": ["legacy/**"],
  "patterns": [
    {
      "pattern": "dangerousFunction\\(",
      "severity": "high",
      "type": "CUSTOM_DANGEROUS_CALL",
      "message": "Avoid dangerousFunction in production code.",
      "suggestion": "Use the validated safe wrapper instead."
    }
  ]
}
```

## Publishing scan summaries

Votrio can publish an authenticated scan summary to a Supabase `scan_history` table:

```bash
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_ANON_KEY="your-anon-key"
export SUPABASE_ACCESS_TOKEN="signed-in-user-jwt"
votrio scan --publish
```

The access token must be a user session JWT accepted by the table's Row Level Security policy. Source file contents and credentials are not included in the published summary.

## Command reference

| Command | Description |
| --- | --- |
| `votrio init` | Create project configuration and update `.gitignore` |
| `votrio scan [path]` | Scan a directory for security findings |
| `votrio run "<command>"` | Run a process with terminal trace analysis |
| `votrio auth` | Configure or clear the Anthropic credential |

Important scan options:

| Option | Description |
| --- | --- |
| `--ci` | Exit non-zero when findings meet the failure threshold |
| `--fail-on <severity>` | Set `low`, `medium`, `high`, or `critical` |
| `--format <format>` | Set `text`, `json`, `markdown`, or `sarif` |
| `--ignore <patterns...>` | Add glob patterns to exclude |
| `--rules <path>` | Load custom JSON rules |
| `--watch` | Rescan when files change |
| `--ai` | Enable AI-assisted summaries |
| `--publish` | Publish a summary to Supabase |

## Updating the npm documentation

The npm registry displays the README included in the published package. To release documentation changes:

```bash
npm version patch
npm publish
```

Run `npm pack --dry-run` first to confirm that `README.md`, compiled files, and runtime assets are included.

## License

MIT
