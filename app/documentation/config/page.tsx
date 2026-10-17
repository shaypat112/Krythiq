import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DocumentationCodeBlock } from "../documentation-code-block";

export default function ConfigPage() {
  return <article className="space-y-8">
    <header><h1 className="text-3xl font-semibold">CLI configuration</h1><p className="mt-3 text-muted-foreground">Use a runtime-loadable JavaScript or JSON file. TypeScript config files are intentionally rejected with a warning.</p></header>
    <Card><CardHeader><CardTitle>krythiq.config.mjs</CardTitle></CardHeader><CardContent><DocumentationCodeBlock code={`import { defineConfig } from "krythiq";

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
});`} /></CardContent></Card>
    <Card><CardHeader><CardTitle>Engine and output controls</CardTitle></CardHeader><CardContent className="space-y-3 text-sm leading-6 text-muted-foreground"><p>Use <code>scan --no-semgrep</code> or <code>--no-audit</code> to skip an external engine. These do not disable AI summaries, saving, or publishing enabled separately. There is no built-in rule pack; reviewed custom rules are needed when both engines are off.</p><p>Use <code>--format json --output .krythiq/reports/scan.json</code> to retain evidence. Paths and output formats are explicit CLI options. Existing files are preserved unless <code>--overwrite</code> is passed.</p><p><code>doctor [path]</code> loads the configuration in that directory and reports local prerequisites. Config files are trusted executable JavaScript.</p></CardContent></Card>
    <Card><CardHeader><CardTitle>Recognized files and precedence</CardTitle></CardHeader><CardContent className="space-y-3 text-sm text-muted-foreground"><p>The first existing file is loaded: <code>krythiq.config.mjs</code>, <code>.js</code>, <code>.cjs</code>, <code>.json</code>, then <code>.krythiq/config.json</code>.</p><p>CLI options select rules, AI model, and publishing when provided. Environment flags can also enable AI summaries or publishing. Trace model precedence is the explicit <code>--model</code>, then environment, then config, then the built-in default.</p></CardContent></Card>
  </article>;
}
