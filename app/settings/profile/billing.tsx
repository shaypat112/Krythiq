"use client";

import { useEffect, useState } from "react";
import { buildAuthHeaders } from "@/app/lib/http";
import { useSettings } from "./context";
import { GhostButton, SectionCard } from "./primitives";
import { Skeleton } from "@/components/ui/skeleton";

type BillingSummary = {
  configured: boolean;
  customer: { stripeCustomerId: string } | null;
  subscription: {
    status: string;
    priceId: string | null;
    planName: string;
    currentPeriodEnd: string | null;
  } | null;
  invoices: Array<{
    id: string;
    month: string;
    amount: number;
    status: string;
  }>;
};

export function BillingSection() {
  const { accessToken, setError } = useSettings();
  const [summary, setSummary] = useState<BillingSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      if (!accessToken) {
        setLoading(false);
        return;
      }

      const res = await fetch("/api/billing/summary", {
        headers: buildAuthHeaders(accessToken),
      });
      const data = await res.json().catch(() => null);

      if (!mounted) return;

      if (!res.ok) {
        setError(data?.error ?? "Unable to load billing summary.");
        setLoading(false);
        return;
      }

      setSummary(data as BillingSummary);
      setLoading(false);
    };

    void load();

    return () => {
      mounted = false;
    };
  }, [accessToken, setError]);

  const openBillingPortal = async () => {
    if (!accessToken) return;
    setError(null);

    const res = await fetch("/api/billing/portal", {
      method: "POST",
      headers: buildAuthHeaders(accessToken, {
        "Content-Type": "application/json",
      }),
    });

    if (res.ok) {
      const data = await res.json();
      window.location.href = data.url;
      return;
    }

    const data = await res.json().catch(() => ({}));
    setError(data?.error ?? "Unable to open billing portal.");
  };

  return (
    <SectionCard
      title="Billing"
      description="Manage your subscription, checkout flow, and recent billing activity."
    >
      {loading ? (
        <div className="space-y-3" aria-label="Loading billing overview"><Skeleton className="h-24" /><Skeleton className="h-24" /></div>
      ) : !summary?.configured ? (
        <p className="text-sm text-muted-foreground">
          Stripe is not configured for this environment yet.
        </p>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-2xl border border-border bg-background p-5">
              <p className="text-sm font-semibold text-foreground">
                Manage billing
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Open the Stripe portal to update payment methods, download
                invoices, or switch your subscription.
              </p>
              <GhostButton onClick={openBillingPortal} className="mt-4">
                Open billing portal
              </GhostButton>
            </div>

            <div className="rounded-2xl border border-border bg-background p-5">
              <p className="text-sm font-semibold text-foreground">Purchase a plan</p>
              <p className="mt-1 text-sm text-muted-foreground">Open the secure in-app checkout to compare current Stripe prices and subscribe.</p>
              <GhostButton className="mt-4" onClick={() => { window.location.href = "/billing"; }}>View plans</GhostButton>
            </div>
          </div>
        </div>
      )}
    </SectionCard>
  );
}
