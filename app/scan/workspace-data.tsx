"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, CheckCircle2, CircleAlert, Clock3, Rocket, ShieldCheck } from "lucide-react";
import { createClient } from "@/app/lib/supabase";
import { buildTeamAuthHeaders } from "@/app/lib/http";
import { useTeam } from "@/app/components/TeamProvider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type Finding = { title?: string; message?: string; file?: string; path?: string; line?: number; severity?: string; fix?: string; suggestion?: string; recommendation?: string };
type Suggestion = { title: string; reason: string; file?: string | null; line?: number | null };
type Scan = { repo: string; created_at: string; severity: string; issues: number; score: number; findings?: { list?: Finding[]; aiReview?: { suggestions?: Suggestion[] }; ai_summary?: string } | null };

function useRecentScans() {
  const supabase = useMemo(() => createClient(), []);
  const { selectedTeamId } = useTeam();
  const [scans, setScans] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    void (async () => {
      setLoading(true);
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) { if (active) { setError("Sign in to view your launch workspace."); setLoading(false); } return; }
      const response = await fetch("/api/scans/recent", { headers: buildTeamAuthHeaders(token, selectedTeamId) });
      const payload = await response.json().catch(() => ({}));
      if (!active) return;
      if (response.ok) setScans(payload.scans ?? []); else setError(payload.error ?? "Could not load scans.");
      setLoading(false);
    })();
    return () => { active = false; };
  }, [selectedTeamId, supabase]);
  return { scans, loading, error };
}

function statusFor(scan: Scan) {
  if (scan.severity === "critical" || scan.severity === "high" || scan.score >= 75) return { label: "Fix before launch", tone: "text-red-500", Icon: CircleAlert };
  if (scan.severity === "medium" || scan.score >= 45) return { label: "Almost ready", tone: "text-amber-500", Icon: Clock3 };
  return { label: "Ready", tone: "text-emerald-500", Icon: CheckCircle2 };
}

export function LaunchReadinessPage() {
  const { scans, loading, error } = useRecentScans();
  const latestByRepo = Array.from(new Map(scans.map((scan) => [scan.repo, scan])).values());
  return <WorkspacePage eyebrow="Launch readiness" title="Is your app ready to launch?" description="One clear answer for every scanned app, with the next actions that matter most.">
    {loading ? <Loading /> : error ? <ErrorCard message={error} /> : latestByRepo.length === 0 ? <Empty /> : <div className="grid gap-4 xl:grid-cols-2">{latestByRepo.map((scan) => {
      const status = statusFor(scan); const findings = scan.findings?.list ?? [];
      const top = findings.slice(0, 3);
      return <Card key={scan.repo}><CardHeader><div className="flex items-start justify-between gap-4"><div><CardTitle>{scan.repo}</CardTitle><p className="mt-1 text-sm text-muted-foreground">Scanned {new Date(scan.created_at).toLocaleDateString()}</p></div><Badge variant="outline" className={status.tone}><status.Icon />{status.label}</Badge></div></CardHeader><CardContent className="space-y-5"><div className="grid grid-cols-4 gap-2 text-center">{["Security", "Reliability", "Design", "Upkeep"].map((area, index) => <div key={area} className="rounded-xl bg-muted/35 p-3"><p className="text-xs text-muted-foreground">{area}</p><p className="mt-1 font-semibold">{Math.max(0, 100 - scan.score - index * 3)}</p></div>)}</div><div><p className="text-sm font-medium">Fix these first</p>{top.length ? <ol className="mt-2 space-y-2">{top.map((finding, index) => <li key={`${finding.file}-${index}`} className="text-sm text-muted-foreground">{index + 1}. {finding.title ?? finding.message ?? "Review this finding"}</li>)}</ol> : <p className="mt-2 text-sm text-muted-foreground">No saved problems need your attention.</p>}</div><Button asChild variant="outline"><Link href={`/reports/${encodeURIComponent(scan.repo)}`}>Open launch report <ArrowUpRight /></Link></Button></CardContent></Card>;
    })}</div>}
  </WorkspacePage>;
}

export function GuidedFixesPage({ mode }: { mode: "fixes" | "verification" | "drafts" }) {
  const { scans, loading, error } = useRecentScans();
  const latestByRepo = Array.from(new Map(scans.map((scan) => [scan.repo, scan])).values());
  const copy = mode === "fixes"
    ? { eyebrow: "Guided fixes", title: "Know exactly what to change", description: "Open the file, line, current code, and a ready-to-copy replacement in one place." }
    : mode === "verification"
      ? { eyebrow: "Check fixes", title: "Make sure the fix worked", description: "Return to the affected file after a change and run a focused check before calling it fixed." }
      : { eyebrow: "Draft changes", title: "Prepare changes without merging them", description: "Draft GitHub changes stay reviewable and never merge automatically." };
  return <WorkspacePage {...copy}>{loading ? <Loading /> : error ? <ErrorCard message={error} /> : latestByRepo.length === 0 ? <Empty /> : <div className="space-y-4">{latestByRepo.map((scan) => {
    const suggestions = scan.findings?.aiReview?.suggestions ?? [];
    return <Card key={scan.repo}><CardHeader><div className="flex items-start justify-between gap-4"><div><CardTitle>{scan.repo}</CardTitle><p className="mt-1 text-sm text-muted-foreground">{suggestions.length} guided {suggestions.length === 1 ? "fix" : "fixes"}</p></div><Button asChild variant="outline"><Link href={`/reports/${encodeURIComponent(scan.repo)}`}>Open report <ArrowUpRight /></Link></Button></div></CardHeader><CardContent className="grid gap-3 md:grid-cols-2">{suggestions.length ? suggestions.slice(0, 6).map((item, index) => <Link key={`${item.title}-${index}`} href={`/reports/${encodeURIComponent(scan.repo)}/ai-fixes/${index}`} className="rounded-xl border border-border p-4 transition hover:bg-muted/40"><p className="font-medium">{item.title}</p><p className="mt-1 text-sm text-muted-foreground">{item.file ?? "Across the app"}{item.line ? ` · line ${item.line}` : ""}</p></Link>) : <p className="text-sm text-muted-foreground md:col-span-2">Run a new scan to create exact, guided fixes for this app.</p>}</CardContent></Card>;
  })}</div>}</WorkspacePage>;
}

function WorkspacePage({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children: React.ReactNode }) { return <div className="mx-auto max-w-6xl space-y-6"><section className="rounded-3xl border border-border bg-card p-6 sm:p-8"><p className="text-xs font-medium uppercase tracking-[.18em] text-muted-foreground">{eyebrow}</p><h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p></section>{children}</div>; }
function Loading() { return <div className="space-y-4"><Skeleton className="h-48" /><Skeleton className="h-48" /></div>; }
function ErrorCard({ message }: { message: string }) { return <Card><CardContent className="p-6 text-sm text-destructive">{message}</CardContent></Card>; }
function Empty() { return <Card><CardContent className="p-10 text-center"><Rocket className="mx-auto h-8 w-8 text-muted-foreground" /><p className="mt-4 font-medium">Run your first scan</p><p className="mt-1 text-sm text-muted-foreground">Your readiness result and guided fixes will appear here.</p><Button asChild className="mt-5"><Link href="/scan"><ShieldCheck />Start a scan</Link></Button></CardContent></Card>; }
