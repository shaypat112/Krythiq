"use client";

import Link from "next/link";
import { ArrowRight, Check, Play } from "lucide-react";
import { FadeIn } from "../shared/FadeIn";
import MacbookScrollDemo from "@/components/macbook-scroll-demo";
import { RepositoryScene } from "./RepositoryScene";
import { TypingAnimation } from "@/components/ui/typing-animation";
import { useReducedMotion } from "motion/react";

export function Hero() {
  const reducedMotion = useReducedMotion();
  const headline = "Ship AI-generated code without shipping its vulnerabilities.";

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
            Krythiq maps your architecture, traces exploitable paths, and turns repository context into fixes your team can review and ship.
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

        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 pt-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-500" />Read-only repository access</span>
          <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-500" />Context-aware fixes</span>
          <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-500" />Sandbox verification</span>
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
