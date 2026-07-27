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
        <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 font-mono text-xs text-muted-foreground">
          <Link href="/documentation" className="transition hover:text-foreground">Docs</Link>
          <Link href="/scan" className="transition hover:text-foreground">Scan</Link>
          <Link href="/privacy" className="transition hover:text-foreground">Privacy</Link>
          <Link href="/terms" className="transition hover:text-foreground">Terms</Link>
          <Link href="/cookies" className="transition hover:text-foreground">Cookies</Link>
          <Link href="/acceptable-use" className="transition hover:text-foreground">Acceptable use</Link>
        </div>
      </div>
    </footer>
  );
}
