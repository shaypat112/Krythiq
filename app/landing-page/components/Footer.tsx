import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-border py-10">
      <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
        <Link href="/" className="flex items-center gap-2 text-sm font-semibold tracking-tight">

          Votrio
        </Link>
        <p className="font-mono text-xs text-muted-foreground">
          © {new Date().getFullYear()} Votrio. All rights reserved.
        </p>
        <div className="flex gap-6 font-mono text-xs text-muted-foreground">
          <Link href="/documentation" className="transition hover:text-foreground">Docs</Link>
          <Link href="/scan" className="transition hover:text-foreground">Scan</Link>
          <Link href="/auth" className="transition hover:text-foreground">Sign in</Link>
        </div>
      </div>
    </footer>
  );
}
