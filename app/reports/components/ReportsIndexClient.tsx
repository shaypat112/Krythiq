"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, FolderGit2, Plus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { buildTeamAuthHeaders } from "@/app/lib/http";
import { createClient } from "@/app/lib/supabase";
import { useTeam } from "@/app/components/TeamProvider";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LinkedInScanShare } from "@/app/components/LinkedInScanShare";
import { XScanShare } from "@/app/components/XScanShare";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type ScanRow = {
  repo: string;
  created_at: string;
  severity: string;
  issues: number;
  score: number;
  findings?: {
    ai_summary?: string;
  } | null;
};

type RepoSummary = {
  repo: string;
  latest: ScanRow;
  totalScans: number;
};

function severityTone(severity: string) {
  if (severity === "critical" || severity === "high") return "text-red-400";
  if (severity === "medium") return "text-amber-400";
  return "text-emerald-400";
}

export function ReportsIndexClient({ onNewScan }: { embedded?: boolean; onNewScan?: () => void }) {
  const supabase = useMemo(() => createClient(), []);
  const { selectedTeamId } = useTeam();
  const [repos, setRepos] = useState<RepoSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

        const scans = (data?.scans ?? []) as ScanRow[];
        const grouped = new Map<string, ScanRow[]>();

        for (const scan of scans) {
          const current = grouped.get(scan.repo) ?? [];
          current.push(scan);
          grouped.set(scan.repo, current);
        }

        const summaries = Array.from(grouped.entries()).map(([repo, entries]) => ({
          repo,
          latest: entries[0],
          totalScans: entries.length,
        }));

        setRepos(
          summaries.sort(
            (a, b) =>
              new Date(b.latest.created_at).getTime() -
              new Date(a.latest.created_at).getTime(),
          ),
        );
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
  }, [selectedTeamId, supabase]);

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex items-center justify-between gap-4 border-b border-border pb-4"><div><h1 className="text-xl font-semibold">Scan history</h1><p className="mt-1 text-sm text-muted-foreground">{repos.length} {repos.length === 1 ? "repository" : "repositories"}</p></div>{onNewScan ? <Button onClick={onNewScan}><Plus /> New scan</Button> : <Button asChild><Link href="/scan"><Plus /> New scan</Link></Button>}</div>

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
      ) : repos.length === 0 ? (
        <Card className="border-border bg-card">
          <CardContent className="p-8 text-center">
            <FolderGit2 className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-4 text-sm text-muted-foreground">
              No scans yet for this team. Start with a repository URL in the New scan tab.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border"><Table><TableHeader><TableRow><TableHead className="pl-4 sm:pl-6">Repository</TableHead><TableHead>Severity</TableHead><TableHead className="hidden sm:table-cell text-right">Issues</TableHead><TableHead className="hidden md:table-cell text-right">Score</TableHead><TableHead className="hidden lg:table-cell text-right">Scans</TableHead><TableHead className="hidden xl:table-cell">Last scanned</TableHead><TableHead className="pr-4 text-right sm:pr-6">Actions</TableHead></TableRow></TableHeader><TableBody>{repos.map((repo) => <TableRow key={repo.repo}><TableCell className="min-w-0 max-w-0 pl-4 sm:pl-6"><p className="truncate font-medium">{repo.repo}</p><p className="mt-1 text-xs text-muted-foreground sm:hidden">{repo.latest.issues} issues · score {repo.latest.score}</p></TableCell><TableCell><Badge variant="outline" className={`capitalize ${severityTone(repo.latest.severity)}`}>{repo.latest.severity}</Badge></TableCell><TableCell className="hidden text-right tabular-nums sm:table-cell">{repo.latest.issues}</TableCell><TableCell className="hidden text-right tabular-nums md:table-cell">{repo.latest.score}</TableCell><TableCell className="hidden text-right tabular-nums lg:table-cell">{repo.totalScans}</TableCell><TableCell className="hidden whitespace-nowrap text-muted-foreground xl:table-cell">{new Date(repo.latest.created_at).toLocaleDateString()}</TableCell><TableCell className="pr-4 sm:pr-6"><div className="flex justify-end gap-1"><LinkedInScanShare repository={repo.repo} severity={repo.latest.severity} issues={repo.latest.issues} score={repo.latest.score} compact /><XScanShare repository={repo.repo} severity={repo.latest.severity} issues={repo.latest.issues} score={repo.latest.score} compact /><Button asChild size="icon-sm" variant="ghost"><Link href={`/reports/${encodeURIComponent(repo.repo)}`} aria-label={`Open ${repo.repo} report`}><ArrowUpRight /></Link></Button></div></TableCell></TableRow>)}</TableBody></Table></div>
      )}
    </div>
  );
}
