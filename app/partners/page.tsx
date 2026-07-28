"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";

import GlobeDemo from "@/components/globe-demo";

const partnerFilters = ["All", "Enterprise", "Education", "Technology"] as const;
type PartnerFilter = (typeof partnerFilters)[number];


const reveal = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

export default function PartnersPage() {
  const reducedMotion = useReducedMotion();
  const duration = reducedMotion ? 0 : 0.65;
  const [partnerFilter, setPartnerFilter] = React.useState<PartnerFilter>("All");

  return (
    <div className="relative -mx-6 -my-10 min-h-screen overflow-hidden bg-background px-6 py-16 sm:py-24">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_5%,rgba(139,92,246,.1),transparent_32rem)]" />
      <main className="relative mx-auto max-w-7xl">
        <motion.section
          initial="hidden"
          animate="visible"
          variants={reveal}
          transition={{ duration }}
          className="mx-auto max-w-4xl text-center"
        >

          <h1 className="mt-6 text-5xl font-semibold tracking-[-0.05em] sm:text-7xl">
            Better software is a team sport.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg">
            Krythiq works with operators, educators, and technology teams building safer software without slowing down delivery.
          </p>


        </motion.section>

        <motion.section
          initial="hidden"
          animate="visible"
          variants={reveal}
          transition={{ duration, delay: reducedMotion ? 0 : 0.12 }}
          className="mx-auto mt-20 max-w-5xl"
          aria-labelledby="partner-map-heading"
        >
          <div className="mb-6 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-300">Pinpointed partners</p>
              <h2 id="partner-map-heading" className="mt-2 text-3xl font-semibold tracking-tight">Hover the map to meet the network.</h2>
              <p className="mt-2 text-sm text-muted-foreground">Pins use each partner’s city location. Partner cards only appear when you hover a pin.</p>
            </div>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Filter map partners by audience">
              {partnerFilters.map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setPartnerFilter(filter)}
                  aria-pressed={partnerFilter === filter}
                  className={`rounded-full border px-3.5 py-2 text-sm font-medium transition ${
                    partnerFilter === filter
                      ? "border-foreground bg-foreground text-background"
                      : "border-border bg-card text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>
          <GlobeDemo filter={partnerFilter} />
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
            <span><strong className="text-foreground">Finero</strong> · Dallas, Texas</span>
            <span><strong className="text-foreground">BP Gas Station</strong> · Catawba, North Carolina</span>
            <span><strong className="text-foreground">Charlotte Student Hub</strong> · Charlotte, North Carolina</span>
          </div>
        </motion.section>
      </main>
    </div>
  );
}
