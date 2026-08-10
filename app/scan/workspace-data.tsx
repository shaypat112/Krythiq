"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, BadgeCheck, CheckCircle2, ClipboardCheck, Clock3, Download, FileDiff, Rocket, ShieldCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/app/lib/supabase";
import { buildTeamAuthHeaders } from "@/app/lib/http";
import { useTeam } from "@/app/components/TeamProvider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type Finding = { title?: string; message?: string; file?: string; line?: number; severity?: string; type?: string };
type Suggestion = { title: string; reason?: string; file?: string | null; line?: number | null; category?: string; currentCode?: string | null; replacementCode?: string | null };
type Scenario = { status: "ready" | "watch" | "risk" | "unknown" };
type Scan = {
  repo: string; created_at: string; severity: string; issues: number; score: number;
  findings?: { list?: Finding[]; aiReview?: { scores?: { overall?: number }; suggestions?: Suggestion[] }; systemDesign?: { scenarios?: Scenario[] }; scan_summary?: { totalFiles?: number }; team_id?: string | null } | null;
};

function useRecentScans() {
  const supabase = useMemo(() => createClient(), []);
  const { selectedTeamId } = useTeam();
  const [scans, setScans] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    void (async () => {
      setLoading(true); setError(null);
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
  return { scans: Array.from(new Map(scans.map((scan) => [scan.repo, scan])).values()), history: scans, loading, error };
}

function usePaidWorkflow() {
  const supabase = useMemo(() => createClient(), []);
  const { selectedTeamId } = useTeam();
  const [busy, setBusy] = useState<string | null>(null);
  const run = async (path: string, repository: string, suggestionIndex: number, baselineCreatedAt?: string) => {
    const key = `${repository}:${suggestionIndex}`; setBusy(key);
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) throw new Error("Sign in to continue.");
      const response = await fetch(path, { method: "POST", headers: buildTeamAuthHeaders(token, selectedTeamId, { "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() }), body: JSON.stringify({ repository, suggestionIndex, baselineCreatedAt }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? "The action could not be completed.");
      return payload;
    } finally { setBusy(null); }
  };
  return { busy, run };
}

function gateFor(scan: Scan) {
  if (["critical", "high"].includes(scan.severity)) return { label: "Blocked", tone: "text-red-500", Icon: AlertTriangle, note: "Resolve high-risk security findings before launch." };
  if (scan.severity === "medium") return { label: "Caution", tone: "text-amber-500", Icon: Clock3, note: "The checked areas contain work worth reviewing before launch." };
  return { label: "Ready for checked areas", tone: "text-emerald-500", Icon: CheckCircle2, note: "No blocking findings were found in the areas this scan checked." };
}

function evidence(scan: Scan) {
  const findings = scan.findings?.list ?? [];
  const scenarios = scan.findings?.systemDesign?.scenarios;
  const design = scan.findings?.aiReview?.scores?.overall;
  return [
    { name: "Security", value: findings.length ? `${findings.length} finding${findings.length === 1 ? "" : "s"}` : "No findings", known: true },
    { name: "Reliability", value: scenarios ? `${scenarios.filter((item) => item.status === "risk" || item.status === "watch").length} concern${scenarios.filter((item) => item.status === "risk" || item.status === "watch").length === 1 ? "" : "s"}` : "Not checked", known: Boolean(scenarios) },
    { name: "Design", value: typeof design === "number" ? `${design}/100` : "Not checked", known: typeof design === "number" },
    { name: "Maintenance", value: scan.findings?.scan_summary?.totalFiles ? `${scan.findings.scan_summary.totalFiles} files checked` : "Not checked", known: Boolean(scan.findings?.scan_summary?.totalFiles) },
  ];
}

export function LaunchReadinessPage() {
  const { scans, loading, error } = useRecentScans();
  return <WorkspacePage eyebrow="Launch readiness" title="Can I safely ship?" description="A release gate built from real scan evidence. Missing evidence is shown as not checked instead of becoming a made-up score.">
    <WorkspaceState loading={loading} error={error} empty={!scans.length}>{scans.map((scan) => { const gate = gateFor(scan); const top = (scan.findings?.list ?? []).slice(0, 3); return <Card key={scan.repo}><CardHeader><div className="flex flex-wrap items-start justify-between gap-4"><div><CardTitle>{scan.repo}</CardTitle><p className="mt-1 text-sm text-muted-foreground">Evidence captured {new Date(scan.created_at).toLocaleString()}</p></div><Badge variant="outline" className={gate.tone}><gate.Icon />{gate.label}</Badge></div></CardHeader><CardContent className="space-y-5"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{evidence(scan).map((area) => <div key={area.name} className="rounded-xl border border-border bg-muted/20 p-3"><p className="text-xs text-muted-foreground">{area.name}</p><p className={area.known ? "mt-1 font-semibold" : "mt-1 font-semibold text-muted-foreground"}>{area.value}</p></div>)}</div><p className="text-sm">{gate.note}</p>{top.length ? <ol className="space-y-2">{top.map((finding, index) => <li key={`${finding.file}-${index}`} className="text-sm text-muted-foreground"><span className="mr-2 font-medium text-foreground">{index + 1}.</span>{finding.title ?? finding.message ?? "Review this finding"}</li>)}</ol> : null}<Button asChild><Link href={`/scan/fixes?repo=${encodeURIComponent(scan.repo)}`}>Review launch blockers <ArrowRight /></Link></Button></CardContent></Card>; })}</WorkspaceState>
  </WorkspacePage>;
}

export function GuidedFixesPage() {
  const { scans, loading, error } = useRecentScans();
  return <WorkspacePage eyebrow="Guided fixes" title="Understand and choose the repair" description="Each recommendation explains why it matters, where to work, and what Krythiq needs to verify later."><WorkspaceState loading={loading} error={error} empty={!scans.length}>{scans.map((scan) => <RepoFixes key={scan.repo} scan={scan} mode="guide" />)}</WorkspaceState></WorkspacePage>;
}

export function DraftChangesPage() {
  const { scans, loading, error } = useRecentScans();
  const action = usePaidWorkflow();
  const generate = async (repo: string, index: number) => {
    try { const result = await action.run("/api/workflow/draft-patch", repo, index); const url = URL.createObjectURL(new Blob([result.patch], { type: "text/x-diff" })); const link = document.createElement("a"); link.href = url; link.download = `krythiq-${repo.replace("/", "-")}-${index + 1}.diff`; link.click(); URL.revokeObjectURL(url); toast.success("Safe patch preview downloaded. Review every line before applying it."); } catch (cause) { toast.error(cause instanceof Error ? cause.message : "Draft generation failed."); }
  };
  return <WorkspacePage eyebrow="Draft changes" title="Prepare a reviewable patch" description="Krythiq creates a temporary preview only after your click. It never edits a repository, creates a branch, or merges code automatically."><SafetyNote icon={FileDiff} text="Patch generation costs 25 Tokens. Protected files and secret-like additions are blocked. GitHub draft publishing remains disabled until a least-privilege GitHub App is configured." /><WorkspaceState loading={loading} error={error} empty={!scans.length}>{scans.map((scan) => <RepoFixes key={scan.repo} scan={scan} mode="draft" busy={action.busy} onAction={generate} />)}</WorkspaceState></WorkspacePage>;
}

export function CheckFixesPage() {
  const { history, loading, error } = useRecentScans();
  const action = usePaidWorkflow();
  const candidates = Array.from(new Map(history.flatMap((scan) => (scan.findings?.aiReview?.suggestions ?? []).map((item, index) => [`${scan.repo}:${item.file ?? ""}:${item.category ?? ""}:${item.title.toLowerCase()}`, { scan, index }]))).values());
  const verify = async (repo: string, index: number, baselineCreatedAt: string) => { try { const result = await action.run("/api/workflow/verify", repo, index, baselineCreatedAt); const label = result.outcome === "still_present" ? "Still present" : result.outcome === "verified" ? "Verified resolved" : "Inconclusive"; toast(result.explanation, { description: label }); } catch (cause) { toast.error(cause instanceof Error ? cause.message : "Verification failed."); } };
  return <WorkspacePage eyebrow="Check fixes" title="Prove what changed" description="Focused comparison gives an honest result: verified, still present, regressed, or inconclusive."><SafetyNote icon={BadgeCheck} text="Verification costs 15 Tokens. Krythiq compares saved scan evidence and never executes untrusted repository code on its servers." /><WorkspaceState loading={loading} error={error} empty={!history.length}>{candidates.map(({ scan, index }) => <VerificationCandidate key={`${scan.repo}:${scan.created_at}:${index}`} scan={scan} index={index} busy={action.busy} onVerify={verify} />)}</WorkspaceState></WorkspacePage>;
}

function VerificationCandidate({ scan, index, busy, onVerify }: { scan: Scan; index: number; busy: string | null; onVerify: (repo: string, index: number, baselineCreatedAt: string) => void }) {
  const item = scan.findings?.aiReview?.suggestions?.[index]; if (!item) return null;
  return <Card><CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-center gap-2"><BadgeCheck className="h-4 w-4 text-sky-500" /><p className="font-medium">{item.title}</p></div><p className="mt-2 text-sm text-muted-foreground">{scan.repo} · baseline {new Date(scan.created_at).toLocaleString()} · {item.file ?? "multiple files"}</p></div><Button variant="outline" disabled={busy === `${scan.repo}:${index}`} onClick={() => onVerify(scan.repo, index, scan.created_at)}><BadgeCheck />{busy ? "Checking…" : "Compare with latest scan"}</Button></CardContent></Card>;
}

function RepoFixes({ scan, mode, busy, onAction }: { scan: Scan; mode: "guide" | "draft" | "verify"; busy?: string | null; onAction?: (repo: string, index: number) => void }) {
  const suggestions = scan.findings?.aiReview?.suggestions ?? [];
  return <Card><CardHeader><div className="flex items-start justify-between gap-4"><div><CardTitle>{scan.repo}</CardTitle><p className="mt-1 text-sm text-muted-foreground">{suggestions.length} recommended {suggestions.length === 1 ? "change" : "changes"}</p></div><Badge variant="outline">{new Date(scan.created_at).toLocaleDateString()}</Badge></div></CardHeader><CardContent className="grid gap-3 md:grid-cols-2">{suggestions.length ? suggestions.slice(0, 8).map((item, index) => <div key={`${item.title}-${index}`} className="flex flex-col rounded-xl border border-border p-4"><div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-fuchsia-500" /><p className="font-medium">{item.title}</p></div><p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">{item.reason ?? "Review the evidence and proposed change before accepting it."}</p><p className="mt-2 text-xs text-muted-foreground">{item.file ?? "Across the app"}{item.line ? ` · line ${item.line}` : ""}</p><div className="mt-auto pt-4">{mode === "guide" ? <Button asChild size="sm"><Link href={`/scan/drafts?repo=${encodeURIComponent(scan.repo)}&fix=${index}`}>Prepare this fix <ArrowRight /></Link></Button> : <Button size="sm" variant={mode === "draft" ? "default" : "outline"} disabled={busy === `${scan.repo}:${index}`} onClick={() => onAction?.(scan.repo, index)}>{mode === "draft" ? <><Download />{busy ? "Preparing…" : "Generate patch"}</> : <><BadgeCheck />{busy ? "Checking…" : "Run verification"}</>}</Button>}</div></div>) : <p className="text-sm text-muted-foreground md:col-span-2">Run a frontend-aware scan to create exact guided fixes.</p>}</CardContent></Card>;
}

function WorkspacePage({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children: React.ReactNode }) { return <div className="mx-auto max-w-6xl space-y-6"><section className="rounded-3xl border border-border bg-card p-6 sm:p-8"><p className="text-xs font-medium uppercase tracking-[.18em] text-muted-foreground">{eyebrow}</p><h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{description}</p></section>{children}</div>; }
function WorkspaceState({ loading, error, empty, children }: { loading: boolean; error: string | null; empty: boolean; children: React.ReactNode }) { if (loading) return <div className="space-y-4"><Skeleton className="h-56" /><Skeleton className="h-56" /></div>; if (error) return <Card><CardContent className="p-6 text-sm text-destructive">{error}</CardContent></Card>; if (empty) return <Card><CardContent className="p-10 text-center"><Rocket className="mx-auto h-8 w-8 text-muted-foreground" /><p className="mt-4 font-medium">Run your first scan</p><p className="mt-1 text-sm text-muted-foreground">Your readiness evidence and guided workflow will appear here.</p><Button asChild className="mt-5"><Link href="/scan"><ShieldCheck />Start a scan</Link></Button></CardContent></Card>; return <div className="space-y-4">{children}</div>; }
function SafetyNote({ icon: Icon, text }: { icon: typeof ClipboardCheck; text: string }) { return <div className="flex gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4 text-sm leading-6"><Icon className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" /><p>{text}</p></div>; }
