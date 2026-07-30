"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { buildAuthHeaders } from "@/app/lib/http";
import { createClient } from "@/app/lib/supabase";
import { AlertCircle, Coins, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { scanLevelConfig, type ScanTier } from "@/app/lib/scanner/scan-levels";
import { formatTokens } from "@/app/lib/tokens";
import { PricingTableThree } from "@/components/billingsdk/pricing-table-three";
import type { Plan as PricingPlan } from "@/lib/billingsdk-config";
import {
  destroyStripeCheckout,
  mountStripeCheckout,
} from "@/app/lib/stripe-embedded-client";

type BillingSummary = { configured: boolean; subscription: { status: string; planName: string; currentPeriodEnd: string | null } | null; invoices: Array<{ id: string; month: string; amount: number; status: string }> };
type Plan = { id: string; name: string; description: string; amount: number; yearlyAmount: number | null; yearlyPriceId: string | null; currency: string; interval: string; features: string[] };

function currencySymbol(code: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: code.toUpperCase(),
    currencyDisplay: "narrowSymbol",
  }).formatToParts(0).find((part) => part.type === "currency")?.value ?? "$";
}

function EmbeddedCheckout({ clientSecret, publishableKey, onClose }: { clientSecret: string; publishableKey: string; onClose: () => void }) {
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    let checkout: Awaited<ReturnType<typeof mountStripeCheckout>> = null;
    void mountStripeCheckout({
      clientSecret,
      publishableKey,
      target: "#krythiq-embedded-checkout",
      signal: controller.signal,
    })
      .then((instance) => {
        checkout = instance;
      })
      .catch((cause) => {
        if (!controller.signal.aborted) {
          setError(cause instanceof Error ? cause.message : "Unable to load checkout.");
        }
      });
    return () => {
      controller.abort();
      void destroyStripeCheckout(checkout);
    };
  }, [clientSecret, publishableKey]);

  return <Card className="border-primary/30"><CardHeader><div className="flex items-center justify-between gap-3"><div><CardTitle>Stripe test checkout</CardTitle><CardDescription>No real payment will be processed. Use card 4242 4242 4242 4242, any future expiry, and any CVC.</CardDescription></div><Button variant="ghost" onClick={onClose}>Close</Button></div></CardHeader><CardContent>{error ? <p role="alert" className="text-sm text-destructive">{error}</p> : <div id="krythiq-embedded-checkout" className="min-h-96" />}</CardContent></Card>;
}

export function BillingClient({ insufficientScanTier }: { insufficientScanTier: ScanTier | null }) {
  const supabase = useMemo(() => createClient(), []);
  const [summary, setSummary] = useState<BillingSummary | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkout, setCheckout] = useState<{ clientSecret: string; publishableKey: string } | null>(null);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [tokenBalance, setTokenBalance] = useState<number | null>(null);

  const token = useCallback(async () => (await supabase.auth.getSession()).data.session?.access_token ?? null, [supabase]);
  const load = useCallback(async () => {
    const accessToken = await token();
    if (!accessToken) { setError("Sign in to view plans and make a payment."); setLoading(false); return; }
    const headers = buildAuthHeaders(accessToken);
    const [summaryResponse, plansResponse, tokenResponse] = await Promise.all([fetch("/api/billing/summary", { headers }), fetch("/api/billing/plans", { headers }), fetch("/api/tokens", { headers })]);
    const [summaryData, plansData, tokenData] = await Promise.all([summaryResponse.json().catch(() => ({})), plansResponse.json().catch(() => ({})), tokenResponse.json().catch(() => ({}))]);
    if (!summaryResponse.ok || !plansResponse.ok) setError(summaryData.error ?? plansData.error ?? "Unable to load billing.");
    else { setSummary(summaryData as BillingSummary); setPlans(plansData.plans ?? []); }
    if (tokenResponse.ok) {
      setTokenBalance(Number(tokenData.balance));
    }
    setLoading(false);
  }, [token]);
  useEffect(() => { void load(); }, [load]);

  const beginCheckout = async (planId: string, billingCycle: "monthly" | "yearly") => {
    const accessToken = await token(); if (!accessToken) { setError("Sign in to make a payment."); return; }
    setLoadingPlan(planId); setError(null);
    try {
      const response = await fetch("/api/billing/checkout", { method: "POST", headers: buildAuthHeaders(accessToken, { "Content-Type": "application/json" }), body: JSON.stringify({ planId, billingCycle }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.clientSecret || !data.publishableKey) throw new Error(data.error ?? "Checkout could not be started.");
      setCheckout({ clientSecret: data.clientSecret, publishableKey: data.publishableKey });
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Checkout could not be started."); }
    finally { setLoadingPlan(null); }
  };

  if (loading) return <div role="status" className="flex min-h-80 items-center justify-center"><Loader2 className="animate-spin" /><span className="sr-only">Loading billing</span></div>;
  const pricingPlans: PricingPlan[] = plans.map((plan, index) => ({
    id: plan.id,
    title: plan.name,
    description: plan.description,
    currency: currencySymbol(plan.currency),
    monthlyPrice: (plan.amount / 100).toFixed(plan.amount % 100 === 0 ? 0 : 2),
    yearlyPrice: ((plan.yearlyAmount ?? plan.amount * 12) / 100).toFixed((plan.yearlyAmount ?? plan.amount * 12) % 100 === 0 ? 0 : 2),
    yearlyAvailable: Boolean(plan.yearlyPriceId),
    buttonText: loadingPlan === plan.id ? "Starting test checkout…" : "Choose test plan",
    badge: insufficientScanTier && plan.id === "pro"
      ? "Most popular"
      : index === 0
        ? "Most popular"
        : undefined,
    highlight: insufficientScanTier ? plan.id === "pro" : index === 0,
    disabled: loadingPlan !== null,
    features: plan.features.map((feature) => ({
      name: feature,
      icon: "check",
    })),
  }));

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header><span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Stripe test mode only</span><h1 className="mt-3 text-3xl font-semibold">Billing</h1><p className="mt-2 text-muted-foreground">Test subscriptions, Tokens, and invoices are managed here. Live payments are disabled.</p></header>
      {insufficientScanTier ? <Card className="border-amber-500/30 bg-amber-500/10"><CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex gap-3"><Coins className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" /><div><p className="font-medium">More Tokens are required for {scanLevelConfig[insufficientScanTier].label}</p><p className="mt-1 text-sm text-muted-foreground">This scan requires {formatTokens(scanLevelConfig[insufficientScanTier].cost)}. Your current balance is {tokenBalance === null ? "loading…" : formatTokens(tokenBalance)}. Review the available plans below.</p></div></div><Button asChild variant="outline" className="shrink-0"><a href="#plans">View plans</a></Button></CardContent></Card> : null}
      {error && <div role="alert" className="flex gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"><AlertCircle className="h-4 w-4 shrink-0" />{error}</div>}
      {summary?.subscription && <Card><CardContent className="flex flex-wrap items-center justify-between gap-4 p-5"><div><p className="font-medium">{summary.subscription.planName}</p><p className="text-sm text-muted-foreground">{summary.subscription.currentPeriodEnd ? `Renews ${new Date(summary.subscription.currentPeriodEnd).toLocaleDateString()}` : "Subscription period pending sync"}</p></div><span className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{summary.subscription.status}</span></CardContent></Card>}
      {checkout ? <EmbeddedCheckout {...checkout} onClose={() => setCheckout(null)} /> : <section id="plans" className="scroll-mt-24"><h2 className="text-xl font-semibold">Choose a test plan</h2>{pricingPlans.length > 0 ? <PricingTableThree plans={pricingPlans} onPlanSelect={(planId, billingCycle) => void beginCheckout(planId, billingCycle)} billingMode="toggle" showFooter={false} className="mt-5" /> : <Card className="mt-4"><CardContent className="p-6 text-sm text-muted-foreground">No Stripe test plans are configured for this environment.</CardContent></Card>}</section>}
    </div>
  );
}
