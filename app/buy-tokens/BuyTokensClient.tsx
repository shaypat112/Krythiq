"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Coins, CreditCard, Loader2, ShieldCheck } from "lucide-react";
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

type Pack = {
  id: string;
  name: string;
  tokens: number;
  description: string;
  available: boolean;
  unitAmount?: number;
  currency?: string;
};

declare global {
  interface Window {
    Stripe?: (key: string) => {
      initEmbeddedCheckout: (options: {
        fetchClientSecret: () => Promise<string>;
      }) => Promise<{
        mount: (target: string) => void;
        destroy: () => void;
      }>;
    };
  }
}

function formatPrice(amount?: number, currency?: string) {
  if (amount === undefined || !currency) return "Unavailable";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount / 100);
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
    let checkout: { mount: (target: string) => void; destroy: () => void } | null = null;
    const mount = async () => {
      try {
        if (!window.Stripe) {
          await new Promise<void>((resolve, reject) => {
            const existing = document.querySelector<HTMLScriptElement>(
              'script[src="https://js.stripe.com/clover/stripe.js"]',
            );
            if (existing) {
              existing.addEventListener("load", () => resolve(), { once: true });
              existing.addEventListener("error", () => reject(new Error("Unable to load Stripe.")), { once: true });
              return;
            }
            const script = document.createElement("script");
            script.src = "https://js.stripe.com/clover/stripe.js";
            script.async = true;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error("Unable to load Stripe's secure payment form."));
            document.head.appendChild(script);
          });
        }
        if (!window.Stripe) throw new Error("Stripe payment form is unavailable.");
        checkout = await window.Stripe(publishableKey).initEmbeddedCheckout({
          fetchClientSecret: async () => clientSecret,
        });
        checkout.mount("#token-embedded-checkout");
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Unable to load checkout.");
      }
    };
    void mount();
    return () => checkout?.destroy();
  }, [clientSecret, publishableKey]);

  return (
    <Card className="border-primary/30">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>Secure token checkout</CardTitle>
            <CardDescription>Stripe securely hosts all payment fields.</CardDescription>
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

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Token store</p>
          <h1 className="mt-3 text-3xl font-semibold">Buy Tokens</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">Choose a one-time Token pack for repository scans and paid AI features.</p>
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
        <div className="grid gap-4 md:grid-cols-3">
          {packs.map((pack, index) => (
            <Card key={pack.id} className={index === 1 ? "border-primary/40 shadow-sm" : ""}>
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <CardTitle>{pack.name}</CardTitle>
                  {index === 1 ? <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">Popular</span> : null}
                </div>
                <CardDescription>{pack.description}</CardDescription>
                <p className="pt-4 text-3xl font-semibold">{formatTokens(pack.tokens)}</p>
                <p className="text-lg font-medium">{formatPrice(pack.unitAmount, pack.currency)}</p>
              </CardHeader>
              <CardContent>
                <ul className="mb-6 space-y-2 text-sm text-muted-foreground">
                  <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 text-emerald-500" />One-time payment</li>
                  <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 text-emerald-500" />Added after verified payment</li>
                  <li className="flex gap-2"><ShieldCheck className="mt-0.5 h-4 w-4 text-emerald-500" />Secure Stripe checkout</li>
                </ul>
                <Button className="w-full" disabled={!pack.available || loadingPack !== null} onClick={() => void beginCheckout(pack.id)}>
                  {loadingPack === pack.id ? <Loader2 className="animate-spin" /> : <CreditCard />}
                  {pack.available ? "Buy securely" : "Unavailable"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <p className="text-center text-xs text-muted-foreground">Tokens are credited by a signed Stripe webhook after payment succeeds. They are not subscriptions and do not expire.</p>
    </div>
  );
}
