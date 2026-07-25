"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";

export function RiskGauge({ score = 82 }: { score?: number }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const [display, setDisplay] = useState(0);

  const radius = 64;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(100, Math.max(0, score));
  const offset = circumference * (1 - clamped / 100);

  useEffect(() => {
    if (!inView) return;
    const duration = 1200;
    const start = performance.now();
    let frame: number;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      setDisplay(Math.round(progress * clamped));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [inView, clamped]);

  return (
    <div ref={ref} className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-6">
      <div className="relative h-40 w-40">
        {/** biome-ignore lint/a11y/noSvgWithoutTitle: <explanation> */}
        <svg viewBox="0 0 160 160" className="h-full w-full -rotate-90">
          <circle cx="80" cy="80" r={radius} className="stroke-border" strokeWidth="10" fill="none" />
          <motion.circle
            cx="80"
            cy="80"
            r={radius}
            className="stroke-emerald-400"
            strokeWidth="10"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={inView ? { strokeDashoffset: offset } : {}}
            transition={{ duration: 1.2, ease: "easeOut" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-3xl font-semibold tracking-tight">{display}</span>
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">/ 100</span>
        </div>
      </div>
      <div className="text-center">
        <p className="text-sm font-medium">Security score</p>
        <p className="mt-1 text-xs text-muted-foreground">Weighted by exploitability, not just count</p>
      </div>
    </div>
  );
}
