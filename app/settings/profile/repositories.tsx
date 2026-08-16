"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, FolderGit2, Globe2, Loader2, Lock, Search } from "lucide-react";
import { createClient } from "@/app/lib/supabase";
import { buildTeamAuthHeaders } from "@/app/lib/http";
import { useTeam } from "@/app/components/TeamProvider";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ConnectedRepo } from "@/app/profile/components/RepoTable";

export function RepositoryConnections() {
  const supabase = useMemo(() => createClient(), []);
  const { selectedTeamId } = useTeam();
  const searchRef = useRef<HTMLInputElement>(null);
  const [repos, setRepos] = useState<ConnectedRepo[]>([]);
  const [query, setQuery] = useState("");
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGitHubRepositories = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const session = (await supabase.auth.getSession()).data.session;
      if (!session?.access_token) throw new Error("Unable to fetch repositories: you are not signed in.");
      const response = await fetch("/api/github/repos", {
        method: "POST",
        headers: buildTeamAuthHeaders(session.access_token, selectedTeamId, { "Content-Type": "application/json" }),
        body: JSON.stringify({}),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? "Unable to fetch repositories from GitHub.");
      setRepos((payload.repos as ConnectedRepo[]) ?? []);
    } catch (cause) {
      setRepos([]);
      setError(cause instanceof Error ? cause.message : "Unable to fetch repositories from GitHub.");
    } finally {
      setLoading(false);
    }
  }, [selectedTeamId, supabase]);

  useEffect(() => { void fetchGitHubRepositories(); }, [fetchGitHubRepositories]);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault(); searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const connectGitHub = async () => {
    const session = (await supabase.auth.getSession()).data.session;
    if (!session?.access_token) { setError("Unable to fetch repositories: you are not signed in."); return; }
    const options = { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent("/settings?section=account")}`, scopes: "repo read:user user:email", queryParams: { prompt: "consent" } };
    const result = await supabase.auth.signInWithOAuth({ provider: "github", options });
    if (result.error) setError(result.error.message);
  };

  const visibleRepos = repos.filter((repo) => repo.full_name.toLowerCase().includes(query.trim().toLowerCase()));

  return <section className="space-y-4" aria-labelledby="connected-repositories-title">
      <div>
        <h2 id="connected-repositories-title" className="text-sm font-semibold">Find a connected repository</h2>
        <p className="mt-1 text-xs text-muted-foreground">Search repositories available to the GitHub account currently connected to Krythiq.</p>
      </div>
      <div>
        <div className="overflow-hidden rounded-xl border border-border bg-background shadow-lg shadow-black/5">
          <div className="flex items-center gap-3 border-b border-border p-3">
            <Search className="size-5 shrink-0 text-muted-foreground" />
            <Input ref={searchRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search your connected GitHub repositories…" className="h-10 flex-1 border-0 bg-transparent px-0 text-base shadow-none focus-visible:ring-0" />
            <kbd className="hidden rounded-md border border-border bg-muted px-2 py-1 font-mono text-[11px] text-muted-foreground sm:inline">⌘K</kbd>
          </div>
          {loading ? <div className="flex h-40 items-center justify-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" />Fetching repositories from GitHub…</div> : error ? <div className="space-y-4 p-4"><Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert><Button size="sm" variant="outline" onClick={() => void connectGitHub()}>Connect GitHub</Button></div> : visibleRepos.length ? <div className="max-h-80 overflow-y-auto p-2">{visibleRepos.map((repo) => { const selected = selectedRepo === repo.full_name; return <button key={repo.id} type="button" onClick={() => setSelectedRepo(repo.full_name)} className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-sky-500/10 text-sky-500"><FolderGit2 className="size-4" /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{repo.full_name}</span><span className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">{repo.private ? <Lock className="size-3" /> : <Globe2 className="size-3" />}{repo.private ? "Private repository" : "Public repository"}</span></span>{selected ? <Badge variant="outline" className="border-emerald-500/30 text-emerald-500"><Check />Selected</Badge> : null}</button>; })}</div> : <div className="p-8 text-center"><FolderGit2 className="mx-auto size-7 text-muted-foreground" /><p className="mt-3 text-sm font-medium">{query ? "No matching repositories" : "No repositories found"}</p><p className="mt-1 text-xs text-muted-foreground">{query ? "Try a different repository name." : "The connected GitHub account did not return any repositories."}</p></div>}
        </div>
        {!loading && !error ? <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted-foreground"><span>{visibleRepos.length} of {repos.length} repositories</span><Button size="xs" variant="ghost" onClick={() => void fetchGitHubRepositories()}>Refresh from GitHub</Button></div> : null}
      </div>
  </section>;
}
