"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { BadgeCheck, Check, Loader2 } from "lucide-react";

import GlobeDemo from "@/components/globe-demo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProductVideoStory } from "@/app/components/ProductVideoStory";

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
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-violet-300">
            Partner network
          </p>
          <h1 className="mt-6 text-5xl font-semibold tracking-[-0.05em] sm:text-7xl">
            Better software is a team sport.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg">
            Votrio works with operators, educators, and technology teams building safer software without slowing down delivery.
          </p>


        </motion.section>

        
        ni
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

        <PartnerAccessForm reducedMotion={Boolean(reducedMotion)} />
      </main>
    </div>
  );
}

function PartnerAccessForm({ reducedMotion }: { reducedMotion: boolean }) {
  const [form, setForm] = React.useState({ name: "", business: "", email: "", teamSize: "", message: "" });
  const [status, setStatus] = React.useState<"idle" | "loading" | "success" | "error">("idle");
  const [error, setError] = React.useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setError("");
    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error ?? "Unable to submit your request.");
      setStatus("success");
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Unable to submit your request.");
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <motion.section id="partner-access" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="mt-20 rounded-[2rem] border border-border bg-card/70 p-10 text-center">
        <motion.span animate={reducedMotion ? undefined : { scale: [1, 1.08, 1] }} transition={{ duration: 2.5, repeat: Infinity }} className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-500/10 text-emerald-400">
          <BadgeCheck />
        </motion.span>
        <h2 className="mt-5 text-3xl font-semibold">You’re on our radar.</h2>
        <p className="mt-2 text-sm text-muted-foreground">We’ll follow up with next steps for your team.</p>
      </motion.section>
    );
  }

  const fieldClass = "h-11 rounded-xl border-border bg-background/70 px-3.5";
  return (
    <motion.section id="partner-access" initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={reveal} className="mt-20 scroll-mt-24 rounded-[2rem] border border-border bg-card/60 p-7 sm:p-10">
      <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-300">Partner access</p>
          <h2 className="mt-3 text-3xl font-semibold">Build with Votrio.</h2>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">Tell us about your organization and the developers you support.</p>
          <p className="mt-6 flex items-center gap-2 text-sm text-muted-foreground"><Check className="h-4 w-4 text-emerald-400" />A focused setup conversation</p>
        </div>
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <Input required aria-label="Your name" placeholder="Your name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className={fieldClass} />
          <Input required aria-label="Business name" placeholder="Business name" value={form.business} onChange={(event) => setForm({ ...form, business: event.target.value })} className={fieldClass} />
          <Input required type="email" aria-label="Work email" placeholder="Work email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className={fieldClass} />
          <select aria-label="Team size" value={form.teamSize} onChange={(event) => setForm({ ...form, teamSize: event.target.value })} className={fieldClass}><option value="">Team size</option><option>1–10</option><option>11–50</option><option>51–250</option><option>251+</option></select>
          <textarea aria-label="Partnership goals" placeholder="What would you like to build together?" value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} className="min-h-28 rounded-xl border border-border bg-background/70 px-3.5 py-3 text-sm outline-none sm:col-span-2" />
          {status === "error" ? <p role="alert" className="text-sm text-destructive sm:col-span-2">{error}</p> : null}
          <Button type="submit" disabled={status === "loading"} className="sm:col-span-2 sm:justify-self-end">
            {status === "loading" ? <Loader2 className="animate-spin" /> : null}
            {status === "loading" ? "Sending…" : "Request partner access"}
          </Button>
        </form>
      </div>
    </motion.section>
  );
}
