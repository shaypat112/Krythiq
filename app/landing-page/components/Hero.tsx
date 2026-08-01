"use client";

import Link from "next/link";
import { ArrowRight, Braces, FlaskConical, Play, ShieldCheck } from "lucide-react";
import { FadeIn } from "../shared/FadeIn";
import MacbookScrollDemo from "@/components/macbook-scroll-demo";
import { RepositoryScene } from "./RepositoryScene";
import { TypingAnimation } from "@/components/ui/typing-animation";
import { useReducedMotion } from "motion/react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const trustPoints = [
  {
    label: "Read only",
    detail: "Krythiq reviews your repository without pushing code or changing files.",
    icon: ShieldCheck,
  },
  {
    label: "Repo aware",
    detail: "Findings include the files, data flow, and surrounding code needed to judge the risk.",
    icon: Braces,
  },
  {
    label: "Tested fixes",
    detail: "Suggested changes are checked in an isolated environment before you review them.",
    icon: FlaskConical,
  },
];

export function Hero() {
  const reducedMotion = useReducedMotion();
  const headline = "Ship fast. Catch the risky code first.";

  return (
    <section className="relative py-16 sm:py-24 lg:py-28">
      <FadeIn className="mx-auto max-w-4xl text-center">


        <div className="space-y-6">
          <h1
            aria-label={headline}
            className="text-balance text-[clamp(3rem,7.4vw,5.8rem)] font-semibold leading-[0.98] tracking-[-0.055em]"
          >
            <span className="grid">
              <span aria-hidden="true" className="invisible col-start-1 row-start-1">{headline}</span>
              {reducedMotion ? (
                <span aria-hidden="true" className="col-start-1 row-start-1">{headline}</span>
              ) : (
                <TypingAnimation
                  aria-hidden="true"
                  className="col-start-1 row-start-1 leading-[0.98] tracking-[-0.055em]"
                  duration={78}
                  delay={220}
                  startOnView
                >
                  {headline}
                </TypingAnimation>
              )}
            </span>
          </h1>
          <p className="mx-auto max-w-2xl text-balance text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
            Connect a repo. Get the attack path, the exact files involved, and a fix you can review before your next deploy.
          </p>
        </div>



        <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/auth"
            className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-3 text-sm font-semibold text-background transition hover:opacity-85"
          >
            Create account
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/documentation"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-5 py-3 text-sm font-semibold text-foreground transition hover:bg-muted"
          >
            <Play className="h-3.5 w-3.5" />
            Start scanning
          </Link>
        </div>

        <div className="mt-5 flex items-center justify-center gap-2" aria-label="How Krythiq works">
          {trustPoints.map((point) => (
            <Tooltip key={point.label}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="group inline-flex h-10 items-center gap-2 rounded-full border border-border/80 bg-card/60 px-3 text-xs font-medium text-muted-foreground transition hover:-translate-y-0.5 hover:border-foreground/30 hover:text-foreground"
                  aria-label={`${point.label}: ${point.detail}`}
                >
                  <point.icon className="h-4 w-4 text-emerald-500" />
                  <span className="hidden sm:inline">{point.label}</span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" sideOffset={8} className="max-w-64 text-center">
                {point.detail}
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </FadeIn>

      <FadeIn delay={0.12} className="relative mt-14 sm:mt-20">
        <div className="pointer-events-none absolute inset-x-[12%] bottom-[-8%] h-32 rounded-full bg-black/20 blur-3xl dark:bg-black/50" />
        <MacbookScrollDemo>
          <RepositoryScene />
        </MacbookScrollDemo>
      </FadeIn>
    </section>
  );
}
