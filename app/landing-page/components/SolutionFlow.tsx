"use client";

import {
  GitBranch,
  Network,
  Bug,
  Route,
  Wrench,
  Rocket,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useState } from "react";
import { FadeIn } from "../shared/FadeIn";

const SecurityGraph = dynamic(
  () => import("./SecurityGraph").then((module) => module.SecurityGraph),
  {
    ssr: false,
    loading: () => <div className="h-full animate-pulse bg-[#080a0b]" />,
  },
);

const steps = [
  { icon: GitBranch, title: "Connect your repository", detail: "GitHub or GitLab, read-only access, scoped to what Krythiq needs." },
  { icon: Network, title: "See how the repo connects", detail: "Krythiq follows services, data flow, and trust boundaries across files." },
  { icon: Bug, title: "Find the risky path", detail: "See the code that creates the issue and what an attacker can reach from it." },
  { icon: Route, title: "Attack paths get traced", detail: "See exactly how a finding chains into real, exploitable access." },
  { icon: Wrench, title: "Get the smallest safe fix", detail: "Review a patch written for your code instead of a page of generic advice." },
  { icon: Rocket, title: "Ship with a verified trail", detail: "Every fix is validated in sandbox before it reaches your reviewers." },
];

export function SolutionFlow() {
  const [hoveredStep, setHoveredStep] = useState<number | null>(null);
  const hovered = hoveredStep === null ? null : steps[hoveredStep];
  const HoveredIcon = hovered?.icon;

  return (
    <section id="flow" className="border-t border-border py-24">
      <FadeIn className="max-w-2xl">
        <p className="mb-4 font-mono text-xs uppercase tracking-[0.2em] text-sky-400/80">Repository intelligence graph</p>
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          From repo to fix, without the security theater.
        </h2>
        <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
          Krythiq maps how code, data, and trust connect—then follows the path an attacker would take.
        </p>
      </FadeIn>

      <FadeIn delay={0.08} className="mt-12 overflow-hidden rounded-2xl border border-white/10 bg-[#07090a] shadow-[0_30px_90px_rgba(0,0,0,0.3)]">
        <div className="flex items-center justify-between border-b border-white/8 px-5 py-3.5">
          <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] text-white/45">
            <span className="h-2 w-2 rounded-full bg-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.9)]" />
            live dependency map
          </div>
          <span className="font-mono text-[10px] text-white/25">6 nodes · 9 relationships</span>
        </div>

        <div>
          <div className="relative h-[440px] overflow-hidden sm:h-[560px] lg:h-[640px]">
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:32px_32px]" />
            <SecurityGraph hovered={hoveredStep} onHover={setHoveredStep} />

            <div className={`pointer-events-none absolute bottom-5 left-5 right-5 max-w-md rounded-xl border p-4 backdrop-blur-md transition-all duration-200 sm:bottom-7 sm:left-7 ${
              hovered
                ? "translate-y-0 border-sky-300/20 bg-[#091117]/90 opacity-100"
                : "translate-y-2 border-white/8 bg-black/35 opacity-70"
            }`} aria-live="polite">
              {hovered && HoveredIcon ? (
                <div className="flex gap-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-sky-300/20 bg-sky-300/8 text-sky-200">
                    <HoveredIcon className="h-4.5 w-4.5" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-white">{hovered.title}</p>
                    <p className="mt-1 text-xs leading-5 text-white/52 sm:text-sm">{hovered.detail}</p>
                  </div>
                </div>
              ) : (
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/38">
                  Hover a primary node to reveal its purpose
                </p>
              )}
            </div>

            <div className="pointer-events-none absolute right-5 top-5 hidden font-mono text-[10px] uppercase tracking-[0.16em] text-white/25 sm:block">
              Live topology · hover to inspect
            </div>
          </div>
        </div>
      </FadeIn>
    </section>
  );
}
