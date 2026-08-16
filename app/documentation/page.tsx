import Link from "next/link";
import { ArrowRight, ScanSearch, Terminal, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DocumentationCodeBlock } from "./documentation-code-block";

const features = [
  { icon: ScanSearch, title: "Composable security scans", description: "Combines custom regular-expression rules, Semgrep when installed, and npm audit when a package lock is present." },
  { icon: Terminal, title: "Terminal trace explanations", description: "Wraps a trusted shell command and can send recognized stack traces from stderr to Anthropic using your credential." },
  { icon: Wrench, title: "CI-oriented output", description: "Produces text, JSON, Markdown, or SARIF and can fail CI at a validated severity threshold." },
];

export default function MainDocsPage() {
  return <div className="space-y-10">
    <section className="space-y-5">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Krythiq CLI 0.1.1</p>
      <h1 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">Local scanning and optional trace analysis.</h1>
      <p className="max-w-3xl leading-7 text-muted-foreground">Krythiq is a Node.js command-line package. Its local scanner orchestrates available engines; its optional AI features require explicit third-party credentials and send bounded finding or trace context to the selected provider.</p>
      <div className="flex gap-3"><Button asChild><Link href="/documentation/installation">Install <ArrowRight /></Link></Button><Button asChild variant="outline"><Link href="/documentation/commands">Command reference</Link></Button></div>
    </section>
    <DocumentationCodeBlock className="rounded-xl" code={"npm install --global krythiq\nkrythiq scan --format json"} />
    <section className="grid gap-4 sm:grid-cols-3">{features.map(({icon: Icon, title, description}) => <Card key={title}><CardHeader><Icon className="size-5"/><CardTitle>{title}</CardTitle><CardDescription>{description}</CardDescription></CardHeader></Card>)}</section>
    <Card><CardHeader><CardTitle>Scope</CardTitle><CardDescription>The CLI does not implement auto-fixing, watch mode, git blame, AI-code detection, architecture scoring, an HTTP API, or an HTML report. Semgrep is optional and the package includes no built-in pattern-rule set.</CardDescription></CardHeader></Card>
  </div>;
}
