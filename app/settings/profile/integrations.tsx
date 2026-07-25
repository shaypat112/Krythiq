"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Clock3, ExternalLink, KeyRound, Plug, RefreshCw, ShieldCheck, TriangleAlert } from "lucide-react";
import { createClient } from "@/app/lib/supabase";
import { buildTeamAuthHeaders } from "@/app/lib/http";
import { useTeam } from "@/app/components/TeamProvider";
import type { IntegrationConnection, IntegrationProvider } from "@/app/lib/integrations/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const categoryLabels: Record<string, string> = {
  source: "Source control",
  runtime: "Deployments & runtime",
  data: "Data",
  notifications: "Notifications",
  work: "Issue tracking",
  observability: "Observability",
  cloud: "Cloud",
  identity: "Identity",
};

export function IntegrationsSection() {
  const supabase = useMemo(() => createClient(), []);
  const { selectedTeamId } = useTeam();
  const [providers, setProviders] = useState<IntegrationProvider[]>([]);
  const [connections, setConnections] = useState<IntegrationConnection[]>([]);
  const [githubStatus, setGithubStatus] = useState<"connected" | "expired" | "disconnected">("disconnected");
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("Sign in to manage integrations.");
      const hasGithubIdentity = data.session?.user.app_metadata?.provider === "github" || data.session?.user.identities?.some((identity) => identity.provider === "github") === true;
      setGithubStatus(hasGithubIdentity ? (data.session?.provider_token ? "connected" : "expired") : "disconnected");
      const response = await fetch("/api/integrations", { headers: buildTeamAuthHeaders(token, selectedTeamId) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error ?? "Unable to load integrations.");
      setProviders(payload.providers ?? []);
      setConnections(payload.connections ?? []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load integrations.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [selectedTeamId]); // eslint-disable-line react-hooks/exhaustive-deps

  const connectGitHub = async () => {
    setWorking("github");
    setError(null);
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: { redirectTo: `${window.location.origin}/settings?section=integrations` },
    });
    if (oauthError) {
      setError(oauthError.message);
      setWorking(null);
    }
  };

  const disconnect = async (providerId: string) => {
    setWorking(providerId);
    setError(null);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("Your session expired. Sign in again.");
      const response = await fetch(`/api/integrations?providerId=${encodeURIComponent(providerId)}`, {
        method: "DELETE",
        headers: buildTeamAuthHeaders(token, selectedTeamId),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error ?? "Unable to disconnect integration.");
      setConnections((current) => current.filter((connection) => connection.providerId !== providerId));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to disconnect integration.");
    } finally {
      setWorking(null);
    }
  };

  if (loading) return <div className="space-y-4"><Skeleton className="h-24" /><Skeleton className="h-64" /><Skeleton className="h-64" /></div>;

  const categories = [...new Set(providers.map((provider) => provider.category))];

  return (
    <div className="space-y-6">
      <header><p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Workspace</p><h1 className="mt-2 text-2xl font-semibold">Integrations</h1><p className="mt-2 text-sm leading-6 text-muted-foreground">Connect only what your team uses. Votrio shows unavailable adapters honestly and never asks for credentials before a provider is production-ready.</p></header>
      {error ? <div role="alert" className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-500">{error}</div> : null}
      {categories.map((category) => (
        <section key={category} aria-labelledby={`category-${category}`}>
          <h2 id={`category-${category}`} className="mb-3 text-sm font-semibold">{categoryLabels[category] ?? category}</h2>
          <div className="grid gap-3">
            {providers.filter((provider) => provider.category === category).map((provider) => {
              const storedConnection = connections.find((connection) => connection.providerId === provider.id);
              const connected = provider.id === "github" ? githubStatus === "connected" : Boolean(storedConnection);
              const status = provider.id === "github" ? githubStatus : storedConnection?.status ?? (connected ? "connected" : "disconnected");
              return (
                <Card key={provider.id}>
                  <CardHeader className="pb-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex gap-3"><span className="rounded-lg bg-muted p-2"><Plug className="h-4 w-4" /></span><div><CardTitle className="text-base">{provider.name}</CardTitle><p className="mt-1 text-sm text-muted-foreground">{provider.description}</p></div></div>
                      <Badge variant="outline" className={status === "connected" ? "text-emerald-500" : status === "expired" || status === "error" ? "text-red-500" : ""}>
                        {status === "connected" ? <CheckCircle2 /> : status === "expired" || status === "error" ? <TriangleAlert /> : <Clock3 />}
                        {status === "disconnected" && provider.availability === "coming_soon" ? "Roadmap" : status.replace("_", " ")}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex flex-wrap gap-2">{provider.permissions.map((permission) => <span key={permission} className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground"><ShieldCheck className="h-3 w-3" />{permission}</span>)}</div>
                    {storedConnection ? <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2"><p>Account: {storedConnection.accountLabel ?? "Connected account"}</p><p>Last sync: {storedConnection.lastSyncAt ? new Date(storedConnection.lastSyncAt).toLocaleString() : "Not synced yet"}</p>{storedConnection.expiresAt ? <p>Expires: {new Date(storedConnection.expiresAt).toLocaleString()}</p> : null}{storedConnection.lastError ? <p className="text-red-500">{storedConnection.lastError}</p> : null}</div> : null}
                    <div className="flex flex-wrap gap-2">
                      {provider.id === "github" ? <Button size="sm" variant={connected ? "outline" : "default"} onClick={connectGitHub} disabled={working === provider.id}>{connected ? <RefreshCw /> : <KeyRound />}{connected ? "Reconnect" : "Connect GitHub"}</Button> : null}
                      {provider.id === "local-cli" && provider.documentationUrl ? <Button asChild size="sm" variant="outline"><Link href={provider.documentationUrl}>Setup CLI <ExternalLink /></Link></Button> : null}
                      {provider.id === "webhook" && provider.documentationUrl ? <Button asChild size="sm" variant="outline"><Link href={provider.documentationUrl}>Configure webhook <ExternalLink /></Link></Button> : null}
                      {storedConnection ? <Button size="sm" variant="outline" onClick={() => void disconnect(provider.id)} disabled={working === provider.id}>Disconnect</Button> : null}
                      {provider.availability === "configuration_required" ? <p className="self-center text-xs text-amber-500">Deployment configuration required.</p> : null}
                      {provider.availability === "coming_soon" ? <p className="self-center text-xs text-muted-foreground">Adapter not enabled yet. No credentials are collected.</p> : null}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
