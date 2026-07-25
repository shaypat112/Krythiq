"use client";

import { FadeIn } from "../shared/FadeIn";
import { Eyebrow } from "../shared/Eyebrow";
import { Tooltip } from "@/components/ui/tooltip-card";

// NOTE: Swap the name, title, and initials below for your actual founder details.
const FOUNDER_NAME = "Shivang patel";
const FOUNDER_TITLE = "Founder, Votrio";
const FOUNDER_INITIALS = "SP";

export function Founder() {
  return (
    <section className="border-t border-border py-24">
      <div className="grid gap-10 lg:grid-cols-[0.35fr_0.65fr] lg:gap-16">
        <FadeIn>
          <Eyebrow>Why we built this</Eyebrow>
          <div className="mt-6 flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-foreground font-mono text-sm font-semibold text-background">
              {FOUNDER_INITIALS}
            </span>
            <div>
              <p className="text-sm font-semibold">{FOUNDER_NAME}</p>
              <p className="text-xs text-muted-foreground">{FOUNDER_TITLE}</p>
            </div>
          </div>
        </FadeIn>

        <FadeIn delay={0.1} className="space-y-5 text-lg leading-8 text-muted-foreground">
          <p>
            Software development changed faster than security did. AI assistants
            made it possible for a two-person team to ship what
            used to take a department — but the review process for that code
            still assumes a human wrote every line and had time to think
            about it.
          </p>
          <p>
            <span className="text-foreground">We started Votrio because that gap is only going to widen.</span>{" "}
            The teams moving fastest right now are also the most exposed, and
            most of them don&apos;t know it yet — not because they&apos;re
            careless, but because nothing built for the old pace of shipping
            can keep up with the new one.
          </p>
          <p>
            Votrio exists so that {" "}
            <Tooltip content="Short feedback loops, automated checks, and fixes that fit the way modern teams already ship." containerClassName="text-foreground">
              <span className="cursor-help border-b border-dashed border-foreground/40 font-medium">shipping fast</span>
            </Tooltip>{" "}
            and {" "}
            <Tooltip content="Repository-aware analysis that traces risk through architecture—not just isolated lines of code." containerClassName="text-foreground">
              <span className="cursor-help border-b border-dashed border-foreground/40 font-medium">shipping secure</span>
            </Tooltip>{" "}
            stop being a trade-off. That&apos;s the whole bet.
          </p>
        </FadeIn>
      </div>
    </section>
  );
}
