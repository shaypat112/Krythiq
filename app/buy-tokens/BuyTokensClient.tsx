"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Coins, Loader2 } from "lucide-react";
import { buildAuthHeaders } from "@/app/lib/http";
import { createClient } from "@/app/lib/supabase";
import { formatTokens } from "@/app/lib/tokens";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PricingTableThree } from "@/components/billingsdk/pricing-table-three";
import type { Plan as PricingPlan } from "@/lib/billingsdk-config";
import {
  destroyStripeCheckout,
  mountStripeCheckout,
} from "@/app/lib/stripe-embedded-client";

type Pack = {
  id: string;
  name: string;
  tokens: number;
  description: string;
  available: boolean;
  unitAmount?: number;
  currency?: string;
};

function currencySymbol(code?: string) {
  if (!code) return "$";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: code.toUpperCase(),
    currencyDisplay: "narrowSymbol",
  }).formatToParts(0).find((part) => part.type === "currency")?.value ?? "$";
}

function StripeCheckout({
  clientSecret,
  publishableKey,
  onClose,
}: {
  clientSecret: string;
  publishableKey: string;
  onClose: () => void;
}) {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    let checkout: Awaited<ReturnType<typeof mountStripeCheckout>> = null;
    void mountStripeCheckout({
      clientSecret,
      publishableKey,
      target: "#token-embedded-checkout",
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

  return (
    <Card className="border-primary/30">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>Stripe test token checkout</CardTitle>
            <CardDescription>No real payment will be processed. Use card 4242 4242 4242 4242, any future expiry, and any CVC.</CardDescription>
          </div>
          <Button variant="ghost" onClick={onClose}>Close</Button>
        </div>
      </CardHeader>
      <CardContent>
        {error ? (
          <p role="alert" className="text-sm text-destructive">{error}</p>
        ) : (
          <div id="token-embedded-checkout" className="min-h-96" />
        )}
      </CardContent>
    </Card>
  );
}

export function BuyTokensClient() {
  const supabase = useMemo(() => createClient(), []);
  const [packs, setPacks] = useState<Pack[]>([]);
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingPack, setLoadingPack] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checkout, setCheckout] = useState<{
    clientSecret: string;
    publishableKey: string;
  } | null>(null);

  const getAccessToken = useCallback(
    async () => (await supabase.auth.getSession()).data.session?.access_token ?? null,
    [supabase],
  );

  useEffect(() => {
    let active = true;
    void getAccessToken().then(async (accessToken) => {
      if (!accessToken) throw new Error("Sign in to buy Tokens.");
      const headers = buildAuthHeaders(accessToken);
      const [packsResponse, tokenResponse] = await Promise.all([
        fetch("/api/tokens/packs", { headers }),
        fetch("/api/tokens", { headers }),
      ]);
      const [packsPayload, tokenPayload] = await Promise.all([
        packsResponse.json().catch(() => ({})),
        tokenResponse.json().catch(() => ({})),
      ]);
      if (!packsResponse.ok) throw new Error(packsPayload.error ?? "Unable to load token packs.");
      if (!tokenResponse.ok) throw new Error(tokenPayload.error ?? "Unable to load your balance.");
      if (active) {
        setPacks(packsPayload.packs ?? []);
        setBalance(Number(tokenPayload.balance));
      }
    }).catch((cause) => {
      if (active) setError(cause instanceof Error ? cause.message : "Unable to load token checkout.");
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [getAccessToken]);

  const beginCheckout = async (packId: string) => {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      setError("Sign in to buy Tokens.");
      return;
    }
    setLoadingPack(packId);
    setError(null);
    try {
      const response = await fetch("/api/tokens/checkout", {
        method: "POST",
        headers: buildAuthHeaders(accessToken, {
          "Content-Type": "application/json",
          "Idempotency-Key": crypto.randomUUID().replaceAll("-", ""),
        }),
        body: JSON.stringify({ packId }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.clientSecret || !payload.publishableKey) {
        throw new Error(payload.error ?? "Checkout could not be started.");
      }
      setCheckout({
        clientSecret: payload.clientSecret,
        publishableKey: payload.publishableKey,
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Checkout could not be started.");
    } finally {
      setLoadingPack(null);
    }
  };

  if (loading) {
    return <div role="status" className="flex min-h-80 items-center justify-center"><Loader2 className="animate-spin" /><span className="sr-only">Loading token packs</span></div>;
  }

  const pricingPacks: PricingPlan[] = packs.map((pack, index) => ({
    id: pack.id,
    title: pack.name,
    description: pack.description,
    currency: currencySymbol(pack.currency),
    monthlyPrice:
      pack.unitAmount === undefined
        ? "Unavailable"
        : (pack.unitAmount / 100).toFixed(pack.unitAmount % 100 === 0 ? 0 : 2),
    yearlyPrice:
      pack.unitAmount === undefined
        ? "Unavailable"
        : (pack.unitAmount / 100).toFixed(pack.unitAmount % 100 === 0 ? 0 : 2),
    buttonText:
      loadingPack === pack.id
        ? "Starting test checkout…"
        : pack.available
          ? "Choose test pack"
          : "Unavailable",
    badge: index === 1 ? "Popular" : undefined,
    highlight: index === 1,
    disabled: !pack.available || loadingPack !== null,
    features: [
      { name: formatTokens(pack.tokens), icon: "check" },
      { name: "One-time test payment", icon: "check" },
      { name: "Credited after signed webhook", icon: "check" },
    ],
  }));

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Stripe test mode only</p>
          <h1 className="mt-3 text-3xl font-semibold">Buy Tokens</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">Choose a test Token pack for repository scans and paid AI features. Live payments are disabled.</p>
        </div>
        <div className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3">
          <Coins className="h-5 w-5 text-amber-500" />
          <div><p className="text-xs text-muted-foreground">Current balance</p><p className="font-semibold">{balance === null ? "—" : formatTokens(balance)}</p></div>
        </div>
      </header>

      {error ? <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">{error}</p> : null}

      {checkout ? (
        <StripeCheckout {...checkout} onClose={() => setCheckout(null)} />
      ) : (
        pricingPacks.length > 0 ? (
          <PricingTableThree
            plans={pricingPacks}
            onPlanSelect={(packId) => void beginCheckout(packId)}
            billingMode="one-time"
            variant="small"
            showFooter={false}
            className="mt-2"
          />
        ) : (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">
              No Stripe test Token packs are configured for this environment.
            </CardContent>
          </Card>
        )
      )}
      <p className="text-center text-xs text-muted-foreground">Tokens are credited by a signed Stripe webhook after payment succeeds. They are not subscriptions and do not expire.</p>
    </div>
  );
}
