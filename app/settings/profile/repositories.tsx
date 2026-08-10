"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/app/lib/supabase";
import { buildTeamAuthHeaders } from "@/app/lib/http";
import { useTeam } from "@/app/components/TeamProvider";
import { Alert, AlertDescription } from "@/components/ui/alert";
import MultiStepLoaderDemo from "@/components/multi-step-loader-demo";
import IntegrationPanel from "@/app/profile/components/IntegrationPanel";
import RepoTable, { type ConnectedRepo } from "@/app/profile/components/RepoTable";

export function RepositoryConnections() {
  const supabase = useMemo(() => createClient(), []);
  const { selectedTeamId } = useTeam();
  const [repos, setRepos] = useState<ConnectedRepo[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanningRepo, setScanningRepo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void supabase.from("connected_repos").select("id, full_name, private, last_scanned_at").order("full_name", { ascending: true }).then(({ data, error: loadError }) => {
      if (!active) return;
      if (loadError) setError("Connected repositories could not be loaded.");
      else setRepos((data as ConnectedRepo[]) ?? []);
      setLoading(false);
    });
    return () => { active = false; };
  }, [supabase]);

  const connectGitHub = async () => {
    setError(null);
    const session = (await supabase.auth.getSession()).data.session;
    if (!session?.access_token) { setError("Sign in before connecting GitHub."); return; }
    if (!session.provider_token) {
      const hasGitHubIdentity = session.user.identities?.some((identity) => identity.provider === "github") === true;
      const options = { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent("/settings?section=account")}`, scopes: "repo read:user user:email" };
      const result = hasGitHubIdentity ? await supabase.auth.signInWithOAuth({ provider: "github", options }) : await supabase.auth.linkIdentity({ provider: "github", options });
      if (result.error) setError(result.error.message);
      return;
    }
    setLoading(true);
    const response = await fetch("/api/github/repos", { method: "POST", headers: buildTeamAuthHeaders(session.access_token, selectedTeamId, { "Content-Type": "application/json" }), body: JSON.stringify({ providerToken: session.provider_token }) });
    const payload = await response.json().catch(() => ({}));
    if (response.ok) setRepos(payload.repos ?? []); else setError(payload.error ?? "Your GitHub projects could not be loaded.");
    setLoading(false);
  };

  const runScan = async (repo: ConnectedRepo) => {
    setError(null); setScanningRepo(repo.full_name);
    try {
      const session = (await supabase.auth.getSession()).data.session;
      if (!session?.access_token) throw new Error("Sign in before scanning a repository.");
      if (repo.private && !session.provider_token) throw new Error("Reconnect GitHub before scanning a private repository.");
      const response = await fetch("/api/github/repo-scan", { method: "POST", headers: buildTeamAuthHeaders(session.access_token, selectedTeamId, { "Content-Type": "application/json" }), body: JSON.stringify({ providerToken: session.provider_token ?? null, repo: repo.full_name }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? "The repository scan could not start.");
      const scannedAt = payload.scan?.created_at ?? new Date().toISOString();
      setRepos((current) => current.map((item) => item.id === repo.id ? { ...item, last_scanned_at: scannedAt } : item));
      window.dispatchEvent(new Event("tokens:updated"));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The repository scan could not start.");
    } finally { setScanningRepo(null); }
  };

  return <section className="space-y-3" aria-labelledby="connected-repositories-title">
    <MultiStepLoaderDemo loading={scanningRepo !== null} />
    <div><h2 id="connected-repositories-title" className="text-lg font-semibold">GitHub projects</h2><p className="mt-1 text-sm text-muted-foreground">Choose a connected project when you’re ready to run a scan.</p></div>
    {error ? <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert> : null}
    <IntegrationPanel title="GitHub" description="Your GitHub projects are available for scanning." connected={repos.length > 0} onClick={() => void connectGitHub()} />
    {loading ? <div className="h-40 animate-pulse rounded-xl border border-border bg-muted/30" /> : <RepoTable repos={repos} onConnect={() => void connectGitHub()} onScan={(repo) => void runScan(repo)} scanningRepo={scanningRepo} />}
  </section>;
}
