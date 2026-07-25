"use client";

import {
  GitBranch,
  Network,
  Bug,
  Route,
  Wrench,
  Rocket,
} from "lucide-react";
import { FadeIn } from "../shared/FadeIn";
import { Eyebrow } from "../shared/Eyebrow";

const steps = [
  { icon: GitBranch, title: "Connect your repository", detail: "GitHub or GitLab, read-only access, scoped to what Votrio needs." },
  { icon: Network, title: "Votrio maps the architecture", detail: "Builds a knowledge graph of services, data flow, and trust boundaries." },
  { icon: Bug, title: "Vulnerabilities surface", detail: "AI-guided detection finds what pattern-matching scanners miss." },
  { icon: Route, title: "Attack paths get traced", detail: "See exactly how a finding chains into real, exploitable access." },
  { icon: Wrench, title: "Fixes get generated", detail: "Production-ready patches, scoped to your code, not generic advice." },
  { icon: Rocket, title: "Ship with a verified trail", detail: "Every fix is validated in sandbox before it reaches your reviewers." },
];

export function SolutionFlow() {
  return (
    <section id="flow" className="border-t border-border py-24">
      <FadeIn className="max-w-xl">
        <Eyebrow>The process</Eyebrow>
        <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
          From repository to remediation, in one pass.
        </h2>
      </FadeIn>

      <div className="relative mt-14 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
        <div className="pointer-events-none absolute inset-x-0 top-6 hidden h-px bg-border lg:block" />
        {steps.map((step, i) => (
          <FadeIn key={step.title} delay={0.06 * i} className="relative">
            <div className="flex items-center gap-3">
              <span className="relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border bg-background">
                <step.icon className="h-4.5 w-4.5 text-foreground" />
              </span>
              <span className="font-mono text-xs text-muted-foreground">
                0{i + 1}
              </span>
            </div>
            <h3 className="mt-4 text-base font-semibold tracking-tight">{step.title}</h3>
            <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{step.detail}</p>
          </FadeIn>
        ))}
      </div>
    </section>
  );
}
