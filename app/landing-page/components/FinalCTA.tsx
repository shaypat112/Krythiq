"use client";

import { useState } from "react";
import { ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { FadeIn } from "../shared/FadeIn";

type Status = "idle" | "loading" | "success" | "error";

export function FinalCTA() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || status === "loading") return;

    setStatus("loading");
    setError("");

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.error || "Something went wrong. Please try again.");
      }

      setEmail(normalizedEmail);
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    }
  }

  return (
    <section className="border-t border-border py-24">
      <FadeIn className="relative overflow-hidden rounded-[2rem] border border-border bg-card px-6 py-16 text-center sm:px-16">
        <div className="pointer-events-none absolute inset-x-0 top-[-8rem] -z-10 h-[24rem] bg-[radial-gradient(50%_50%_at_50%_0%,rgba(240,166,58,0.12),transparent_70%)]" />

        <h2 className="mx-auto max-w-2xl text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
          Build faster. Ship safer. Secure the future of AI-powered development.
        </h2>
        <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-muted-foreground">
          Join the waitlist to get early access as we onboard the first
          engineering teams.
        </p>

        <div className="mx-auto mt-8 max-w-sm">
          {status === "success" ? (
            <div className="flex items-center justify-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-5 py-3 text-sm font-medium text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
              Check your inbox — you&apos;re on the list.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row" noValidate>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                autoComplete="email"
                aria-label="Work email"
                disabled={status === "loading"}
                className="w-full rounded-full border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-foreground/40 disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={status === "loading"}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-foreground px-5 py-3 text-sm font-semibold text-background transition hover:opacity-85 disabled:opacity-60"
              >
                {status === "loading" ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending…
                  </>
                ) : (
                  <>
                    Join waitlist
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {status === "error" && <p className="mt-3 text-xs text-red-400">{error}</p>}
        </div>
      </FadeIn>
    </section>
  );
}
