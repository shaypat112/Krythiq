"use client";

import { ArrowRight } from "lucide-react";
import { FadeIn } from "../shared/FadeIn";



const path = [
  { label: "Public API", tone: "neutral" },
  { label: "Auth bypass", tone: "low" },
  { label: "Admin token fallback", tone: "medium" },
  { label: "Full account takeover", tone: "critical" },
];

const toneClasses: Record<string, string> = {
  neutral: "border-border bg-background text-foreground",
  low: "border-amber-500/30 bg-amber-500/10 text-amber-400",
  medium: "border-amber-500/40 bg-amber-500/15 text-amber-400",
  critical: "border-red-500/40 bg-red-500/10 text-red-400",
};

export function AttackPathChain() {
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <p className="text-sm font-medium">Attack path simulation</p>
      <p className="mt-1 text-xs text-muted-foreground">
        How one low-severity finding chains into a real breach
      </p>
      <div className="mt-5 flex flex-wrap items-center gap-2">
        {path.map((step, i) => (
          <FadeIn key={step.label} delay={0.08 * i} className="flex items-center gap-2">
            <span
              className={`rounded-full border px-3 py-1.5 font-mono text-[11px] ${toneClasses[step.tone]}`}
            >
              {step.label}
            </span>
            {i < path.length - 1 && (
              <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            )}
          </FadeIn>
        ))}
      </div>
    </div>
  );
}
