"use client";

import { Play } from "lucide-react";

import { LaptopFrame } from "./LaptopFrame";
import { ScanTerminal } from "./ScanTerminal";
import { RiskGauge } from "./RiskGauge";
import { AttackPathChain } from "./AttackPathChain";
import { FadeIn } from "../shared/FadeIn";
import { Eyebrow } from "../shared/Eyebrow";

export function ProductShowcase() {
  return (
    <section id="product" className="border-t border-border py-24">
      <FadeIn className="text-center">

        <h2 className="mx-auto mt-4 max-w-xl text-3xl font-semibold tracking-tight sm:text-4xl">
          An AI security engineer that already knows your codebase.
        </h2>
      </FadeIn>

      <FadeIn delay={0.1} className="mt-14">
        <LaptopFrame>
          <ScanTerminal />
        </LaptopFrame>
      </FadeIn>

      <div className="mt-8 grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
        <FadeIn delay={0.05}>
          <RiskGauge score={82} />
        </FadeIn>
        <FadeIn delay={0.1}>
          <AttackPathChain />
        </FadeIn>
      </div>
    </section>
  );
}
