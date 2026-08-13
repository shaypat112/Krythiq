"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BrandLogo } from "@/app/components/BrandLogo";

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 24);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  return (
    <header className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${scrolled ? "border-b border-white/8 bg-[#07090b]/80 backdrop-blur-xl" : "border-b border-transparent"}`}>
      <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-5 sm:px-8 lg:px-12">
        <Link href="/" className="flex items-center gap-2.5 text-sm font-semibold tracking-[-0.02em] text-white">
          <BrandLogo className="h-7 w-7 rounded-lg" priority /> Krythiq
        </Link>
        <nav className="hidden items-center gap-7 text-xs text-white/55 md:flex" aria-label="Landing page">
          <Link className="transition hover:text-white" href="#story">How it works</Link>
          <Link className="transition hover:text-white" href="#product">Review</Link>
          <Link className="transition hover:text-white" href="#workflow">Agent workflow</Link>
        </nav>
        <Link href="/scan" className="rounded-full border border-white/14 bg-white px-4 py-2 text-xs font-semibold text-black transition hover:bg-white/88">Scan a repository</Link>
      </div>
    </header>
  );
}
