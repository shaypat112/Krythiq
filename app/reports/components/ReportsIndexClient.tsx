"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, FolderGit2, Plus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { buildTeamAuthHeaders } from "@/app/lib/http";
import { createClient } from "@/app/lib/supabase";
import { useTeam } from "@/app/components/TeamProvider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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

export function ReportsIndexClient({ embedded = false, onNewScan }: { embedded?: boolean; onNewScan?: () => void }) {
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
      <section className={embedded ? "rounded-3xl border border-border bg-card p-6 sm:p-8" : "rounded-[2rem] border border-border bg-[radial-gradient(circle_at_top_left,rgba(244,63,94,0.12),transparent_26%),radial-gradient(circle_at_bottom_right,rgba(34,197,94,0.12),transparent_28%),linear-gradient(135deg,var(--card),var(--background))] p-8 shadow-[0_24px_90px_rgba(0,0,0,0.1)]"}>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <span className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Scan history
            </span>
            <div>
              <h1 className="text-4xl font-semibold tracking-tight text-foreground">
                Previous scans by repository
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
                Review the latest scan outcome for each repository in your current team context,
                then drill into a repo for findings, history, and AI summary.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            {onNewScan ? <Button onClick={onNewScan}><Plus /> New scan</Button> : <Button asChild><Link href="/scan"><Plus /> New scan</Link></Button>}
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-border bg-background/80 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Repositories</p>
                <p className="mt-2 text-2xl font-semibold text-foreground">{repos.length}</p>
              </div>
              <div className="rounded-2xl border border-border bg-background/80 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Latest severity</p>
                <p className="mt-2 text-2xl font-semibold text-foreground">{repos[0]?.latest.severity?.toUpperCase?.() ?? "-"}</p>
              </div>
              <div className="rounded-2xl border border-border bg-background/80 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Latest score</p>
                <p className="mt-2 text-2xl font-semibold text-foreground">{repos[0]?.latest.score ?? "-"}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

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
        <div className="grid gap-4">
          {repos.map((repo) => (
            <Card key={repo.repo} className="border-border bg-card shadow-sm">
              <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-2">
                  <CardTitle className="text-lg text-foreground">{repo.repo}</CardTitle>
                  <CardDescription className="max-w-2xl text-sm leading-6">
                    {repo.latest.findings?.ai_summary ??
                      "Most recent scan completed. Open the repo report to review severity, issue count, and latest findings."}
                  </CardDescription>
                </div>
                <Button asChild variant="outline" className="sm:self-start">
                  <Link href={`/reports/${encodeURIComponent(repo.repo)}`}>
                    Open report
                    <ArrowUpRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-4">
                  <div className="rounded-2xl border border-border bg-background p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                      Severity
                    </p>
                    <p className={`mt-2 text-lg font-semibold ${severityTone(repo.latest.severity)}`}>
                      {repo.latest.severity}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border bg-background p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                      Issues
                    </p>
                    <p className="mt-2 text-lg font-semibold text-foreground">
                      {repo.latest.issues}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border bg-background p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                      Score
                    </p>
                    <p className="mt-2 text-lg font-semibold text-foreground">
                      {repo.latest.score}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border bg-background p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                      Scan history
                    </p>
                    <p className="mt-2 text-lg font-semibold text-foreground">
                      {repo.totalScans}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
