"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ThemeToggle } from "./ThemeToggle";

const links = [
  { href: "#product", label: "Product" },
  { href: "#flow", label: "How it works" },
];

export function Nav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 transition-colors ${
        scrolled ? "border-b border-border bg-background/80 backdrop-blur-md" : "border-b border-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8 lg:px-10">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">

          <span className="text-[15px]">
            Votrio
          </span>
        </Link>

        <nav className="hidden items-center gap-8 font-mono text-[13px] text-muted-foreground md:flex">
          {links.map((link) => (
            <a key={link.href} href={link.href} className="transition hover:text-foreground">
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link
            href="/auth"
            className="hidden rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted sm:inline-flex"
          >
            Sign in
          </Link>
          <Link
            href="/scan"
            className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-sm font-semibold text-background transition hover:opacity-85"
          >
            Get started
          </Link>
        </div>
      </div>
    </header>
  );
}
