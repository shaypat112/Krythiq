import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Zap } from "lucide-react";

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

export default function StackTraces() {
  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <p className="mb-5 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Stack Traces</p>
        <h2 className="text-2xl font-semibold text-foreground mb-3">
          Live Trace Analysis
        </h2>
        <p className="text-sm text-muted-foreground">
          Votrio intercepts stack traces in real-time as your process runs and
          explains the root cause with AI analysis — all directly in your
          terminal.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap size={18} />
            How It Works
          </CardTitle>
        </CardHeader>
        <CardDescription className="px-6 pb-6 space-y-4">
          <p className="text-sm text-muted-foreground">
            When you run <code>votrio run "your-command"</code>, votrio:
          </p>
          <ol className="space-y-3 text-sm text-muted-foreground list-decimal list-inside">
            <li>Spawns your process and captures all stderr output</li>
            <li>Watches for stack trace patterns (Node.js, Python, Go, etc)</li>
            <li>
              When a trace is detected, sends it to Claude for AI analysis
            </li>
            <li>Streams back the root cause, explanation, and fix suggestion</li>
            <li>Your process continues running — analysis is non-blocking</li>
          </ol>
        </CardDescription>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Basic Usage</CardTitle>
        </CardHeader>
        <CardDescription className="px-6 pb-6 space-y-4">
          <p className="text-sm text-muted-foreground">
            Start by wrapping any process with votrio:
          </p>
          <CodeBlock code={`votrio run "npm start"`} />
          <p className="text-sm text-muted-foreground">
            When an error occurs, you'll see:
          </p>
          <CodeBlock
            label="Example output"
            code={`$ votrio run "npm start"

● votrio watching — node v20.11.0
● AI trace analysis enabled

  > myapp@1.0.0 start
  > node index.js

Server listening on :3000

TypeError: Cannot read properties of undefined (reading 'id')
    at /src/routes/user.ts:42:18
    at Layer.handle [as handle_request] (/node_modules/express/lib/router/layer.js:95:16)

──────────────────────────────────────────────────────────────────
● votrio — trace analysis

  Root cause: req.user is undefined because the authentication middleware
             didn't run before this route handler.

  Why: Express middleware order matters. The auth middleware must come
       before route definitions. If auth is loaded after routes, req.user
       won't exist when routes execute.

  Fix: Move require("./middleware/auth") before require("./routes") in
       your app.js, or use app.use(authMiddleware) before app.use(routes).

  Confidence: 94%
──────────────────────────────────────────────────────────────────`}
          />
        </CardDescription>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Supported Languages</CardTitle>
        </CardHeader>
        <CardDescription className="px-6 pb-6 space-y-4">
          <p className="text-sm text-muted-foreground">
            Votrio can analyze stack traces from:
          </p>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-mono text-foreground">Node.js / JavaScript</p>
              <p className="text-xs text-muted-foreground">
                Full support for TypeScript too
              </p>
            </div>
            <div>
              <p className="font-mono text-foreground">Python</p>
              <p className="text-xs text-muted-foreground">
                Traceback format recognized
              </p>
            </div>
            <div>
              <p className="font-mono text-foreground">Go</p>
              <p className="text-xs text-muted-foreground">
                goroutine panic traces
              </p>
            </div>
            <div>
              <p className="font-mono text-foreground">Rust</p>
              <p className="text-xs text-muted-foreground">
                backtrace module format
              </p>
            </div>
            <div>
              <p className="font-mono text-foreground">Java</p>
              <p className="text-xs text-muted-foreground">
                Exception traces supported
              </p>
            </div>
            <div>
              <p className="font-mono text-foreground">C / C++</p>
              <p className="text-xs text-muted-foreground">
                Stack traces with line info
              </p>
            </div>
          </div>
        </CardDescription>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Command-Line Options</CardTitle>
        </CardHeader>
        <CardDescription className="px-6 pb-6 space-y-4">
          <div className="space-y-4">
            <div>
              <code className="text-foreground">--no-ai</code>
              <p className="text-xs text-muted-foreground mt-1">
                Disable AI analysis. Votrio will just pipe output through
                without analyzing traces.
              </p>
              <CodeBlock code={`votrio run --no-ai "npm start"`} />
            </div>

            <div>
              <code className="text-foreground">--model &lt;model&gt;</code>
              <p className="text-xs text-muted-foreground mt-1">
                Specify which Anthropic model to use for analysis (default:{" "}
                <code>claude-sonnet-4-20250514</code>)
              </p>
              <CodeBlock
                code={`votrio run --model claude-opus-4-1 "npm start"`}
              />
            </div>

            <div>
              <code className="text-foreground">--verbose</code>
              <p className="text-xs text-muted-foreground mt-1">
                Show debug information from votrio itself (useful for
                troubleshooting)
              </p>
              <CodeBlock code={`votrio run --verbose "npm start"`} />
            </div>
          </div>
        </CardDescription>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Configuration</CardTitle>
        </CardHeader>
        <CardDescription className="px-6 pb-6 space-y-4">
          <p className="text-sm text-muted-foreground">
            Control trace analysis behavior via <code>votrio.config.mjs</code>:
          </p>
          <CodeBlock
            code={`export default defineConfig({
  model: "claude-sonnet-4-20250514",
  
  traces: {
    enabled: true,        // Enable/disable trace analysis
    minConfidence: 70,    // Only show explanations with 70%+ confidence
    showFix: true,        // Include fix suggestions
  },
});`}
          />
          <p className="text-xs text-muted-foreground">
            See the{" "}
            <a
              href="/documentation/config"
              className="text-blue-500 hover:underline"
            >
              Configuration
            </a>{" "}
            page for complete options.
          </p>
        </CardDescription>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle size={18} />
            Common Patterns Detected
          </CardTitle>
        </CardHeader>
        <CardDescription className="px-6 pb-6 space-y-4">
          <p className="text-sm text-muted-foreground">
            Votrio recognizes and explains patterns like:
          </p>
          <ul className="space-y-2 text-sm text-muted-foreground list-disc list-inside">
            <li>Null/undefined reference errors</li>
            <li>Type mismatch errors</li>
            <li>Missing dependencies or modules</li>
            <li>Async/await issues (promise rejections)</li>
            <li>Memory exhaustion or out-of-bounds access</li>
            <li>Permission and file system errors</li>
            <li>Network timeout or connection errors</li>
            <li>Database query failures</li>
          </ul>
        </CardDescription>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Requirements</CardTitle>
        </CardHeader>
        <CardDescription className="px-6 pb-6 space-y-4">
          <ul className="space-y-2 text-sm text-muted-foreground list-disc list-inside">
            <li>
              <strong>Anthropic API Key:</strong> Run{" "}
              <code>votrio auth</code> to configure
            </li>
            <li>
              <strong>Node.js 18+:</strong> Votrio itself requires Node 18 or
              later
            </li>
            <li>
              <strong>Internet connection:</strong> AI analysis requires calls to
              Anthropic API
            </li>
          </ul>
        </CardDescription>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Troubleshooting</CardTitle>
        </CardHeader>
        <CardDescription className="px-6 pb-6 space-y-4">
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-foreground text-sm">
                Trace not being analyzed?
              </h4>
              <p className="text-xs text-muted-foreground mt-1">
                Make sure traces are enabled in your config and your API key is
                set: <code>votrio auth</code>
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-foreground text-sm">
                Analysis taking too long?
              </h4>
              <p className="text-xs text-muted-foreground mt-1">
                Use a faster model like{" "}
                <code>claude-haiku-3.5</code> with{" "}
                <code>--model claude-haiku-3.5</code>
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-foreground text-sm">
                Running out of API quota?
              </h4>
              <p className="text-xs text-muted-foreground mt-1">
                Use <code>votrio run --no-ai</code> to disable AI features, or
                run with <code>--verbose</code> to see API usage
              </p>
            </div>
          </div>
        </CardDescription>
      </Card>
    </div>
  );
}
