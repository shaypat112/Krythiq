import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

export default function ConfigPage() {
  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h2 className="text-2xl font-semibold mb-2 text-foreground">
          Configuration
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          Votrio is zero-config by default, but you can customize its behavior
          with a <code>votrio.config.mjs</code> file in your project root.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Basic Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Create a <code>votrio.config.mjs</code> file to customize votrio:
          </p>
          <CodeBlock
            label="votrio.config.mjs"
            code={`import { defineConfig } from "votrio";

export default defineConfig({
  // AI model for trace analysis
  model: "claude-sonnet-4-20250514",

  // Stack trace analysis settings
  traces: {
    enabled: true,
    minConfidence: 70,  // Minimum confidence to display (0-100)
    showFix: true,      // Show fix suggestions
  },

  // Security scanning settings
  scan: {
    ignore: ["node_modules/**", ".next/**", "dist/**"],
    autoFix: false,
  },

  // Code quality detection
  slop: {
    enabled: true,
    checkImports: true,  // Flag imports that don't exist in npm
  },
});`}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Traces Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Control how votrio analyzes stack traces when using{" "}
            <code>votrio run</code>:
          </p>

          <div className="space-y-3">
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-2">
                traces.enabled
              </h4>
              <p className="text-xs text-muted-foreground mb-2">
                Enable/disable stack trace analysis (default: <code>true</code>)
              </p>
              <CodeBlock
                code={`traces: {
  enabled: false,  // Disable trace analysis
}`}
              />
            </div>

            <div>
              <h4 className="text-sm font-semibold text-foreground mb-2">
                traces.minConfidence
              </h4>
              <p className="text-xs text-muted-foreground mb-2">
                Only show AI explanations with confidence above this threshold
                (0-100). Default: <code>70</code>
              </p>
              <CodeBlock
                code={`traces: {
  minConfidence: 85,  // Only show high-confidence explanations
}`}
              />
            </div>

            <div>
              <h4 className="text-sm font-semibold text-foreground mb-2">
                traces.showFix
              </h4>
              <p className="text-xs text-muted-foreground mb-2">
                Display code fixes and suggestions (default: <code>true</code>)
              </p>
              <CodeBlock
                code={`traces: {
  showFix: false,  // Only show explanation, no fixes
}`}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Scan Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Configure security scanning behavior when using{" "}
            <code>votrio scan</code>:
          </p>

          <div className="space-y-3">
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-2">
                scan.ignore
              </h4>
              <p className="text-xs text-muted-foreground mb-2">
                Glob patterns to exclude from scanning
              </p>
              <CodeBlock
                code={`scan: {
  ignore: [
    "node_modules/**",
    ".next/**",
    "dist/**",
    "build/**",
    "*.test.js"
  ]
}`}
              />
            </div>

            <div>
              <h4 className="text-sm font-semibold text-foreground mb-2">
                scan.autoFix
              </h4>
              <p className="text-xs text-muted-foreground mb-2">
                Automatically fix safe, non-breaking issues (default:{" "}
                <code>false</code>)
              </p>
              <CodeBlock
                code={`scan: {
  autoFix: true,  // Auto-apply safe patches
}`}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>AI Model Selection</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Votrio uses Anthropic models for trace analysis. You can override
            the default model:
          </p>

          <CodeBlock
            code={`export default defineConfig({
  model: "claude-opus-4-1",  // Use Claude Opus (more capable)
});`}
          />

          <p className="text-xs text-muted-foreground">
            Available models: <code>claude-opus-4-1</code>,{" "}
            <code>claude-sonnet-4-20250514</code> (default),{" "}
            <code>claude-haiku-3.5</code>
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Custom Rules</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Define custom security rules in <code>.votrio/rules.json</code>:
          </p>

          <CodeBlock
            label=".votrio/rules.json"
            code={`{
  "patterns": [
    {
      "pattern": "TODO.*FIXME",
      "severity": "low",
      "type": "CODE_MARKER",
      "message": "Found TODO marker in code",
      "suggestion": "Address the TODO before merging"
    },
    {
      "pattern": "console\\\\.(log|error)\\\\(",
      "severity": "medium",
      "type": "DEBUG_LOG",
      "message": "Debug logging detected",
      "suggestion": "Remove console logs in production code"
    }
  ],
  "ignore": [
    "**/*.test.js",
    "**/node_modules/**"
  ]
}`}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Environment Variables</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Override configuration via environment variables:
          </p>

          <div className="space-y-3 text-xs">
            <div>
              <code className="text-foreground">ANTHROPIC_API_KEY</code>
              <p className="text-muted-foreground mt-1">
                Your Anthropic API key (instead of using votrio auth)
              </p>
            </div>
            <div>
              <code className="text-foreground">VOTRIO_MODEL</code>
              <p className="text-muted-foreground mt-1">
                Override the AI model for trace analysis
              </p>
            </div>
            <div>
              <code className="text-foreground">VOTRIO_TRACE_MODEL</code>
              <p className="text-muted-foreground mt-1">
                Specifically override the trace analysis model (takes precedence
                over VOTRIO_MODEL)
              </p>
            </div>
          </div>

          <CodeBlock
            code={`export ANTHROPIC_API_KEY="sk-ant-..."
export VOTRIO_MODEL="claude-opus-4-1"
votrio run "npm start"`}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Full Configuration Example</CardTitle>
        </CardHeader>
        <CardContent>
          <CodeBlock
            label="votrio.config.mjs (complete example)"
            code={`import { defineConfig } from "votrio";

export default defineConfig({
  // Use a specific model
  model: "claude-sonnet-4-20250514",

  // Stack trace analysis
  traces: {
    enabled: true,
    minConfidence: 70,
    showFix: true,
  },

  // Security scanning
  scan: {
    ignore: [
      "node_modules/**",
      ".next/**",
      "dist/**",
      "build/**",
      "coverage/**",
      "*.lock",
    ],
    autoFix: false,  // Don't auto-fix unless explicitly running votrio scan --fix
  },

  // Code quality
  slop: {
    enabled: true,
    checkImports: true,
  },
});`}
          />
        </CardContent>
      </Card>
    </div>
  );
}
