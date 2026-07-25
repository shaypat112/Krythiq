import Link from "next/link";
import {
  ArrowRight,
  Terminal,
  ShieldAlert,
  GitBranch,
  Cpu,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const features = [
  {
    icon: Terminal,
    title: "Live Trace Analysis",
    description:
      "Intercepts stack traces as they happens and explains the root cause in-line.",
  },
  {
    icon: ShieldAlert,
    title: "AI-Powered Security Scanning",
    description:
      "Uses machine learning with scikit-learn to detect security vulnerabilities, code quality issues, and architectural problems.",
  },
  {
    icon: Cpu,
    title: "Real Machine Learning",
    description:
      "Built on Python/scikit-learn for actual data analysis - no mock data or hardcoded values.",
  },
  {
    icon: GitBranch,
    title: "Git-Aware Diffs",
    description:
      "Connects errors to the commit that introduced them and suggests fixes.",
  },
];

const stats = [
  { value: "< 50ms", label: "trace capture latency" },
  { value: "92%", label: "root cause accuracy" },
  { value: "0", label: "cloud data egress" },
];

export default function MainDocsPage() {
  return (
    <div className="space-y-12">
      <section className="space-y-6">
        <span className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">v0.1.0-beta now available</span>

        <div className="space-y-4">
          <h1 className="text-4xl font-semibold leading-[1.1] tracking-tight text-foreground sm:text-5xl">
            The AI debugger that
            <span className="block text-muted-foreground">
              lives in your shell.
            </span>
          </h1>
          <p className="max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Votrio wraps your terminal process, intercepts errors in real time,
            and explains stack traces while scanning for security risks.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link href="/documentation/installation">
              Get Started <ArrowRight size={14} />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/documentation/quickstart">Quick Start</Link>
          </Button>
        </div>
      </section>

      <div className="rounded-xl border border-border bg-card px-4 py-3 font-mono text-sm text-foreground">
        <span className="select-none text-muted-foreground">$</span> npm install -g
        votrio
        <span className="ml-auto hidden text-xs text-muted-foreground sm:inline">
          node larger than 18 required
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map((s) => (
          <Card key={s.label} className="text-center">
            <CardHeader>
              <CardTitle className="text-2xl font-semibold text-foreground">
                {s.value}
              </CardTitle>
              <CardDescription className="text-xs">{s.label}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">What Votrio does</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <Card key={f.title}>
                <CardHeader className="gap-3">
                  <div className="flex items-center gap-2 text-foreground">
                    <Icon size={18} />
                    <CardTitle>{f.title}</CardTitle>
                  </div>
                  <CardDescription>{f.description}</CardDescription>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="space-y-4 rounded-xl border border-border bg-card p-6">
        <h2 className="text-lg font-semibold text-foreground">Why Votrio?</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Most security tools are reactive. Votrio is proactive by sitting
          directly in your shell and catching issues before they ship.
        </p>
        <ul className="space-y-2 pt-1">
          {[
            "Runs locally - your code never leaves your machine",
            "Wraps any process: Node, Python, Go, Rust, and more",
            "Zero-config to start, deeply configurable when needed",
            "Designed for AI-heavy codebases (Cursor, Copilot, Claude Code)",
          ].map((item) => (
            <li
              key={item}
              className="flex items-start gap-2 text-sm text-muted-foreground"
            >
              <CheckCircle2 size={14} className="mt-0.5 text-foreground" />
              {item}
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col items-start justify-between gap-4 rounded-xl border border-border bg-card p-5 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-semibold text-foreground">Ready to install?</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Takes less than 30 seconds.
          </p>
        </div>
        <Button asChild>
          <Link href="/documentation/installation">
            Installation <ArrowRight size={14} />
          </Link>
        </Button>
      </section>
    </div>
  );
}
