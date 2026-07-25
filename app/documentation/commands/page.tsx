import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Zap, Shield, Settings } from "lucide-react";

function CodeBlock({ code, label }: { code: string; label?: string }) {
  return (
    <div className="group rounded-lg border border-zinc-800 bg-zinc-950 overflow-hidden my-4">
      {label && (
        <div className="px-4 py-2 border-b border-zinc-800 bg-zinc-900/50">
          <span className="text-xs text-zinc-500 font-mono">{label}</span>
        </div>
      )}
      <pre className="px-4 py-3.5 text-zinc-200 font-mono text-sm overflow-x-auto">
        <code>{code}</code>
      </pre>
    </div>
  );
}

export default function CommandsPage() {
  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h2 className="text-2xl font-semibold mb-4 text-foreground">
          Votrio CLI Commands
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          Complete reference for all votrio commands and options.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings size={18} />
            init
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Initialize votrio in your project. Creates config file, .votrio/
            directory, and updates .gitignore.
          </p>

          <CodeBlock code={`votrio init`} />

          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">
              Options
            </h4>
            <div className="space-y-2 text-xs">
              <div>
                <code className="text-foreground">--skip-gitignore</code>
                <p className="text-muted-foreground">
                  Don't modify .gitignore (default: false)
                </p>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">
              What It Does
            </h4>
            <ul className="space-y-2 text-sm text-muted-foreground list-disc list-inside">
              <li>Detects your project stack (Node.js, TypeScript, Go, etc)</li>
              <li>Creates votrio.config.mjs with sensible defaults</li>
              <li>Creates .votrio/ directory for custom rules and data</li>
              <li>Adds .votrio/ to .gitignore to avoid committing cache</li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">
              Example
            </h4>
            <CodeBlock
              label="Output"
              code={`$ cd my-project
$ votrio init

→ Detecting project stack...
✓ Node.js / TypeScript detected
✓ Created votrio.config.mjs
✓ Added .votrio/ to .gitignore

Ready. Run: votrio run "npm start"`}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap size={18} />
            run
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Wrap a process and intercept stack traces for AI analysis. Streams
            explanations as errors occur.
          </p>

          <CodeBlock code={`votrio run "npm start"`} />

          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">
              Options
            </h4>
            <div className="space-y-3 text-xs">
              <div>
                <code className="text-foreground">--no-ai</code>
                <p className="text-muted-foreground">
                  Disable AI analysis, just pipe output through (default: false)
                </p>
              </div>
              <div>
                <code className="text-foreground">--model &lt;model&gt;</code>
                <p className="text-muted-foreground">
                  Specify Anthropic model (default: claude-sonnet-4-20250514)
                </p>
              </div>
              <div>
                <code className="text-foreground">--verbose</code>
                <p className="text-muted-foreground">
                  Print debug info from votrio itself
                </p>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">
              Examples
            </h4>
            <CodeBlock
              code={`# Wrap your dev server
votrio run "npm start"

# Works with any process
votrio run "python app.py"
votrio run "go run ."
votrio run "cargo run"

# Use a different AI model for faster analysis
votrio run --model claude-haiku-3.5 "npm test"

# Disable AI (just pipe output through)
votrio run --no-ai "npm start"

# Debug votrio itself
votrio run --verbose "npm start"`}
            />
          </div>

          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">
              Requirements
            </h4>
            <ul className="space-y-1 text-sm text-muted-foreground list-disc list-inside">
              <li>Anthropic API key configured (run votrio auth)</li>
              <li>votrio.config.mjs present in project root</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield size={18} />
            scan
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Scan a directory for security vulnerabilities and code quality
            issues. Supports multiple output formats and CI integration.
          </p>

          <CodeBlock code={`votrio scan [path]`} />

          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">
              Options
            </h4>
            <div className="space-y-3 text-xs">
              <div>
                <code className="text-foreground">--fix</code>
                <p className="text-muted-foreground">
                  Auto-apply safe patches where possible
                </p>
              </div>
              <div>
                <code className="text-foreground">--ci</code>
                <p className="text-muted-foreground">
                  Exit with code 1 if issues found (for CI pipelines)
                </p>
              </div>
              <div>
                <code className="text-foreground">
                  --fail-on &lt;severity&gt;
                </code>
                <p className="text-muted-foreground">
                  Fail when issues of this severity or higher are found:{" "}
                  <code>low</code> | <code>medium</code> | <code>high</code> |{" "}
                  <code>critical</code> (default: <code>high</code>)
                </p>
              </div>
              <div>
                <code className="text-foreground">--format &lt;fmt&gt;</code>
                <p className="text-muted-foreground">
                  Output format: <code>text</code> | <code>json</code> |{" "}
                  <code>markdown</code> | <code>sarif</code> (default:{" "}
                  <code>text</code>)
                </p>
              </div>
              <div>
                <code className="text-foreground">
                  --ignore &lt;patterns...&gt;
                </code>
                <p className="text-muted-foreground">
                  Glob patterns to exclude from scan (can specify multiple)
                </p>
              </div>
              <div>
                <code className="text-foreground">--rules &lt;path&gt;</code>
                <p className="text-muted-foreground">
                  Path to custom rules JSON (default: .votrio/rules.json)
                </p>
              </div>
              <div>
                <code className="text-foreground">--watch</code>
                <p className="text-muted-foreground">
                  Daemon mode: rescan on file changes
                </p>
              </div>
              <div>
                <code className="text-foreground">--publish</code>
                <p className="text-muted-foreground">
                  Publish scan summary to Supabase scan_history table
                </p>
              </div>
              <div>
                <code className="text-foreground">--ai</code>
                <p className="text-muted-foreground">
                  Enable AI refactoring suggestions via Mistral
                </p>
              </div>
              <div>
                <code className="text-foreground">--ai-model &lt;model&gt;</code>
                <p className="text-muted-foreground">
                  Mistral model name (default: mistral-large-latest)
                </p>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">
              Examples
            </h4>
            <CodeBlock
              code={`# Scan current directory
votrio scan

# Scan specific path
votrio scan ./src

# Scan and auto-fix safe issues
votrio scan --fix

# CI/CD integration
votrio scan --ci --fail-on high

# Export as JSON for tooling
votrio scan --format json > scan-results.json

# Ignore certain paths
votrio scan --ignore "**/*.test.js" --ignore "**/node_modules/**"

# Watch mode for development
votrio scan --watch

# Get AI suggestions
votrio scan --ai --ai-model mistral-large-latest`}
            />
          </div>

          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">
              What It Detects
            </h4>
            <ul className="space-y-1 text-sm text-muted-foreground list-disc list-inside">
              <li>Hardcoded secrets and credentials</li>
              <li>eval() usage and code injection risks</li>
              <li>dangerouslySetInnerHTML and XSS vulnerabilities</li>
              <li>Child process execution risks</li>
              <li>Custom security rules (from .votrio/rules.json)</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings size={18} />
            auth
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Configure your Anthropic API key for AI-powered features. Stores
            credentials securely in your home directory.
          </p>

          <CodeBlock code={`votrio auth`} />

          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">
              Options
            </h4>
            <div className="space-y-2 text-xs">
              <div>
                <code className="text-foreground">--clear</code>
                <p className="text-muted-foreground">
                  Remove stored API key credentials
                </p>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">
              Examples
            </h4>
            <CodeBlock
              code={`# Set up API key (prompts for input)
votrio auth

# Clear stored credentials
votrio auth --clear

# Alternative: Set via environment variable
export ANTHROPIC_API_KEY="sk-ant-..."
votrio run "npm start"`}
            />
          </div>

          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">
              Getting Your API Key
            </h4>
            <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
              <li>
                Visit{" "}
                <a
                  href="https://console.anthropic.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline"
                >
                  console.anthropic.com
                </a>
              </li>
              <li>Sign up or log in to your account</li>
              <li>Navigate to API Keys section</li>
              <li>Create a new API key</li>
              <li>Run votrio auth and paste the key when prompted</li>
            </ol>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle size={18} />
            Global Options
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            These options work with any votrio command:
          </p>
          <div className="space-y-3 text-xs">
            <div>
              <code className="text-foreground">-v, --version</code>
              <p className="text-muted-foreground">Print votrio version</p>
            </div>
            <div>
              <code className="text-foreground">-h, --help</code>
              <p className="text-muted-foreground">Show help message</p>
            </div>
          </div>

          <CodeBlock
            code={`votrio --version
votrio --help
votrio run --help`}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Getting Help</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <CodeBlock
            code={`# General help
votrio --help

# Help for specific command
votrio init --help
votrio run --help
votrio scan --help
votrio auth --help`}
          />
        </CardContent>
      </Card>
    </div>
  );
}
