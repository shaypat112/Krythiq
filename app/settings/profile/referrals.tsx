"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Copy, Gift, Loader2, MailPlus, Users } from "lucide-react";
import { createClient } from "@/app/lib/supabase";
import { buildAuthHeaders } from "@/app/lib/http";
import { formatTokens } from "@/app/lib/tokens";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

type ReferralData = {
  referralUrl: string;
  rewardAmount: number;
  earnedTokens: number;
  invitations: Array<{ id: string; email: string; status: string; created_at: string; expires_at: string }>;
  relationships: Array<{ id: string; status: string; claimed_at: string; rewarded_at: string | null }>;
};

export function ReferralSection() {
  const supabase = useMemo(() => createClient(), []);
  const [data, setData] = useState<ReferralData | null>(null);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const authenticatedFetch = useCallback(async (input: RequestInfo, init?: RequestInit) => {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) throw new Error("Sign in to manage referrals.");
    return fetch(input, { ...init, headers: buildAuthHeaders(token, init?.headers) });
  }, [supabase]);

  const load = useCallback(async () => {
    try {
      const response = await authenticatedFetch("/api/referrals");
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error ?? "Unable to load referrals.");
      setData(payload as ReferralData);
    } catch (cause) {
      setMessage({ tone: "error", text: cause instanceof Error ? cause.message : "Unable to load referrals." });
    } finally {
      setLoading(false);
    }
  }, [authenticatedFetch]);

  useEffect(() => { void load(); }, [load]);

  const send = async () => {
    setSending(true);
    setMessage(null);
    try {
      const response = await authenticatedFetch("/api/referrals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error ?? "Unable to send this referral.");
      setEmail("");
      setMessage({ tone: "success", text: payload.message ?? "Referral invitation sent." });
      await load();
    } catch (cause) {
      setMessage({ tone: "error", text: cause instanceof Error ? cause.message : "Unable to send this referral." });
    } finally {
      setSending(false);
    }
  };

  const copy = async () => {
    if (!data?.referralUrl) return;
    await navigator.clipboard.writeText(data.referralUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  if (loading) return <Skeleton className="h-80" />;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Gift className="h-5 w-5" /> Refer a friend</CardTitle>
        <p className="text-sm leading-6 text-muted-foreground">
          Earn {formatTokens(data?.rewardAmount ?? 100)} after your friend joins through your link, verifies their email, and completes their first successful paid AI action.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-border bg-muted/20 p-4">
            <p className="text-xs text-muted-foreground">Referral earnings</p>
            <p className="mt-1 text-lg font-semibold">{formatTokens(data?.earnedTokens ?? 0)}</p>
          </div>
          <div className="rounded-xl border border-border bg-muted/20 p-4">
            <p className="text-xs text-muted-foreground">Completed referrals</p>
            <p className="mt-1 text-lg font-semibold">{data?.relationships.filter((item) => item.status === "rewarded").length ?? 0}</p>
          </div>
        </div>

        <div>
          <label htmlFor="referral-email" className="text-sm font-medium">Friend&apos;s email</label>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <Input id="referral-email" type="email" autoComplete="off" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="friend@example.com" />
            <Button type="button" onClick={() => void send()} disabled={sending || !email.trim()}>
              {sending ? <Loader2 className="animate-spin" /> : <MailPlus />}
              {sending ? "Sending…" : "Send invite"}
            </Button>
          </div>
        </div>

        <div>
          <label htmlFor="referral-link" className="text-sm font-medium">Your secure referral link</label>
          <div className="mt-2 flex gap-2">
            <Input id="referral-link" readOnly value={data?.referralUrl ?? ""} className="font-mono text-xs" />
            <Button type="button" variant="outline" aria-label="Copy referral link" onClick={() => void copy()}>
              {copied ? <Check /> : <Copy />}
            </Button>
          </div>
        </div>

        {message ? <p role={message.tone === "error" ? "alert" : "status"} className={`rounded-lg border p-3 text-sm ${message.tone === "error" ? "border-red-500/20 bg-red-500/10 text-red-500" : "border-emerald-500/20 bg-emerald-500/10 text-emerald-600"}`}>{message.text}</p> : null}

        <div>
          <h3 className="flex items-center gap-2 text-sm font-medium"><Users className="h-4 w-4" /> Referral history</h3>
          {data?.invitations.length ? (
            <ul className="mt-2 divide-y divide-border rounded-xl border border-border">
              {data.invitations.map((invitation) => (
                <li key={invitation.id} className="flex items-center justify-between gap-3 p-3 text-sm">
                  <span className="truncate">{invitation.email}</span>
                  <span className="shrink-0 capitalize text-muted-foreground">{invitation.status.replace("_", " ")}</span>
                </li>
              ))}
            </ul>
          ) : <p className="mt-2 rounded-xl border border-dashed border-border p-5 text-center text-sm text-muted-foreground">No referral invitations yet.</p>}
        </div>
      </CardContent>
    </Card>
  );
}
