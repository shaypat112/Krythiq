"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Check, Coins, Loader2, Plus, RotateCcw, Send, ShieldCheck, X } from "lucide-react";
import { createClient } from "@/app/lib/supabase";
import { buildAuthHeaders } from "@/app/lib/http";
import { formatTokens } from "@/app/lib/tokens";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { BentoGrid } from "@/components/ui/bento-grid";

type Account = {
  balance: number;
  costs: Record<string, { label: string; cost: number }>;
  transactions: Array<{ id: string; amount: number; transaction_type: string; description: string; created_at: string }>;
};

type TokenRequest = {
  id: string;
  user_id: string;
  amount: number;
  request_type: "test_tokens" | "refund";
  reason: string | null;
  status: "pending" | "approved" | "rejected";
  reviewed_at: string | null;
  created_at: string;
  requester?: {
    username: string | null;
    full_name: string | null;
  } | null;
};

type RequestSummary = {
  isAdmin: boolean;
  adminLogin: string | null;
  ownRequests: TokenRequest[];
  pendingRequests: TokenRequest[];
};

export function TokensSection() {
  const supabase = useMemo(() => createClient(), []);
  const [account, setAccount] = useState<Account | null>(null);
  const [requests, setRequests] = useState<RequestSummary | null>(null);
  const [amount, setAmount] = useState(100);
  const [refundAmount, setRefundAmount] = useState(0);
  const [refundReason, setRefundReason] = useState("");
  const [refundFormOpen, setRefundFormOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) throw new Error("Sign in to view Tokens.");
    const headers = buildAuthHeaders(token);
    const [accountResponse, requestsResponse] = await Promise.all([
      fetch("/api/tokens", { headers }),
      fetch("/api/tokens/requests", { headers }),
    ]);
    const [accountPayload, requestsPayload] = await Promise.all([
      accountResponse.json().catch(() => ({})),
      requestsResponse.json().catch(() => ({})),
    ]);
    if (!accountResponse.ok) {
      throw new Error(accountPayload?.error ?? "Unable to load Tokens.");
    }
    if (!requestsResponse.ok) {
      throw new Error(requestsPayload?.error ?? "Unable to load Token requests.");
    }
    setAccount(accountPayload as Account);
    setRequests(requestsPayload as RequestSummary);
  }, [supabase]);

  useEffect(() => {
    let active = true;
    void load().catch((cause) => {
      if (active) setError(cause instanceof Error ? cause.message : "Unable to load Tokens.");
    });
    return () => { active = false; };
  }, [load]);

  const submitRequest = async (
    requestType: "test_tokens" | "refund" = "test_tokens",
  ) => {
    setSubmitting(true);
    setError(null);
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) throw new Error("Sign in to request Tokens.");
      const response = await fetch("/api/tokens/requests", {
        method: "POST",
        headers: buildAuthHeaders(token, { "Content-Type": "application/json" }),
        body: JSON.stringify({
          amount: requestType === "refund" ? refundAmount : amount,
          requestType,
          reason: requestType === "refund" ? refundReason : undefined,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error ?? "Unable to request Tokens.");
      if (requestType === "refund") {
        setRefundFormOpen(false);
        setRefundAmount(0);
        setRefundReason("");
      }
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to request Tokens.");
    } finally {
      setSubmitting(false);
    }
  };

  const reviewRequest = async (
    requestId: string,
    decision: "approved" | "rejected",
  ) => {
    setReviewingId(requestId);
    setError(null);
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) throw new Error("Sign in to review Token requests.");
      const response = await fetch("/api/tokens/requests", {
        method: "PATCH",
        headers: buildAuthHeaders(token, { "Content-Type": "application/json" }),
        body: JSON.stringify({ requestId, decision }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error ?? "Unable to review request.");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to review request.");
    } finally {
      setReviewingId(null);
    }
  };

  if (!account && !error) return <div className="space-y-4"><Skeleton className="h-32" /><Skeleton className="h-72" /></div>;
  return <div className="space-y-6">
    <header><p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Usage currency</p><h1 className="mt-2 text-2xl font-semibold">Tokens</h1><p className="mt-2 text-sm text-muted-foreground">Token balances and charges are recorded by the secure server-side ledger.</p></header>
    {error ? <p role="alert" className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-500">{error}</p> : null}
    {account ? <>
      <BentoGrid className="auto-rows-auto grid-cols-1 gap-4 lg:grid-cols-2">
      <Card className="h-full lg:col-span-2"><CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-4"><div className="rounded-full bg-amber-500/10 p-3 text-amber-500"><Coins /></div><div><p className="text-sm text-muted-foreground">Available balance</p><p className="text-2xl font-semibold">{formatTokens(account.balance)}</p></div></div><Button asChild><Link href="/buy-tokens"><Plus />Buy Tokens</Link></Button></CardContent></Card>
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Request test Tokens</CardTitle>
          <p className="text-sm text-muted-foreground">
            {requests?.adminLogin
              ? `Ask @${requests.adminLogin} for up to 500 Tokens while billing is in test mode.`
              : "Request up to 500 test Tokens. Reviews require TOKEN_ADMIN_GITHUB_LOGIN to be configured on the server."}
          </p>
        </CardHeader>
        <CardContent className="space-y-5">
          {requests?.ownRequests.some((request) => request.status === "pending") ? (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4">
              <p className="font-medium">Request awaiting review</p>
              <p className="mt-1 text-sm text-muted-foreground">
                You requested {formatTokens(requests.ownRequests.find((request) => request.status === "pending")?.amount ?? 0)}.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <label className="flex-1 space-y-2">
                <span className="text-sm font-medium">Amount</span>
                <Input
                  type="number"
                  min={1}
                  max={500}
                  step={1}
                  value={amount}
                  onChange={(event) => setAmount(Number(event.target.value))}
                />
              </label>
              <Button
                onClick={() => void submitRequest("test_tokens")}
                disabled={submitting || !Number.isInteger(amount) || amount < 1 || amount > 500}
              >
                {submitting ? <Loader2 className="animate-spin" /> : <Send />}
                {submitting ? "Sending…" : "Request Tokens"}
              </Button>
            </div>
          )}

          {requests?.ownRequests.length ? (
            <div className="border-t pt-4">
              <p className="text-sm font-medium">Request history</p>
              <div className="mt-2 divide-y">
                {requests.ownRequests.slice(0, 5).map((request) => (
                  <div key={request.id} className="flex items-center justify-between gap-4 py-2 text-sm">
                    <span>{formatTokens(request.amount)}</span>
                    <span className="capitalize text-muted-foreground">{request.status}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card className="h-full border-sky-500/20">
        <CardHeader>
          <div className="flex items-center gap-2"><RotateCcw className="size-5 text-sky-500" /><CardTitle>Request a Token refund</CardTitle></div>
          <p className="text-sm text-muted-foreground">If a scan or AI action did not deliver a usable result, submit the number of Tokens charged and explain what happened. Requests are reviewed before Tokens are credited.</p>
        </CardHeader>
        <CardContent>
          {requests?.ownRequests.some((request) => request.status === "pending") ? (
            <p className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm">You already have a Token request awaiting review.</p>
          ) : !refundFormOpen ? (
            <Button variant="outline" onClick={() => setRefundFormOpen(true)}><RotateCcw />Request refund</Button>
          ) : (
            <div className="space-y-4 rounded-xl border border-border bg-muted/15 p-4">
              <label className="block space-y-2">
                <span className="text-sm font-medium">How many Tokens?</span>
                <Input type="number" min={1} max={500} step={1} value={refundAmount || ""} onChange={(event) => setRefundAmount(Number(event.target.value))} placeholder="Tokens charged" />
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-medium">Why are you requesting a refund?</span>
                <Textarea value={refundReason} onChange={(event) => setRefundReason(event.target.value)} minLength={10} maxLength={1000} rows={4} placeholder="Tell us which scan or action failed and what result you expected." />
                <span className="block text-right text-xs text-muted-foreground">{refundReason.trim().length}/1000</span>
              </label>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => void submitRequest("refund")} disabled={submitting || !Number.isInteger(refundAmount) || refundAmount < 1 || refundAmount > 500 || refundReason.trim().length < 10}>
                  {submitting ? <Loader2 className="animate-spin" /> : <Send />}{submitting ? "Sending…" : "Submit refund request"}
                </Button>
                <Button variant="ghost" onClick={() => setRefundFormOpen(false)} disabled={submitting}>Cancel</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="h-full"><CardHeader><CardTitle>AI action prices</CardTitle></CardHeader><CardContent className="divide-y divide-border">{Object.entries(account.costs).map(([action, item]) => <div key={action} className="flex justify-between gap-4 py-3 text-sm"><span>{item.label}</span><span className="font-medium">{formatTokens(item.cost)}</span></div>)}</CardContent></Card>
      <Card className="h-full"><CardHeader><CardTitle>Transaction history</CardTitle></CardHeader><CardContent>{account.transactions.length ? <ul className="divide-y divide-border">{account.transactions.map((transaction) => <li key={transaction.id} className="flex items-start justify-between gap-4 py-3 text-sm"><div><p>{transaction.description}</p><p className="text-xs text-muted-foreground">{new Date(transaction.created_at).toLocaleString()}</p></div><span className={transaction.amount >= 0 ? "text-emerald-500" : "text-foreground"}>{transaction.amount > 0 ? "+" : ""}{transaction.amount.toLocaleString()}</span></li>)}</ul> : <p className="py-8 text-center text-sm text-muted-foreground">No token activity yet.</p>}</CardContent></Card>
      </BentoGrid>
      {requests?.isAdmin ? (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader><div className="flex items-center gap-2"><ShieldCheck className="size-5 text-primary" /><CardTitle>Admin approvals · @shaypat112</CardTitle></div><p className="text-sm text-muted-foreground">Only the verified GitHub account shaypat112 can see or use these controls. Approval immediately credits the requester through the secure ledger.</p></CardHeader>
          <CardContent>{requests.pendingRequests.length ? <div className="divide-y">{requests.pendingRequests.map((request) => { const requesterName = request.requester?.username ? `@${request.requester.username}` : request.requester?.full_name ?? request.user_id; return <div key={request.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-medium">{requesterName}</p><p className="mt-1 text-sm text-muted-foreground">Requests {formatTokens(request.amount)} · {request.request_type === "refund" ? "Refund" : "Test Tokens"} · {new Date(request.created_at).toLocaleString()}</p>{request.reason ? <p className="mt-2 max-w-xl text-sm leading-5 text-muted-foreground">“{request.reason}”</p> : null}</div><div className="flex gap-2"><Button size="sm" variant="outline" disabled={reviewingId !== null} onClick={() => void reviewRequest(request.id, "rejected")}><X /> Reject</Button><Button size="sm" disabled={reviewingId !== null} onClick={() => void reviewRequest(request.id, "approved")}>{reviewingId === request.id ? <Loader2 className="animate-spin" /> : <Check />} Approve</Button></div></div>; })}</div> : <p className="py-8 text-center text-sm text-muted-foreground">No pending requests.</p>}</CardContent>
        </Card>
      ) : null}
    </> : null}
  </div>;
}
