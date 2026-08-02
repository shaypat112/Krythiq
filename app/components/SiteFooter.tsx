"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Minus, Plus } from "lucide-react";

import { BrandLogo } from "./BrandLogo";
import { SocialButton } from "./SocialButton";

const footerLinks = [
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/documentation", label: "Documentation" },
  { href: "https://github.com/shaypat112/Krythiq", label: "GitHub", external: true },
];

export function SiteFooter() {
  const [minimized, setMinimized] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setMinimized(window.localStorage.getItem("krythiq-footer-minimized") === "true");
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const setFooterMinimized = (value: boolean) => {
    setMinimized(value);
    window.localStorage.setItem("krythiq-footer-minimized", String(value));
  };

  if (minimized) {
    return (
      <footer className="border-t border-border bg-card/30">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-5 py-3 sm:px-8">
          <span className="text-xs text-muted-foreground">© {new Date().getFullYear()} Krythiq</span>
          <button
            type="button"
            onClick={() => setFooterMinimized(false)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Expand site footer"
            aria-expanded="false"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </footer>
    );
  }

  return (
    <footer className="relative border-t border-border bg-card/30">
      <button
        type="button"
        onClick={() => setFooterMinimized(true)}
        className="absolute left-1/2 top-0 inline-flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-sm transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Minimize site footer"
        aria-expanded="true"
      >
        <Minus className="h-4 w-4" />
      </button>
      <div className="mx-auto grid max-w-[1600px] gap-8 px-5 py-10 sm:px-8 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <Link href="/" className="inline-flex items-center gap-2 font-semibold"><BrandLogo className="h-8 w-8 rounded-xl" />Krythiq</Link>
          <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground">Repository intelligence and security review for teams shipping modern software.</p>
          <nav className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground" aria-label="Footer">
            {footerLinks.map((link) => <Link key={link.label} href={link.href} target={link.external ? "_blank" : undefined} rel={link.external ? "noreferrer" : undefined} className="transition hover:text-foreground">{link.label}</Link>)}
          </nav>
        </div>
        <div className="md:text-right">
          <SocialButton className="md:ml-auto" />
          <p className="mt-4 text-xs text-muted-foreground">© {new Date().getFullYear()} Krythiq. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
