import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DocumentationCodeBlock } from "../documentation-code-block";

const steps = [
  { title: "Check your setup", body: "Initialize the project, then check Node, configuration, and scan prerequisites. Semgrep is optional, but you need it or reviewed custom rules for code checks. npm audit runs when a package-lock.json is present.", code: "krythiq init\nkrythiq doctor ." },
  { title: "Keep a scan report", body: "Run the available checks and retain a reusable JSON artifact. Existing report files are preserved; use a new filename or add --overwrite when replacement is intentional.", code: "krythiq scan . --format json --output .krythiq/reports/scan.json" },
  { title: "Review and export the evidence", body: "Filter the saved findings or convert them for review without running another scan or calling a provider. Report files can contain source snippets, so keep them private.", code: "krythiq report .krythiq/reports/scan.json --min-severity high\nkrythiq report .krythiq/reports/scan.json --format sarif --output .krythiq/reports/results.sarif" },
  { title: "Use the result in CI", body: "The process exits 1 when an original finding meets the threshold. Display filters do not change the CI decision. Invalid paths, malformed reports, and failed artifact writes exit 2.", code: "krythiq report .krythiq/reports/scan.json --ci --fail-on high" },
  { title: "Optionally save to your dashboard", body: "Connect the terminal through browser approval, then opt in to saving a scan. Static terminal scans and dashboard saving cost zero Tokens. Scan History supports search, severity filters, sorting, and terminal source labels.", code: "krythiq connect\nkrythiq scan . --save" },
];

export default function QuickStartPage() {
  return <article className="space-y-10">
    <header><h1 className="text-3xl font-semibold">Your first scan report</h1><p className="mt-4 max-w-[65ch] leading-7 text-muted-foreground">Check your tools, scan a project, and keep evidence you can review again.</p></header>
    <section className="space-y-4 rounded-2xl bg-card p-6"><h2 className="text-lg font-semibold">Install CLI 0.3.0</h2><p className="text-sm leading-6 text-muted-foreground">Install the latest CLI release, then check its version. You can also use npx krythiq@latest for each command. Hosted AI and renewal require the matching updated server.</p><DocumentationCodeBlock code={"npm install -g krythiq@latest\nkrythiq --version\nkrythiq doctor ."} /></section>
    <ol className="space-y-10">{steps.map(step => <li key={step.title} className="space-y-4"><h2 className="text-xl font-semibold">{step.title}</h2><p className="max-w-[65ch] text-sm leading-7 text-muted-foreground">{step.body}</p><DocumentationCodeBlock code={step.code} /></li>)}</ol>
    <section className="space-y-4 rounded-2xl bg-muted p-6"><h2 className="text-lg font-semibold">Control what leaves your machine</h2><p className="max-w-[65ch] text-sm leading-7 text-muted-foreground">Custom rules run locally. Semgrep auto configuration and npm audit can use network services. Optional AI summaries send finding context to Mistral; optional trace explanations send recognized stderr traces to Anthropic. Set NO_UPDATE_NOTIFIER=1, use reviewed custom rules with --no-semgrep --no-audit, and leave AI, saving, and publishing disabled for a scan without outbound requests.</p><Button asChild variant="outline"><Link href="/documentation/commands">Full command reference <ArrowRight /></Link></Button></section>
  </article>;
}
