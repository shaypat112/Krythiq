import Link from "next/link";
import { ArrowRight, BookOpen, LayoutDashboard, Terminal, Users } from "lucide-react";
import { FadeIn } from "../shared/FadeIn";

export function ProductPaths() {
  return (
    <section className="border-t border-border py-20 sm:py-24" aria-labelledby="product-paths-heading">
      <FadeIn className="max-w-2xl">
        <h2 id="product-paths-heading" className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
          Use the dashboard with your team, or scan from the terminal.
        </h2>
        <p className="mt-4 text-sm leading-7 text-muted-foreground sm:text-base">
          The same security workflow is available in two forms, depending on how much history and collaboration you need.
        </p>
      </FadeIn>

      <div className="mt-10 grid gap-4 lg:grid-cols-2">
        <FadeIn delay={0.05}>
          <article className="relative h-full overflow-hidden rounded-3xl border border-border bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,.13),transparent_38%),var(--card)] p-6 sm:p-8">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-sky-400/20 bg-sky-400/10 text-sky-400">
              <LayoutDashboard className="h-5 w-5" />
            </div>
            <h3 className="mt-6 text-xl font-semibold">Web dashboard</h3>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              Built for teams that need repository history, richer scan data, saved reports, finding review, shared decisions, integrations, and billing in one workspace.
            </p>
            <div className="mt-6 flex items-center gap-2 text-xs text-muted-foreground">
              <Users className="h-4 w-4" />
              Team context, report history, and deeper analysis
            </div>
            <Link href="/scan" className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-foreground transition hover:opacity-70">
              Open the dashboard <ArrowRight className="h-4 w-4" />
            </Link>
          </article>
        </FadeIn>

        <FadeIn delay={0.1}>
          <article className="relative h-full overflow-hidden rounded-3xl border border-border bg-[#090b10] p-6 text-white shadow-[inset_0_1px_rgba(255,255,255,.05)] sm:p-8">
            <div className="flex items-center justify-between gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-400/10 text-emerald-400">
                <Terminal className="h-5 w-5" />
              </div>
            </div>
            <h3 className="mt-6 text-xl font-semibold">Krythiq CLI</h3>
            <p className="mt-3 text-sm leading-7 text-white/55">
              A quick security tool for local projects and CI. Install the npm package, run a scan from any terminal, and get findings without setting up a team workspace.
            </p>
            <div className="mt-6 overflow-hidden rounded-xl border border-white/10 bg-black/40 font-mono text-xs">
              <div className="border-b border-white/8 px-4 py-2 text-white/30">terminal</div>
              <div className="space-y-2 p-4 text-white/75">
                <p><span className="mr-2 text-emerald-400">$</span>npm install -g krythiq</p>
                <p><span className="mr-2 text-emerald-400">$</span>krythiq scan</p>
              </div>
            </div>
            <Link href="/documentation/installation" className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-white transition hover:text-white/70">
              Read the free CLI docs <ArrowRight className="h-4 w-4" />
            </Link>
          </article>
        </FadeIn>
      </div>
    </section>
  );
}
