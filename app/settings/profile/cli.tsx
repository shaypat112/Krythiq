"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Coins, Laptop, Loader2, ScanSearch, ShieldOff, RefreshCw } from "lucide-react";
import { createClient } from "@/app/lib/supabase";
import { fetchWithSession } from "@/app/lib/session-fetch";
import { cliDeviceStatus } from "@/app/lib/cli-session";
import { formatTokens } from "@/app/lib/tokens";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeading } from "@/app/components/PageHeading";

type CliDevice = { id: string; name: string; last_used_at: string | null; expires_at: string | null; refresh_expires_at: string | null; revoked_at: string | null; created_at: string };
type CliScan = { id: string; repository: string; issues: number; token_cost: number; created_at: string };
type CliSettings = { connected: boolean; devices: CliDevice[]; scans: CliScan[]; stats: { connectedTerminals: number; scanCount: number; tokensUsed: number; tokensLeft: number } };

export function CliSection() {
  const supabase = useMemo(() => createClient(), []);
  const sequence = useRef(0);
  const [data, setData] = useState<CliSettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (signal?: AbortSignal) => {
    const requestId = ++sequence.current;
    try {
      const response = await fetchWithSession(supabase, "/api/cli/settings", { signal });
      const payload = await response.json().catch(() => ({}));
      if (signal?.aborted || requestId !== sequence.current) return;
      if (!response.ok) throw new Error(payload.error ?? "Unable to load CLI settings.");
      setData(payload as CliSettings); setError(null);
    } catch (cause) { if (requestId === sequence.current && !signal?.aborted) throw cause; }
  }, [supabase]);

  useEffect(() => {
    const controller = new AbortController();
    const update = () => { if (!document.hidden) void load(controller.signal).catch(cause => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Unable to refresh terminals."); }); };
    const timer = window.setTimeout(update, 0);
    const interval = window.setInterval(update, 30_000);
    window.addEventListener("focus", update);
    return () => { controller.abort(); window.clearTimeout(timer); window.clearInterval(interval); window.removeEventListener("focus", update); };
  }, [load]);

  const refresh = async () => {
    setRefreshing(true);
    try { await load(); } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to refresh terminals."); }
    finally { setRefreshing(false); }
  };
  const revoke = async (tokenId: string) => {
    setRevoking(tokenId); setError(null);
    try {
      const response = await fetchWithSession(supabase, `/api/cli/settings?tokenId=${encodeURIComponent(tokenId)}`, { method: "DELETE" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? "Unable to revoke terminal.");
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to revoke terminal."); }
    finally { setRevoking(null); }
  };

  return <div className="space-y-8">
    <PageHeading title="CLI connections" description="Manage terminal authorizations and the same CLI usage and Token balance shown in your terminal." actions={<Button variant="outline" disabled={refreshing} onClick={() => void refresh()}><RefreshCw className={refreshing ? "animate-spin" : ""} />Refresh</Button>} />
    <div className="rounded-xl bg-card p-5 text-sm leading-6"><p className="font-medium">Connect a terminal</p><code className="mt-2 block">krythiq connect --name my-laptop</code><p className="mt-2 text-muted-foreground">Approve the browser code and keep your terminal open until both confirm connection. <Link href="/documentation/connect-cli" className="text-foreground underline">Connection guide</Link></p></div>
    <div className="rounded-xl bg-card p-5 text-sm leading-6"><p className="font-medium">Use your account Tokens from the terminal</p><code className="mt-2 block break-all">krythiq review src/auth.ts</code><p className="text-muted-foreground">Security analysis of a selected file · 15 Tokens</p><code className="mt-3 block break-all">krythiq ask &quot;Explain this code&quot; --file src/auth.ts</code><p className="text-muted-foreground">Questions about selected files · 10 Tokens</p><p className="mt-3 text-muted-foreground">Both commands ask before uploading files and use your website balance. View account transactions with <code>krythiq tokens --history</code> or in <Link href="/settings?section=billing" className="text-foreground underline">Billing settings</Link>. <Link href="/documentation/commands" className="text-foreground underline">Command reference</Link></p></div>
    {error ? <p role="alert" className="rounded-xl bg-destructive/10 p-4 text-sm text-destructive">{error} {data ? "Showing the last successful update." : ""}</p> : null}
    {!data && !error ? <div className="space-y-4"><Skeleton className="h-28" /><Skeleton className="h-72" /></div> : null}
    {data ? <>
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[{ label: "Authorized terminals", value: data.stats.connectedTerminals, icon: Laptop }, { label: "CLI scans", value: data.stats.scanCount, icon: ScanSearch }, { label: "Saved scan Tokens", value: formatTokens(data.stats.tokensUsed), icon: Coins }, { label: "Tokens left", value: formatTokens(data.stats.tokensLeft), icon: Coins }].map(({ label, value, icon: Icon }) => <div key={label} className="rounded-xl bg-card p-5"><Icon className="size-4 text-muted-foreground" /><p className="mt-3 text-xs text-muted-foreground">{label}</p><p className="mt-1 text-xl font-semibold">{value}</p></div>)}</section>
      <section><h2 className="font-semibold">Terminals</h2><p className="mt-2 text-sm text-muted-foreground">Refreshes every 30 seconds and when you return to this tab. Authorized does not mean currently online.</p><div className="mt-4 divide-y divide-border">{data.devices.map(device => {
        const status = cliDeviceStatus(device);
        return <div key={device.id} className="flex flex-wrap items-center gap-4 py-4"><Laptop className="size-5 text-muted-foreground" /><div className="min-w-0 flex-1"><p className="text-sm font-medium">{device.name} <span className="ml-2 text-xs font-normal capitalize text-muted-foreground">{status === "active" ? "Authorized" : status}</span></p><p className="mt-1 text-xs text-muted-foreground">{device.last_used_at ? `Last used ${new Date(device.last_used_at).toLocaleString()}` : "Not used yet"}{device.refresh_expires_at ? ` · Authorization expires ${new Date(device.refresh_expires_at).toLocaleDateString()}` : " · Legacy credential: reconnect to enable renewal"}</p></div>{status !== "revoked" ? <Button size="sm" variant="outline" disabled={revoking === device.id} onClick={() => void revoke(device.id)}>{revoking === device.id ? <Loader2 className="animate-spin" /> : <ShieldOff />}Revoke</Button> : null}</div>;
      })}{!data.devices.length ? <p className="py-6 text-sm text-muted-foreground">No terminals yet. Run the connect command above to get started.</p> : null}</div></section>
      <section><h2 className="font-semibold">Recent CLI scans</h2><p className="mt-2 text-sm text-muted-foreground">Static terminal scans cost 0 Tokens. These totals include all CLI history; the list shows the latest 100 scans.</p><div className="mt-3 divide-y divide-border">{data.scans.map(scan => <div key={scan.id} className="grid gap-1 py-3 text-sm sm:grid-cols-[1fr_auto_auto]"><span className="truncate font-medium">{scan.repository}</span><span className="text-muted-foreground">{scan.issues} findings</span><span className="text-muted-foreground">{formatTokens(scan.token_cost)} · {new Date(scan.created_at).toLocaleString()}</span></div>)}{!data.scans.length ? <p className="py-6 text-sm text-muted-foreground">No saved CLI scans yet. Use krythiq scan --save.</p> : null}</div></section>
    </> : null}
  </div>;
}
