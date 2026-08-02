"use client";

import { useEffect, useState } from "react";
import { buildAuthHeaders } from "@/app/lib/http";
import { useSettings } from "./context";
import { GhostButton } from "./primitives";
import { BentoGrid } from "@/components/ui/bento-grid";
import { Skeleton } from "@/components/ui/skeleton";
import { UsageTable } from "@/components/billingsdk/usage-table";
import { PaymentFailure } from "@/components/billingsdk/payment-failure";
import { UsageBasedPricing } from "@/components/billingsdk/usage-based-pricing";
import {
  hasPaymentFailure,
  toUsageItems,
  type TokenTransaction,
} from "@/app/lib/billing-usage";
import { formatTokens } from "@/app/lib/tokens";

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
  const [balance, setBalance] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<TokenTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [openingPortal, setOpeningPortal] = useState(false);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      if (!accessToken) {
        setLoading(false);
        return;
      }

      const headers = buildAuthHeaders(accessToken);
      const [res, tokenRes] = await Promise.all([
        fetch("/api/billing/summary", { headers }),
        fetch("/api/tokens", { headers }),
      ]);
      const [data, tokenData] = await Promise.all([
        res.json().catch(() => null),
        tokenRes.json().catch(() => null),
      ]);

      if (!mounted) return;

      if (!res.ok) {
        setError(data?.error ?? "Unable to load billing summary.");
        setLoading(false);
        return;
      }

      setSummary(data as BillingSummary);
      if (tokenRes.ok) {
        setBalance(Number(tokenData?.balance));
        setTransactions(tokenData?.transactions ?? []);
      }
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
    setOpeningPortal(true);

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
    setOpeningPortal(false);
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Billing</h1>
        <p className="mt-2 text-sm text-muted-foreground">Manage your subscription, checkout flow, and recent billing activity.</p>
      </header>
      {loading ? (
        <div className="space-y-3" aria-label="Loading billing overview"><Skeleton className="h-24" /><Skeleton className="h-24" /></div>
      ) : !summary?.configured ? (
        <p className="text-sm text-muted-foreground">
          Stripe is not configured for this environment yet.
        </p>
      ) : (
        <div className="space-y-6">
          {hasPaymentFailure(summary.subscription?.status) ? (
            <PaymentFailure
              className="max-w-none border-destructive/30"
              title="Payment method needs attention"
              subtitle="The latest Stripe test payment was not completed."
              message="Open the test billing portal to update the payment method and retry."
              reasons={[
                "The test card was declined",
                "The saved payment method expired",
                "Stripe requires another payment attempt",
              ]}
              retryButtonText="Resolve in Stripe"
              isRetrying={openingPortal}
              onRetry={() => void openBillingPortal()}
            />
          ) : null}

          <BentoGrid className="auto-rows-auto grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
            <div className="rounded-2xl border border-border bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,.1),transparent_42%),var(--card)] p-5 shadow-sm lg:col-span-2">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Plan</p>
              <p className="mt-3 text-2xl font-semibold">{summary.subscription?.planName ?? "No plan"}</p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm lg:col-span-2">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Status</p>
              <p className="mt-3 text-2xl font-semibold capitalize">{summary.subscription?.status?.replaceAll("_", " ") ?? "Inactive"}</p>
            </div>
            <div className="rounded-2xl border border-border bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,.12),transparent_42%),var(--card)] p-5 shadow-sm sm:col-span-2 lg:col-span-2">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Balance</p>
              <p className="mt-3 text-2xl font-semibold">{balance === null ? "—" : formatTokens(balance)}</p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:col-span-2 lg:col-span-4">
              <p className="text-sm font-semibold text-foreground">
                Manage billing
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Open the Stripe portal to update payment methods, download
                invoices, or switch your subscription.
              </p>
              <GhostButton onClick={openBillingPortal} className="mt-4">
                {openingPortal ? "Opening portal…" : "Open billing portal"}
              </GhostButton>
            </div>

            <div className="rounded-2xl border border-border bg-[radial-gradient(circle_at_top_right,rgba(139,92,246,.1),transparent_42%),var(--card)] p-5 shadow-sm sm:col-span-2 lg:col-span-2">
              <p className="text-sm font-semibold text-foreground">Purchase a plan</p>
              <p className="mt-1 text-sm text-muted-foreground">Open the secure in-app checkout to compare current Stripe prices and subscribe.</p>
              <GhostButton className="mt-4" onClick={() => { window.location.href = "/billing"; }}>View plans</GhostButton>
            </div>
          </BentoGrid>

          <BentoGrid className="auto-rows-auto grid-cols-1 gap-4 lg:grid-cols-5">
          <UsageTable
            className="lg:col-span-3"
            usageHistory={toUsageItems(transactions)}
            title="Recent usage"
            description="Token activity recorded by the secure usage ledger."
            limit={8}
          />

          <UsageBasedPricing
            className="max-w-none lg:col-span-2"
            min={100}
            max={5000}
            defaultValue={1000}
            snapTo={100}
            basePrice={0}
            includedCredits={0}
            unitPricePerCredit={0.01}
            title="Usage-based estimate"
            subtitle="Plan a monthly token budget. This calculator does not start a charge."
            unitLabel="Tokens"
          />
          </BentoGrid>

          {summary.invoices.length ? (
            <div className="rounded-2xl border bg-background p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">Recent invoices</p>
                  <p className="mt-1 text-sm text-muted-foreground">Latest Stripe test-mode billing records.</p>
                </div>
                <span className="text-xs text-muted-foreground">{summary.invoices.length} invoices</span>
              </div>
              <div className="mt-4 divide-y">
                {summary.invoices.map((invoice) => (
                  <div key={invoice.id} className="flex items-center justify-between gap-4 py-3 text-sm">
                    <div>
                      <p className="font-medium">{invoice.month}</p>
                      <p className="text-xs capitalize text-muted-foreground">{invoice.status}</p>
                    </div>
                    <span className="font-semibold tabular-nums">${invoice.amount.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
