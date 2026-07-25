import type { Metadata } from "next";
import Link from "next/link";
import { Activity, ArrowRight, Database, Gauge, Globe2, TriangleAlert, WalletCards } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "System design scenarios - Votrio",
  description: "How Votrio reflects on scalability, resilience, data growth, multi-region readiness, and cost from repository evidence.",
};

const scenarios = [
  {
    icon: Gauge,
    title: "10× traffic spike",
    question: "What happens when a launch, post, or customer sends ten times the normal requests?",
    evidence: "Caches, rate limits, queues, workers, and backpressure.",
    shipNext: "Load-test one critical endpoint and set its first explicit limit.",
  },
  {
    icon: Database,
    title: "100× data growth",
    question: "Will list pages and database queries still behave when today’s small tables become large?",
    evidence: "Migrations, indexes, cursor pagination, and schema structure.",
    shipNext: "Test the hottest query against production-shaped data and inspect its query plan.",
  },
  {
    icon: Activity,
    title: "Upstream outage",
    question: "Does one slow API, database, or model call take the entire request path down with it?",
    evidence: "Timeouts, bounded retries, health checks, circuit breakers, and structured monitoring.",
    shipNext: "Force one dependency to fail and make the user-facing outcome predictable.",
  },
  {
    icon: Globe2,
    title: "Multi-region",
    question: "Can another region be added without breaking sessions, file access, or write consistency?",
    evidence: "Infrastructure definitions, external state, object storage, and deployment configuration.",
    shipNext: "Write down where sessions, uploads, and authoritative writes live.",
  },
  {
    icon: WalletCards,
    title: "10× usage cost",
    question: "Will adoption multiply cloud and model bills faster than revenue or user value?",
    evidence: "Caching, usage limits, asynchronous jobs, quotas, and model-token controls.",
    shipNext: "Measure cost per successful request and add one budget alert.",
  },
];

export default function SystemDesignPage() {
  return (
    <article className="space-y-10">
      <header className="space-y-4">
        <Badge variant="outline">Repository reality checks</Badge>
        <h1 className="max-w-3xl text-3xl font-semibold tracking-tight sm:text-5xl">Ship fast without leaving future-you a mystery.</h1>
        <p className="max-w-3xl text-base leading-7 text-muted-foreground">
          Votrio turns architecture signals already present in a repository into concrete growth scenarios. The goal is not to demand enterprise architecture before launch. It is to show the next safeguard worth shipping before today’s shortcut becomes tomorrow’s outage.
        </p>
        <Button asChild><Link href="/scan">Scan a repository <ArrowRight /></Link></Button>
      </header>

      <section aria-labelledby="scenario-heading">
        <h2 id="scenario-heading" className="text-2xl font-semibold">What every scan asks</h2>
        <div className="mt-5 grid gap-4">
          {scenarios.map(({ icon: Icon, title, question, evidence, shipNext }) => (
            <Card key={title}>
              <CardHeader>
                <div className="flex items-center gap-3"><span className="rounded-lg bg-muted p-2"><Icon className="h-5 w-5" /></span><CardTitle>{title}</CardTitle></div>
              </CardHeader>
              <CardContent className="grid gap-4 text-sm md:grid-cols-3">
                <div><p className="font-medium">Honest question</p><p className="mt-1 leading-6 text-muted-foreground">{question}</p></div>
                <div><p className="font-medium">Repository evidence</p><p className="mt-1 leading-6 text-muted-foreground">{evidence}</p></div>
                <div><p className="font-medium">Ship-next action</p><p className="mt-1 leading-6 text-muted-foreground">{shipNext}</p></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <Card className="border-amber-500/20 bg-amber-500/5">
        <CardHeader><CardTitle className="flex items-center gap-2"><TriangleAlert className="h-5 w-5 text-amber-400" /> What the score cannot know</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm leading-6 text-muted-foreground">
          <p>The assessment is static repository evidence, not a benchmark or capacity test. It cannot see production traffic, managed-service settings, real data distribution, cloud quotas, team operations, or infrastructure stored elsewhere.</p>
          <p>A “ready” signal means useful design primitives were found—not that the system is proven at scale. A “risk” means Votrio could not find a safeguard in supported files—not that none exists. Each result includes its evidence and confidence so you can challenge it.</p>
        </CardContent>
      </Card>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold">A practical loop for impatient teams</h2>
        <ol className="grid gap-3 sm:grid-cols-3">
          {[
            ["1", "Ship the smallest useful version", "Do not invent scale you do not have."],
            ["2", "Read the scenario risks", "Pick the one most likely to hurt users next."],
            ["3", "Add one measurable safeguard", "Load-test, observe, and repeat after the next release."],
          ].map(([number, title, body]) => (
            <li key={number} className="rounded-xl border border-border bg-card p-4"><span className="text-xs font-semibold text-muted-foreground">{number}</span><h3 className="mt-3 font-semibold">{title}</h3><p className="mt-1 text-sm leading-6 text-muted-foreground">{body}</p></li>
          ))}
        </ol>
      </section>
    </article>
  );
}
