import Link from "next/link";
import { ArrowRight, Laptop, ScanSearch, ShieldCheck, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";

export function DesktopRequired({
  children,
  enabled = true,
}: {
  children: React.ReactNode;
  enabled?: boolean;
}) {
  if (!enabled) return children;

  return (
    <>
      <section className="relative grid min-h-dvh overflow-hidden bg-background px-5 py-10 md:hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_15%,rgba(139,92,246,.18),transparent_38%),radial-gradient(circle_at_90%_85%,rgba(14,165,233,.12),transparent_32%)]"
        />
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-25 [background-image:linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] [background-size:28px_28px]" />

        <div className="relative mx-auto flex w-full max-w-sm flex-col justify-center">
          <div className="mb-8 flex items-center gap-2 text-sm font-semibold">
            <span className="grid h-8 w-8 place-items-center rounded-xl border border-violet-400/30 bg-violet-400/10 text-violet-300">
              <ShieldCheck className="h-4 w-4" />
            </span>
            Votrio
          </div>

          <div className="relative mx-auto mb-10 w-full max-w-[19rem]">
            <div className="rounded-2xl border border-border/80 bg-card/90 p-2 shadow-2xl shadow-violet-950/20">
              <div className="overflow-hidden rounded-xl border border-border bg-background">
                <div className="flex h-7 items-center gap-1.5 border-b border-border px-3">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-400/70" />
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400/70" />
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/70" />
                </div>
                <div className="grid h-36 grid-cols-[3.25rem_1fr]">
                  <div className="border-r border-border bg-muted/20 p-2">
                    <div className="h-3 rounded bg-violet-400/25" />
                    <div className="mt-2 h-3 rounded bg-muted" />
                    <div className="mt-2 h-3 rounded bg-muted" />
                  </div>
                  <div className="space-y-2.5 p-3">
                    <div className="flex items-center gap-2">
                      <ScanSearch className="h-3.5 w-3.5 text-sky-400" />
                      <div className="h-2 w-24 rounded bg-foreground/20" />
                    </div>
                    <div className="h-12 rounded-lg border border-border bg-muted/20" />
                    <div className="grid grid-cols-3 gap-2">
                      <div className="h-8 rounded-md bg-violet-400/10" />
                      <div className="h-8 rounded-md bg-sky-400/10" />
                      <div className="h-8 rounded-md bg-emerald-400/10" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="mx-auto h-3 w-24 rounded-b-xl bg-border" />
            <div className="mx-auto h-1.5 w-40 rounded-b-full bg-muted" />
            <span className="absolute -right-3 -top-3 grid h-9 w-9 place-items-center rounded-full border border-violet-400/30 bg-background text-violet-300 shadow-lg">
              <Sparkles className="h-4 w-4" />
            </span>
          </div>

          <div className="rounded-[1.75rem] border border-border/80 bg-card/75 p-6 shadow-xl backdrop-blur">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background/70 px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              <Laptop className="h-3.5 w-3.5" />
              Desktop workspace
            </span>
            <h1 className="mt-5 text-3xl font-semibold tracking-tight">
              Open Votrio on a desktop.
            </h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Repository scans, findings, charts, and remediation tools need more room than a phone provides. Continue on a laptop or desktop for the complete workspace.
            </p>
            <div className="mt-6 rounded-xl border border-border bg-background/60 p-4">
              <p className="text-sm font-medium">Your account is safe.</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Sign in on your computer with the same account to pick up where you left off.
              </p>
            </div>
            <Button asChild variant="outline" className="mt-5 w-full">
              <Link href="/documentation">
                Browse documentation
                <ArrowRight />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <div className="hidden md:block">{children}</div>
    </>
  );
}
