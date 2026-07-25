"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { buildAuthHeaders } from "@/app/lib/http";
import { createClient } from "@/app/lib/supabase";
import { AlertCircle, CheckCircle2, CreditCard, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type BillingSummary = { configured: boolean; subscription: { status: string; planName: string; currentPeriodEnd: string | null } | null; invoices: Array<{ id: string; month: string; amount: number; status: string }> };
type Plan = { id: string; name: string; description: string; amount: number; currency: string; interval: string; features: string[] };

declare global {
  interface Window { Stripe?: (key: string) => { initEmbeddedCheckout: (options: { fetchClientSecret: () => Promise<string> }) => Promise<{ mount: (target: string) => void; destroy: () => void }> }; }
}

function currency(amount: number, code: string) { return new Intl.NumberFormat("en-US", { style: "currency", currency: code.toUpperCase() }).format(amount / 100); }

function EmbeddedCheckout({ clientSecret, publishableKey, onClose }: { clientSecret: string; publishableKey: string; onClose: () => void }) {
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let checkout: { mount: (target: string) => void; destroy: () => void } | null = null;
    const mount = async () => {
      try {
        if (!window.Stripe) {
          await new Promise<void>((resolve, reject) => {
            const script = document.createElement("script"); script.src = "https://js.stripe.com/clover/stripe.js"; script.async = true;
            script.onload = () => resolve(); script.onerror = () => reject(new Error("Unable to load Stripe's secure payment form.")); document.head.appendChild(script);
          });
        }
        if (!window.Stripe) throw new Error("Stripe payment form is unavailable.");
        checkout = await window.Stripe(publishableKey).initEmbeddedCheckout({ fetchClientSecret: async () => clientSecret });
        checkout.mount("#votrio-embedded-checkout");
      } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to load checkout."); }
    };
    void mount();
    return () => checkout?.destroy();
  }, [clientSecret, publishableKey]);

  return <Card className="border-primary/30"><CardHeader><div className="flex items-center justify-between gap-3"><div><CardTitle>Secure checkout</CardTitle><CardDescription>Payment fields are securely hosted by Stripe inside Votrio.</CardDescription></div><Button variant="ghost" onClick={onClose}>Close</Button></div></CardHeader><CardContent>{error ? <p role="alert" className="text-sm text-destructive">{error}</p> : <div id="votrio-embedded-checkout" className="min-h-96" />}</CardContent></Card>;
}

export function BillingClient() {
  const supabase = useMemo(() => createClient(), []);
  const [summary, setSummary] = useState<BillingSummary | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkout, setCheckout] = useState<{ clientSecret: string; publishableKey: string } | null>(null);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const token = useCallback(async () => (await supabase.auth.getSession()).data.session?.access_token ?? null, [supabase]);
  const load = useCallback(async () => {
    const accessToken = await token();
    if (!accessToken) { setError("Sign in to view plans and make a payment."); setLoading(false); return; }
    const headers = buildAuthHeaders(accessToken);
    const [summaryResponse, plansResponse] = await Promise.all([fetch("/api/billing/summary", { headers }), fetch("/api/billing/plans", { headers })]);
    const [summaryData, plansData] = await Promise.all([summaryResponse.json().catch(() => ({})), plansResponse.json().catch(() => ({}))]);
    if (!summaryResponse.ok || !plansResponse.ok) setError(summaryData.error ?? plansData.error ?? "Unable to load billing.");
    else { setSummary(summaryData as BillingSummary); setPlans(plansData.plans ?? []); }
    setLoading(false);
  }, [token]);
  useEffect(() => { void load(); }, [load]);

  const beginCheckout = async (planId: string) => {
    const accessToken = await token(); if (!accessToken) { setError("Sign in to make a payment."); return; }
    setLoadingPlan(planId); setError(null);
    try {
      const response = await fetch("/api/billing/checkout", { method: "POST", headers: buildAuthHeaders(accessToken, { "Content-Type": "application/json" }), body: JSON.stringify({ planId, billingCycle: "monthly" }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.clientSecret || !data.publishableKey) throw new Error(data.error ?? "Checkout could not be started.");
      setCheckout({ clientSecret: data.clientSecret, publishableKey: data.publishableKey });
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Checkout could not be started."); }
    finally { setLoadingPlan(null); }
  };

  if (loading) return <div role="status" className="flex min-h-80 items-center justify-center"><Loader2 className="animate-spin" /><span className="sr-only">Loading billing</span></div>;
  return <div className="mx-auto max-w-6xl space-y-8"><header><span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Test mode</span><h1 className="mt-3 text-3xl font-semibold">Billing</h1><p className="mt-2 text-muted-foreground">Subscriptions and invoices are synchronized from Stripe to your Supabase billing record through verified webhooks.</p></header>
    {error && <div role="alert" className="flex gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"><AlertCircle className="h-4 w-4 shrink-0" />{error}</div>}
    {summary?.subscription && <Card><CardContent className="flex flex-wrap items-center justify-between gap-4 p-5"><div><p className="font-medium">{summary.subscription.planName}</p><p className="text-sm text-muted-foreground">{summary.subscription.currentPeriodEnd ? `Renews ${new Date(summary.subscription.currentPeriodEnd).toLocaleDateString()}` : "Subscription period pending sync"}</p></div><span className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{summary.subscription.status}</span></CardContent></Card>}
    {checkout ? <EmbeddedCheckout {...checkout} onClose={() => setCheckout(null)} /> : <section><h2 className="text-xl font-semibold">Choose a plan</h2><div className="mt-4 grid gap-4 md:grid-cols-2">{plans.map((plan) => <Card key={plan.id} className="relative"><CardHeader><CardTitle>{plan.name}</CardTitle><CardDescription>{plan.description}</CardDescription><p className="mt-3 text-3xl font-semibold">{currency(plan.amount, plan.currency)}<span className="text-sm font-normal text-muted-foreground">/{plan.interval}</span></p></CardHeader><CardContent><ul className="space-y-2 text-sm">{plan.features.map((feature) => <li key={feature} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-400" />{feature}</li>)}</ul><Button className="mt-6 w-full" onClick={() => void beginCheckout(plan.id)} disabled={loadingPlan !== null}>{loadingPlan === plan.id ? <Loader2 className="animate-spin" /> : <CreditCard />} Subscribe securely</Button></CardContent></Card>)}</div>{plans.length === 0 && <Card><CardContent className="p-6 text-sm text-muted-foreground">No Stripe plans are configured for this environment.</CardContent></Card>}</section>}

  </div>;
}
