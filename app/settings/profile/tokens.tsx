"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Coins, Plus } from "lucide-react";
import { createClient } from "@/app/lib/supabase";
import { buildAuthHeaders } from "@/app/lib/http";
import { formatTokens } from "@/app/lib/tokens";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

type Account = {
  balance: number;
  costs: Record<string, { label: string; cost: number }>;
  transactions: Array<{ id: string; amount: number; transaction_type: string; description: string; created_at: string }>;
};

export function TokensSection() {
  const supabase = useMemo(() => createClient(), []);
  const [account, setAccount] = useState<Account | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void supabase.auth.getSession().then(async ({ data }) => {
      const token = data.session?.access_token;
      if (!token) throw new Error("Sign in to view Tokens.");
      const response = await fetch("/api/tokens", { headers: buildAuthHeaders(token) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error ?? "Unable to load Tokens.");
      if (active) setAccount(payload as Account);
    }).catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "Unable to load Tokens."); });
    return () => { active = false; };
  }, [supabase]);

  if (!account && !error) return <div className="space-y-4"><Skeleton className="h-32" /><Skeleton className="h-72" /></div>;
  return <div className="space-y-6">
    <header><p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Usage currency</p><h1 className="mt-2 text-2xl font-semibold">Tokens</h1><p className="mt-2 text-sm text-muted-foreground">Token balances and charges are recorded by the secure server-side ledger.</p></header>
    {error ? <p role="alert" className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-500">{error}</p> : null}
    {account ? <>
      <Card><CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-4"><div className="rounded-full bg-amber-500/10 p-3 text-amber-500"><Coins /></div><div><p className="text-sm text-muted-foreground">Available balance</p><p className="text-2xl font-semibold">{formatTokens(account.balance)}</p></div></div><Button asChild><Link href="/buy-tokens"><Plus />Buy Tokens</Link></Button></CardContent></Card>
      <Card><CardHeader><CardTitle>AI action prices</CardTitle></CardHeader><CardContent className="divide-y divide-border">{Object.entries(account.costs).map(([action, item]) => <div key={action} className="flex justify-between gap-4 py-3 text-sm"><span>{item.label}</span><span className="font-medium">{formatTokens(item.cost)}</span></div>)}</CardContent></Card>
      <Card><CardHeader><CardTitle>Transaction history</CardTitle></CardHeader><CardContent>{account.transactions.length ? <ul className="divide-y divide-border">{account.transactions.map((transaction) => <li key={transaction.id} className="flex items-start justify-between gap-4 py-3 text-sm"><div><p>{transaction.description}</p><p className="text-xs text-muted-foreground">{new Date(transaction.created_at).toLocaleString()}</p></div><span className={transaction.amount >= 0 ? "text-emerald-500" : "text-foreground"}>{transaction.amount > 0 ? "+" : ""}{transaction.amount.toLocaleString()}</span></li>)}</ul> : <p className="py-8 text-center text-sm text-muted-foreground">No token activity yet.</p>}</CardContent></Card>
    </> : null}
  </div>;
}
