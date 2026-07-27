"use client";

import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { FadeIn } from "../shared/FadeIn";
import { Globe } from "@/components/ui/globe";

const globeConfig = {
  width: 800,
  height: 800,
  onRender: () => {},
  devicePixelRatio: 2,
  phi: 0,
  theta: 0.2,
  dark: 1,
  diffuse: 1.1,
  mapSamples: 16000,
  mapBrightness: 7,
  baseColor: [0.04, 0.04, 0.04] as [number, number, number],
  markerColor: [1, 1, 1] as [number, number, number],
  glowColor: [0.12, 0.12, 0.12] as [number, number, number],
  markers: [
    { location: [38.9072, -77.0369] as [number, number], size: 0.1 },
    { location: [40.7128, -74.006] as [number, number], size: 0.06 },
    { location: [34.0522, -118.2437] as [number, number], size: 0.06 },
    { location: [41.8781, -87.6298] as [number, number], size: 0.05 },
    { location: [29.7604, -95.3698] as [number, number], size: 0.05 },
  ],
};

export function Hero() {
  return (
    <section className="relative overflow-hidden py-16 sm:py-24 lg:py-28">
      <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_.95fr]">
      <FadeIn className="relative z-10">
        <div className="space-y-6">
          <h1 className="text-balance text-[clamp(3rem,7.4vw,5.8rem)] font-semibold leading-[0.98] tracking-[-0.055em]">
            Ship AI-generated code without shipping its vulnerabilities.
          </h1>
          <p className="max-w-2xl text-balance text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
            Votrio maps your architecture, traces exploitable paths, and turns repository context into fixes your team can review and ship.
          </p>
        </div>
        <div className="mt-7 flex">
          <Link
            href="/scan"
            className="inline-flex items-center gap-2 rounded-full bg-foreground px-6 py-3 text-sm font-semibold text-background transition hover:opacity-85"
          >
            Scan your code free
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5" />No account for first scan</span>
          <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5" />Read-only access</span>
          <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5" />Code never executed</span>
        </div>
      </FadeIn>
      <FadeIn delay={0.12} className="relative mx-auto aspect-square w-full max-w-[560px] overflow-hidden [mask-image:linear-gradient(to_bottom,black_72%,transparent_100%)]">
        <div className="absolute inset-8 rounded-full border border-border/50" />
        <div className="absolute inset-16 rounded-full border border-border/30" />
        <Globe config={globeConfig} className="top-0" />
      </FadeIn>
      </div>
    </section>
  );
}
