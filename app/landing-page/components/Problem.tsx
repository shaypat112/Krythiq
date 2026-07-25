"use client";

import { FadeIn } from "../shared/FadeIn";
import { Eyebrow } from "../shared/Eyebrow";

const symptoms = [
  {
    stat: "10x",
    label: "more code shipped per engineer",
    detail: "AI assistants write it faster than any team can read it line by line.",
  },
  {
    stat: "0",
    label: "context on why it was written that way",
    detail: "Generated code passes tests without explaining the assumptions behind it.",
  },
  {
    stat: "weeks",
    label: "typical turnaround for a manual security review",
    detail: "By the time it's reviewed, three more releases have already shipped.",
  },
];

export function Problem() {
  return (
    <section className="border-t border-border py-24">
      <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
        <FadeIn>
          <Eyebrow>The gap</Eyebrow>
          <h2 className="mt-4 max-w-md text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
            Your team ships faster than your security review can keep up.
          </h2>
          <p className="mt-4 max-w-md text-sm leading-7 text-muted-foreground">
            Copilot, Cursor, and Claude write code at a pace no reviewer can
            match. The vulnerabilities don&apos;t look like typos anymore —
            they&apos;re architectural, buried three services deep, and
            invisible to a linter.
          </p>
        </FadeIn>

        <div className="grid gap-4 sm:grid-cols-3">
          {symptoms.map((item, i) => (
            <FadeIn key={item.label} delay={0.08 * i}>
              <div className="h-full rounded-2xl border border-border bg-card p-6">
                <p className="font-mono text-3xl font-semibold tracking-tight text-foreground">
                  {item.stat}
                </p>
                <p className="mt-2 text-sm font-medium text-foreground">{item.label}</p>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.detail}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
