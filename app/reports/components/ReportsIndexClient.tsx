"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, FolderGit2, Plus, Search, Terminal, Globe, RefreshCw } from "lucide-react";
import { PageHeading } from "@/app/components/PageHeading";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { summarizeScanHistory, filterScanHistory, type ScanHistoryRow, type RepositoryScanSummary } from "@/app/lib/scan-history";
import { buildTeamAuthHeaders } from "@/app/lib/http";
import { createClient } from "@/app/lib/supabase";
import { useTeam } from "@/app/components/TeamProvider";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LinkedInScanShare } from "@/app/components/LinkedInScanShare";
import { XScanShare } from "@/app/components/XScanShare";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

function severityTone(severity: string) {
  if (severity === "critical" || severity === "high") return "text-red-400";
  if (severity === "medium") return "text-amber-400";
  return "text-emerald-400";
}

export function ReportsIndexClient({ onNewScan }: { embedded?: boolean; onNewScan?: () => void }) {
  const supabase = useMemo(() => createClient(), []);
  const { selectedTeamId } = useTeam();
  const [repos, setRepos] = useState<RepositoryScanSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [severity, setSeverity] = useState("all");
  const [sort, setSort] = useState("recent");
  const [refreshKey, setRefreshKey] = useState(0);
  const [loadedTeamId, setLoadedTeamId] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData.session?.access_token ?? null;
        if (!accessToken) throw new Error("Sign in to view scan history.");

        const res = await fetch("/api/scans/recent", {
          headers: buildTeamAuthHeaders(accessToken, selectedTeamId),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error ?? "Unable to load scan history.");
        if (!mounted) return;

        const scans = (data?.scans ?? []) as ScanHistoryRow[];
        setLoadedTeamId(selectedTeamId);
        setRepos(summarizeScanHistory(scans));
      } catch (cause) {
        if (mounted) setError(cause instanceof Error ? cause.message : "Unable to load scan history.");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void load();

    return () => {
      mounted = false;
    };
  }, [selectedTeamId, supabase, refreshKey]);

  const currentRepos = loadedTeamId === selectedTeamId ? repos : [];
  const displayedRepos = filterScanHistory(currentRepos, { query, severity, sort });

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <PageHeading title="Scan history" description="Browse repository results from the 50 most recent scans in this workspace, including saved terminal scans." actions={onNewScan ? <Button onClick={onNewScan}><Plus /> New scan</Button> : <Button asChild><Link href="/scan"><Plus /> New scan</Link></Button>} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="min-w-0 flex-1 text-sm">
          <span className="mb-2 block font-medium">Find a repository</span>
          <div className="relative"><Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" aria-hidden="true" /><Input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search by owner or repository…" className="pl-9" /></div>
        </label>
        <label className="text-sm"><span className="mb-2 block font-medium">Latest severity</span><select value={severity} onChange={event => setSeverity(event.target.value)} className="h-10 w-full rounded-lg border border-input bg-card px-3 sm:w-40"><option value="all">All severities</option>{["critical", "high", "medium", "low"].map(value => <option key={value} value={value}>{value[0].toUpperCase() + value.slice(1)}</option>)}</select></label>
        <label className="text-sm"><span className="mb-2 block font-medium">Sort by</span><select value={sort} onChange={event => setSort(event.target.value)} className="h-10 w-full rounded-lg border border-input bg-card px-3 sm:w-40"><option value="recent">Most recent</option><option value="risk">Highest score</option><option value="issues">Most issues</option><option value="name">Repository name</option></select></label>
        <Button type="button" variant="outline" disabled={loading} onClick={() => setRefreshKey(current => current + 1)}><RefreshCw className={loading ? "animate-spin" : ""} />Refresh</Button>
      </div>

      {loading ? (
        <div className="space-y-4" aria-label="Loading reports">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      ) : error ? (
        <Card className="border-border bg-card">
          <CardContent className="p-6 text-sm text-destructive">
            {error}
          </CardContent>
        </Card>
      ) : currentRepos.length === 0 ? (
        <Card className="border-border bg-card">
          <CardContent className="p-8 text-center">
            <FolderGit2 className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-4 text-sm text-muted-foreground">
              No scans yet for this team. Start with a repository URL in the New scan tab.
            </p>
          </CardContent>
        </Card>
      ) : displayedRepos.length === 0 ? (
        <Card><CardContent className="p-8 text-center"><p className="font-medium">No repositories match these filters.</p><Button variant="ghost" className="mt-3" onClick={() => { setQuery(""); setSeverity("all"); }}>Clear filters</Button></CardContent></Card>
      ) : (
        <div className="space-y-3"><p className="text-sm text-muted-foreground" role="status">{displayedRepos.length} of {currentRepos.length} repositories</p>
        <div className="overflow-hidden rounded-2xl bg-card ring-1 ring-border/70"><Table><TableHeader><TableRow><TableHead className="pl-4 sm:pl-6">Repository</TableHead><TableHead>Severity</TableHead><TableHead className="hidden sm:table-cell text-right">Issues</TableHead><TableHead className="hidden md:table-cell text-right">Score</TableHead><TableHead className="hidden lg:table-cell text-right">Scans</TableHead><TableHead className="hidden xl:table-cell">Last scanned</TableHead><TableHead className="pr-4 text-right sm:pr-6">Actions</TableHead></TableRow></TableHeader><TableBody>{displayedRepos.map((repo) => <TableRow key={repo.repo}><TableCell className="min-w-0 max-w-0 pl-4 sm:pl-6"><p className="truncate font-medium">{repo.repo}</p><p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">{repo.latest.source === "cli" ? <><Terminal className="h-3 w-3" />Terminal scan</> : <><Globe className="h-3 w-3" />Web scan</>}</p><p className="mt-1 text-xs text-muted-foreground sm:hidden">{repo.latest.issues} issues · score {repo.latest.score}</p></TableCell><TableCell><Badge variant="outline" className={`capitalize ${severityTone(repo.latest.severity)}`}>{repo.latest.severity}</Badge></TableCell><TableCell className="hidden text-right tabular-nums sm:table-cell">{repo.latest.issues}</TableCell><TableCell className="hidden text-right tabular-nums md:table-cell">{repo.latest.score}</TableCell><TableCell className="hidden text-right tabular-nums lg:table-cell">{repo.totalScans}</TableCell><TableCell className="hidden whitespace-nowrap text-muted-foreground xl:table-cell">{new Date(repo.latest.created_at).toLocaleDateString()}</TableCell><TableCell className="pr-4 sm:pr-6"><div className="flex justify-end gap-1"><LinkedInScanShare repository={repo.repo} severity={repo.latest.severity} issues={repo.latest.issues} score={repo.latest.score} compact /><XScanShare repository={repo.repo} severity={repo.latest.severity} issues={repo.latest.issues} score={repo.latest.score} compact /><Button asChild size="icon-sm" variant="ghost"><Link href={`/reports/${encodeURIComponent(repo.repo)}`} aria-label={`Open ${repo.repo} report`}><ArrowUpRight /></Link></Button></div></TableCell></TableRow>)}</TableBody></Table></div></div>
      )}
    </div>
  );
}
