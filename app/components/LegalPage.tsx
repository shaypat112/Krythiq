import Link from "next/link";
import type { ReactNode } from "react";

export const LEGAL_UPDATED = "July 26, 2026";

export function LegalPage({
  eyebrow,
  title,
  summary,
  children,
}: {
  eyebrow: string;
  title: string;
  summary: string;
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5 sm:px-8">
          <Link href="/" className="font-semibold tracking-tight">Votrio</Link>
          <Link href="/scan" className="rounded-full bg-foreground px-4 py-2 text-sm font-semibold text-background">Scan</Link>
        </div>
      </header>
      <article className="mx-auto max-w-3xl px-5 py-16 sm:px-8 sm:py-24">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-muted-foreground">{eyebrow}</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">{title}</h1>
        <p className="mt-5 text-lg leading-8 text-muted-foreground">{summary}</p>
        <p className="mt-5 inline-flex rounded-full border border-border bg-muted/30 px-3 py-1.5 font-mono text-xs text-muted-foreground">Last updated: {LEGAL_UPDATED}</p>
        <div className="legal-copy mt-12 space-y-10">{children}</div>
        <div className="mt-16 border-t border-border pt-8 text-sm text-muted-foreground">
          Questions? Email <a className="font-medium text-foreground underline underline-offset-4" href="mailto:privacy@votrio.com">privacy@votrio.com</a>.
        </div>
      </article>
    </main>
  );
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return <section><h2 className="text-xl font-semibold tracking-tight">{title}</h2><div className="mt-3 space-y-3 text-sm leading-7 text-muted-foreground">{children}</div></section>;
}

export function LegalList({ children }: { children: ReactNode }) {
  return <ul className="list-disc space-y-2 pl-5">{children}</ul>;
}
