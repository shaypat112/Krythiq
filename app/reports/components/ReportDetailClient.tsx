"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Bot, ShieldAlert, Sparkles, TriangleAlert, Wrench } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { buildTeamAuthHeaders } from "@/app/lib/http";
import { createClient } from "@/app/lib/supabase";
import { useTeam } from "@/app/components/TeamProvider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SystemDesignOverview } from "@/app/components/SystemDesignOverview";

type ScanFinding = {
  title?: string;
  severity?: string;
  description?: string;
  file?: string;
  path?: string;
  fix?: string;
  recommendation?: string;
  score?: number;
  line?: number;
  message?: string;
  snippet?: string;
  suggestion?: string;
  type?: string;
  technicalDetails?: string;
};

type ScanRow = {
  repo: string;
  created_at: string;
  severity: string;
  issues: number;
  score: number;
  findings?: {
    ai_summary?: string;
    list?: ScanFinding[] | null;
    systemDesign?: {
      summary: string;
      disclaimer: string;
      scenarios: Array<{
        id: string;
        title: string;
        status: "ready" | "watch" | "risk" | "unknown";
        confidence: "low" | "medium";
        reflection: string;
        evidence: string[];
        nextStep: string;
      }>;
    };
  } | null;
};

function tone(severity: string) {
  if (severity === "critical" || severity === "high") return "text-red-400";
  if (severity === "medium") return "text-amber-400";
  return "text-emerald-400";
}

const severityColors: Record<string, string> = {
  critical: "#ef4444",
  high: "#f97316",
  medium: "#f59e0b",
  low: "#10b981",
};

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border bg-popover/95 px-3 py-2 text-xs shadow-xl backdrop-blur">
      {label ? <p className="mb-1 font-medium text-foreground">{label}</p> : null}
      {payload.map((item) => (
        <p key={item.name} style={{ color: item.color }}>{item.name}: {item.value}</p>
      ))}
    </div>
  );
}

export function ReportDetailClient({ repo }: { repo: string }) {
  const supabase = useMemo(() => createClient(), []);
  const { selectedTeamId } = useTeam();
  const [latest, setLatest] = useState<ScanRow | null>(null);
  const [history, setHistory] = useState<ScanRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token ?? null;
      if (!accessToken) {
        if (mounted) {
          setError("Sign in to view this report.");
          setLoading(false);
        }
        return;
      }

      const res = await fetch(`/api/scans/report?repo=${encodeURIComponent(repo)}`, {
        headers: buildTeamAuthHeaders(accessToken, selectedTeamId),
      });
      const data = await res.json().catch(() => ({}));

      if (!mounted) return;

      if (!res.ok) {
        setError(data?.error ?? "Unable to load report.");
        setLoading(false);
        return;
      }

      setLatest((data?.latest ?? null) as ScanRow | null);
      setHistory((data?.scans ?? []) as ScanRow[]);
      setLoading(false);
    };

    void load();

    return () => {
      mounted = false;
    };
  }, [repo, selectedTeamId, supabase]);

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl space-y-4" aria-label="Loading report">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-72" />
        <Skeleton className="h-80" />
      </div>
    );
  }

  if (error || !latest) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <Button asChild variant="ghost" className="px-0">
          <Link href="/scan?view=history">
            <ArrowLeft className="h-4 w-4" />
            Back to scan history
          </Link>
        </Button>
        <Card className="border-border bg-card">
          <CardContent className="p-8">
            <h1 className="text-2xl font-semibold text-foreground">
              Report not found
            </h1>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              {error ??
                "This repository does not have scan history in the currently selected team."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const findings = latest.findings?.list ?? [];
  const trendData = [...history].reverse().map((scan) => ({
    date: new Date(scan.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    Issues: scan.issues,
    "Risk score": scan.score,
  }));
  const severityData = Object.entries(
    findings.reduce<Record<string, number>>((counts, finding) => {
      const severity = (finding.severity ?? "low").toLowerCase();
      counts[severity] = (counts[severity] ?? 0) + 1;
      return counts;
    }, {}),
  ).map(([name, value]) => ({ name, value }));
  const fixes = findings.filter((finding) => finding.fix || finding.recommendation || finding.suggestion);

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <Button asChild variant="ghost" className="px-0">
        <Link href="/scan?view=history">
          <ArrowLeft className="h-4 w-4" />
          Back to scan history
        </Link>
      </Button>

      <section className="rounded-[2rem] border border-border bg-[radial-gradient(circle_at_top_left,rgba(248,113,113,0.12),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.12),transparent_28%),linear-gradient(135deg,var(--card),var(--background))] p-8 shadow-[0_24px_90px_rgba(0,0,0,0.1)]">
        <div className="space-y-4">
          <span className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Repository Report
          </span>
          <div className="space-y-2">
            <h1 className="text-4xl font-semibold tracking-tight text-foreground">
              {latest.repo}
            </h1>
            <p className="max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">
              Security posture, issue movement, and generated remediation guidance from the latest repository scan.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-4">
            <div className="rounded-2xl border border-border bg-background p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Severity
              </p>
              <p className={`mt-2 text-lg font-semibold ${tone(latest.severity)}`}>
                {latest.severity}
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-background p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Issues
              </p>
              <p className="mt-2 text-lg font-semibold text-foreground">{latest.issues}</p>
            </div>
            <div className="rounded-2xl border border-border bg-background p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Risk score
              </p>
              <p className="mt-2 text-lg font-semibold text-foreground">{latest.score}</p>
            </div>
            <div className="rounded-2xl border border-border bg-background p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Last scanned
              </p>
              <p className="mt-2 text-lg font-semibold text-foreground">
                {new Date(latest.created_at).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
        <Card className="overflow-hidden border-violet-500/25 bg-[radial-gradient(circle_at_top_right,rgba(139,92,246,.16),transparent_42%),var(--card)]">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="rounded-xl bg-violet-500/15 p-2 text-violet-400"><Bot className="h-5 w-5" /></span>
                <CardTitle>AI scan feedback</CardTitle>
              </div>
              <Badge className="border-violet-500/30 bg-violet-500/10 text-violet-300"><Sparkles className="mr-1 h-3 w-3" /> Generated insight</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-7 text-foreground/90">
              {latest.findings?.ai_summary ?? "AI feedback was not stored for this scan. The charts and structured findings below are still based on the completed repository analysis."}
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-violet-500/15 bg-background/60 p-3"><p className="text-xs text-muted-foreground">Health</p><p className="mt-1 text-xl font-semibold">{Math.max(0, 100 - latest.score)}%</p></div>
              <div className="rounded-xl border border-violet-500/15 bg-background/60 p-3"><p className="text-xs text-muted-foreground">Actionable fixes</p><p className="mt-1 text-xl font-semibold">{fixes.length}</p></div>
              <div className="rounded-xl border border-violet-500/15 bg-background/60 p-3"><p className="text-xs text-muted-foreground">Scans compared</p><p className="mt-1 text-xl font-semibold">{history.length}</p></div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader><CardTitle>Finding mix</CardTitle></CardHeader>
          <CardContent>
            {severityData.length ? (
              <div className="relative h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart><Pie data={severityData} dataKey="value" nameKey="name" innerRadius={54} outerRadius={78} paddingAngle={4} stroke="transparent">{severityData.map((item) => <Cell key={item.name} fill={severityColors[item.name] ?? "#64748b"} />)}</Pie><Tooltip content={<ChartTooltip />} /></PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 grid place-content-center text-center"><span className="text-2xl font-semibold">{findings.length}</span><span className="text-[10px] uppercase tracking-wider text-muted-foreground">findings</span></div>
              </div>
            ) : <div className="grid h-52 place-items-center text-sm text-muted-foreground">No findings to chart.</div>}
            <div className="flex flex-wrap justify-center gap-3">{severityData.map((item) => <span key={item.name} className="flex items-center gap-1.5 text-xs capitalize text-muted-foreground"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: severityColors[item.name] ?? "#64748b" }} />{item.name} {item.value}</span>)}</div>
          </CardContent>
        </Card>
      </section>

      {latest.findings?.systemDesign ? (
        <SystemDesignOverview result={latest.findings.systemDesign} docsHref="/documentation/system-design" />
      ) : null}

      <Card className="border-border bg-card">
        <CardHeader><CardTitle>Risk and issue trend</CardTitle><p className="text-sm text-muted-foreground">How repository risk changed across the last {history.length} scans.</p></CardHeader>
        <CardContent>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}><defs><linearGradient id="riskFill" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.35} /><stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} /></linearGradient><linearGradient id="issuesFill" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f97316" stopOpacity={0.28} /><stop offset="95%" stopColor="#f97316" stopOpacity={0} /></linearGradient></defs><CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} /><XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fill: "currentColor", fontSize: 11 }} className="text-muted-foreground" /><YAxis tickLine={false} axisLine={false} tick={{ fill: "currentColor", fontSize: 11 }} className="text-muted-foreground" /><Tooltip content={<ChartTooltip />} /><Area type="monotone" dataKey="Risk score" stroke="#8b5cf6" strokeWidth={2} fill="url(#riskFill)" /><Area type="monotone" dataKey="Issues" stroke="#f97316" strokeWidth={2} fill="url(#issuesFill)" /></AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {fixes.length ? <Card className="border-emerald-500/20 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,.1),transparent_35%),var(--card)]"><CardHeader><div className="flex items-center gap-2"><span className="rounded-xl bg-emerald-500/15 p-2 text-emerald-400"><Wrench className="h-5 w-5" /></span><div><CardTitle>Recommended fixes</CardTitle><p className="mt-1 text-sm text-muted-foreground">Generated remediation steps prioritized from this scan.</p></div></div></CardHeader><CardContent className="grid gap-3 md:grid-cols-2">{fixes.slice(0, 6).map((finding, index) => <div key={`${finding.title ?? "fix"}-${index}`} className="rounded-2xl border border-emerald-500/15 bg-background/70 p-4"><div className="flex items-start justify-between gap-3"><p className="text-sm font-semibold">{finding.title ?? finding.message ?? finding.file ?? finding.path ?? `Fix ${index + 1}`}</p><Badge variant="outline" className={tone(finding.severity ?? "low")}>{finding.severity ?? "low"}</Badge></div><p className="mt-2 text-sm leading-6 text-muted-foreground">{finding.fix ?? finding.recommendation ?? finding.suggestion}</p>{finding.file || finding.path ? <p className="mt-3 truncate font-mono text-xs text-emerald-400/80">{finding.file ?? finding.path}{finding.line ? `:${finding.line}` : ""}</p> : null}</div>)}</CardContent></Card> : null}

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle>Top findings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {findings.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No structured findings were stored for this scan. The repo summary and history are still available.
              </p>
            ) : (
              findings.slice(0, 8).map((finding, index) => (
                <div key={`${finding.title ?? finding.path ?? "finding"}-${index}`} className="rounded-2xl border border-border bg-background p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {finding.title ?? finding.path ?? finding.file ?? "Untitled finding"}
                      </p>
                      {(finding.file || finding.path) ? (
                        <Link href={`/reports/${encodeURIComponent(repo)}/findings/${index}`} className="mt-1 inline-flex items-center gap-1 text-xs text-sky-400 transition hover:text-sky-300 hover:underline">
                          {finding.file ?? finding.path}{finding.line ? `:${finding.line}` : ""}<ArrowUpRight className="h-3 w-3" />
                        </Link>
                      ) : null}
                    </div>
                    <div className={`flex items-center gap-2 text-sm font-medium ${tone(finding.severity ?? "low")}`}>
                      {(finding.severity === "critical" || finding.severity === "high") ? (
                        <ShieldAlert className="h-4 w-4" />
                      ) : (
                        <TriangleAlert className="h-4 w-4" />
                      )}
                      {(finding.severity ?? "low").toUpperCase()}
                    </div>
                  </div>
                  {(finding.description || finding.message) ? (
                    <p className="mt-3 text-sm leading-7 text-muted-foreground">
                      {finding.description ?? finding.message}
                    </p>
                  ) : null}
                  {(finding.fix || finding.recommendation || finding.suggestion) ? (
                    <div className="mt-3 rounded-xl border border-border bg-muted/30 p-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                        Suggested fix
                      </p>
                      <p className="mt-2 text-sm leading-7 text-foreground">
                        {finding.fix ?? finding.recommendation ?? finding.suggestion}
                      </p>
                    </div>
                  ) : null}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle>Scan history</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {history.map((scan) => (
              <div key={`${scan.repo}-${scan.created_at}`} className="rounded-2xl border border-border bg-background p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {new Date(scan.created_at).toLocaleString()}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {scan.issues} issues · score {scan.score}
                    </p>
                  </div>
                  <Badge variant="outline">{scan.severity}</Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
