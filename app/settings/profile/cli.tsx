"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Coins, Laptop, Loader2, ScanSearch, ShieldOff } from "lucide-react";
import { createClient } from "@/app/lib/supabase";
import { buildAuthHeaders } from "@/app/lib/http";
import { formatTokens } from "@/app/lib/tokens";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

type CliDevice = { id: string; name: string; last_used_at: string | null; expires_at: string | null; revoked_at: string | null; created_at: string };
type CliScan = { id: string; repository: string; issues: number; token_cost: number; created_at: string };
type CliSettings = { connected: boolean; devices: CliDevice[]; scans: CliScan[]; stats: { connectedTerminals: number; scanCount: number; tokensUsed: number; tokensLeft: number } };

export function CliSection() {
  const supabase = useMemo(() => createClient(), []);
  const [data, setData] = useState<CliSettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    if (!token) throw new Error("Sign in to manage CLI connections.");
    const response = await fetch("/api/cli/settings", { headers: buildAuthHeaders(token) });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error ?? "Unable to load CLI settings.");
    setData(payload as CliSettings);
  }, [supabase]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load().catch((cause) => setError(cause instanceof Error ? cause.message : "Unable to load CLI settings.")); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const revoke = async (tokenId: string) => {
    setRevoking(tokenId); setError(null);
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    if (!token) { setError("Sign in to revoke this terminal."); setRevoking(null); return; }
    const response = await fetch(`/api/cli/settings?tokenId=${encodeURIComponent(tokenId)}`, { method: "DELETE", headers: buildAuthHeaders(token) });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) setError(payload.error ?? "Unable to revoke terminal."); else await load();
    setRevoking(null);
  };

  if (!data && !error) return <div className="space-y-4"><Skeleton className="h-28" /><Skeleton className="h-72" /></div>;
  return <div className="space-y-8"><header><p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Developer tools</p><h1 className="mt-2 text-2xl font-semibold">CLI</h1><p className="mt-2 text-sm text-muted-foreground">Terminal connections, dashboard-synced scans, and Token usage attributed only to CLI scan operations.</p></header>{error ? <p role="alert" className="border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-500">{error}</p> : null}{data ? <><section className="grid border-y border-border sm:grid-cols-2 lg:grid-cols-4">{[{ label: "Connected terminals", value: data.stats.connectedTerminals, icon: Laptop }, { label: "CLI scans", value: data.stats.scanCount, icon: ScanSearch }, { label: "CLI Tokens used", value: formatTokens(data.stats.tokensUsed), icon: Coins }, { label: "Tokens left", value: formatTokens(data.stats.tokensLeft), icon: Coins }].map(({ label, value, icon: Icon }) => <div key={label} className="border-b border-border py-5 last:border-b-0 sm:border-b-0 sm:border-r sm:px-5 sm:first:pl-0 sm:last:border-r-0"><Icon className="size-4 text-muted-foreground" /><p className="mt-3 text-xs text-muted-foreground">{label}</p><p className="mt-1 text-xl font-semibold">{value}</p></div>)}</section><section><h2 className="text-sm font-semibold">Authorized terminals</h2><div className="mt-3 divide-y divide-border border-y">{data.devices.filter((device) => !device.revoked_at).map((device) => <div key={device.id} className="flex flex-wrap items-center gap-4 py-4"><Laptop className="size-5 text-sky-500" /><div className="min-w-0 flex-1"><p className="text-sm font-medium">{device.name}</p><p className="mt-1 text-xs text-muted-foreground">Connected {new Date(device.created_at).toLocaleString()} · {device.last_used_at ? `last used ${new Date(device.last_used_at).toLocaleString()}` : "not used yet"}</p></div><Button size="sm" variant="outline" disabled={revoking === device.id} onClick={() => void revoke(device.id)}>{revoking === device.id ? <Loader2 className="animate-spin" /> : <ShieldOff />}Revoke</Button></div>)}</div></section><section><h2 className="text-sm font-semibold">Recent CLI scans</h2><p className="mt-1 text-xs text-muted-foreground">Local static scans currently cost 0 Tokens. Any future paid CLI scan action will be counted here without mixing in web usage.</p><div className="mt-3 divide-y divide-border border-y">{data.scans.map((scan) => <div key={scan.id} className="grid gap-1 py-3 text-sm sm:grid-cols-[1fr_auto_auto]"><span className="truncate font-medium">{scan.repository}</span><span className="text-muted-foreground">{scan.issues} findings</span><span className="text-muted-foreground">{formatTokens(scan.token_cost)} · {new Date(scan.created_at).toLocaleString()}</span></div>)}{!data.scans.length ? <p className="py-8 text-center text-sm text-muted-foreground">No connected CLI scans yet.</p> : null}</div></section></> : null}</div>;
}
