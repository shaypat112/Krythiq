import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, GitPullRequest, ScanSearch, ShieldCheck } from "lucide-react";

import { ProductVideoStory } from "@/app/components/ProductVideoStory";
import { Nav } from "@/app/landing-page/components/Nav";
import { Founder } from "@/app/landing-page/components/Founder";

export const metadata: Metadata = {
  title: "About Krythiq — Security review for teams that ship fast",
  description: "Why Krythiq exists, how it reviews repositories, and the product walkthrough.",
};

const principles = [
  {
    icon: ScanSearch,
    title: "Show the path",
    detail: "A finding is only useful when you can see where it starts, what it touches, and why it matters.",
  },
  {
    icon: GitPullRequest,
    title: "Fit the way teams ship",
    detail: "Review should end in a small, understandable change—not another dashboard to babysit.",
  },
  {
    icon: ShieldCheck,
    title: "Earn trust with evidence",
    detail: "Read-only access, code-level context, and isolated checks make every recommendation easier to verify.",
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Nav />
      <main className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
        <section className="grid gap-10 py-20 sm:py-28 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-violet-400">About Krythiq</p>
            <h1 className="mt-5 max-w-4xl text-balance text-5xl font-semibold leading-[1.02] tracking-[-0.05em] sm:text-7xl">
              Security review for the people shipping before the meeting starts.
            </h1>
          </div>
          <p className="max-w-xl text-lg leading-8 text-muted-foreground lg:pb-2">
            Krythiq is built for small, fast teams. It reads how your repository fits together, traces real attack paths, and gives you a fix you can actually review.
          </p>
        </section>

        <ProductVideoStory
          className="border-t border-border py-20 sm:py-24"
          eyebrow="The walkthrough"
          title="See what we’re building—and why."
          description="A direct walkthrough of the product, the workflow, and the gap Krythiq is trying to close."
        />

        <section className="border-t border-border py-20 sm:py-24" aria-labelledby="principles-heading">
          <div className="grid gap-10 lg:grid-cols-[0.7fr_1.3fr] lg:gap-16">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">How we build</p>
              <h2 id="principles-heading" className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">Less pitch. More proof.</h2>
            </div>
            <div className="divide-y divide-border border-y border-border">
              {principles.map((principle) => (
                <article key={principle.title} className="grid gap-3 py-6 sm:grid-cols-[auto_0.45fr_0.55fr] sm:items-start sm:gap-5">
                  <principle.icon className="mt-0.5 h-5 w-5 text-violet-400" />
                  <h3 className="font-semibold">{principle.title}</h3>
                  <p className="text-sm leading-6 text-muted-foreground">{principle.detail}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <Founder />

        <section className="mb-20 flex flex-col items-start justify-between gap-6 rounded-3xl border border-border bg-card p-7 sm:flex-row sm:items-center sm:p-10">
          <div>
            <p className="text-2xl font-semibold tracking-tight">Have a repo moving faster than its review?</p>
            <p className="mt-2 text-sm text-muted-foreground">Run a scan and see the paths worth fixing first.</p>
          </div>
          <Link href="/scan" className="inline-flex shrink-0 items-center gap-2 rounded-full bg-foreground px-5 py-3 text-sm font-semibold text-background transition hover:opacity-85">
            Scan a repository <ArrowRight className="h-4 w-4" />
          </Link>
        </section>
      </main>
    </div>
  );
}
