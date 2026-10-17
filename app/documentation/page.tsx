import Link from "next/link";
import { ArrowRight, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DocumentationCodeBlock } from "./documentation-code-block";

const features = [
  { title: "Composable security scans", description: "Combines custom regular-expression rules, Semgrep when installed, and npm audit when a package lock is present." },
  { title: "Terminal trace explanations", description: "Wraps a trusted shell command and can send recognized stack traces from stderr to Anthropic using your credential." },
  { title: "CI-oriented output", description: "Produces text, JSON, Markdown, or SARIF and can fail CI at a validated severity threshold." },
];

export default function MainDocsPage() {
  return <div className="space-y-10">
    <section className="space-y-5">
      <p className="text-sm font-medium text-muted-foreground">Krythiq CLI 0.3.0</p>
      <h1 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">Scan and trace locally.</h1>
      <p className="max-w-[65ch] leading-7 text-muted-foreground">Krythiq is a Node.js command-line package. Its local scanner orchestrates available engines; its optional AI features require explicit third-party credentials and send bounded finding or trace context to the selected provider.</p>
      <div className="flex flex-wrap gap-3">
        <Button asChild><Link href="/documentation/installation">Install <ArrowRight /></Link></Button>
        <Button asChild variant="outline"><Link href="/documentation/commands">Command reference</Link></Button>
        <Button asChild variant="outline">
          <a href="https://npmx.dev/package/krythiq" target="_blank" rel="noreferrer">
            View on npmx <ExternalLink />
          </a>
        </Button>
      </div>
    </section>
    <p className="max-w-[65ch] text-sm leading-6 text-muted-foreground">Install the current release with npm install -g krythiq@latest, or use npx krythiq@latest. Source checkouts can also build backend/ locally.</p>
    <DocumentationCodeBlock className="rounded-xl" code={"krythiq doctor .\nkrythiq scan . --format json --output .krythiq/reports/scan.json\nkrythiq report .krythiq/reports/scan.json --min-severity high"} />
    <section aria-label="CLI capabilities" className="rounded-2xl bg-card p-6 sm:p-8">
      <dl className="space-y-8">{features.map(({ title, description }) => <div key={title} className="grid gap-2 sm:grid-cols-[13rem_1fr] sm:gap-6"><dt className="font-medium">{title}</dt><dd className="max-w-[60ch] text-sm leading-6 text-muted-foreground">{description}</dd></div>)}</dl>
    </section>
    <section className="space-y-3"><h2 className="text-lg font-semibold">Scope</h2><p className="max-w-[65ch] text-sm leading-7 text-muted-foreground">The CLI does not implement auto-fixing, watch mode, git blame, AI-code detection, architecture scoring, an HTTP API, or an HTML report. Semgrep is optional and the package includes no built-in pattern-rule set.</p></section>
  </div>;
}
