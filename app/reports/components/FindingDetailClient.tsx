"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Bot, FileCode2, Lightbulb, ShieldAlert, Sparkles, Wrench } from "lucide-react";
import { buildTeamAuthHeaders } from "@/app/lib/http";
import { createClient } from "@/app/lib/supabase";
import { useTeam } from "@/app/components/TeamProvider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Finding = {
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

type Scan = {
  created_at: string;
  severity: string;
  issues: number;
  score: number;
  findings?: { ai_summary?: string; list?: Finding[] | null } | null;
};

const riskStyle: Record<string, string> = {
  critical: "border-red-500/30 bg-red-500/10 text-red-400",
  high: "border-orange-500/30 bg-orange-500/10 text-orange-400",
  medium: "border-amber-500/30 bg-amber-500/10 text-amber-400",
  low: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
};

export function FindingDetailClient({ repo, findingId }: { repo: string; findingId: string }) {
  const supabase = useMemo(() => createClient(), []);
  const { selectedTeamId } = useTeam();
  const [scan, setScan] = useState<Scan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const index = Number.parseInt(findingId, 10);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) { if (mounted) { setError("Sign in to view this finding."); setLoading(false); } return; }
      const response = await fetch(`/api/scans/report?repo=${encodeURIComponent(repo)}`, { headers: buildTeamAuthHeaders(token, selectedTeamId) });
      const payload = await response.json().catch(() => ({}));
      if (!mounted) return;
      if (!response.ok) setError(payload?.error ?? "Unable to load this finding.");
      else setScan(payload?.latest ?? null);
      setLoading(false);
    };
    void load();
    return () => { mounted = false; };
  }, [repo, selectedTeamId, supabase]);

  if (loading) return <div className="mx-auto max-w-6xl space-y-4"><Skeleton className="h-9 w-40" /><Skeleton className="h-52" /><Skeleton className="h-80" /></div>;

  const finding = Number.isInteger(index) && index >= 0 ? scan?.findings?.list?.[index] : undefined;
  const reportHref = `/reports/${encodeURIComponent(repo)}`;
  if (error || !scan || !finding) return <div className="mx-auto max-w-4xl space-y-6"><Button asChild variant="ghost" className="px-0"><Link href={reportHref}><ArrowLeft />Back to report</Link></Button><Card><CardContent className="p-8"><h1 className="text-2xl font-semibold">Finding not found</h1><p className="mt-2 text-sm text-muted-foreground">{error ?? "This finding is no longer present in the repository’s latest scan."}</p></CardContent></Card></div>;

  const severity = (finding.severity ?? "low").toLowerCase();
  const file = finding.file ?? finding.path ?? "Repository-wide finding";
  const fix = finding.fix ?? finding.recommendation ?? finding.suggestion;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Button asChild variant="ghost" className="px-0"><Link href={reportHref}><ArrowLeft className="h-4 w-4" />Back to {repo}</Link></Button>
      <section className="overflow-hidden rounded-[2rem] border border-border bg-[radial-gradient(circle_at_top_right,rgba(239,68,68,.14),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(59,130,246,.12),transparent_32%),var(--card)] p-7 sm:p-9">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl"><div className="flex flex-wrap items-center gap-2"><Badge variant="outline" className={riskStyle[severity]}><ShieldAlert className="mr-1 h-3 w-3" />{severity} risk</Badge><Badge variant="outline">Finding #{index + 1}</Badge>{finding.type ? <Badge variant="outline">{finding.type}</Badge> : null}</div><h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">{finding.title ?? finding.message ?? file}</h1><p className="mt-3 flex items-center gap-2 font-mono text-sm text-sky-400"><FileCode2 className="h-4 w-4" />{file}{finding.line ? `:${finding.line}` : ""}</p></div>
          <div className="grid min-w-48 grid-cols-2 gap-2 lg:grid-cols-1"><div className="rounded-2xl border border-border bg-background/70 p-4"><p className="text-xs text-muted-foreground">Risk score</p><p className="mt-1 text-2xl font-semibold">{finding.score ?? scan.score}</p></div><div className="rounded-2xl border border-border bg-background/70 p-4"><p className="text-xs text-muted-foreground">Detected</p><p className="mt-1 text-sm font-semibold">{new Date(scan.created_at).toLocaleDateString()}</p></div></div>
        </div>
      </section>

      <Tabs defaultValue="overview" className="space-y-5">
        <TabsList className="h-auto w-full justify-start overflow-x-auto rounded-xl border border-border bg-card p-1"><TabsTrigger value="overview">Overview</TabsTrigger><TabsTrigger value="code">Code evidence</TabsTrigger><TabsTrigger value="risk">Risk analysis</TabsTrigger><TabsTrigger value="fix">Recommended fix</TabsTrigger><TabsTrigger value="ai">AI feedback</TabsTrigger></TabsList>
        <TabsContent value="overview"><Card><CardHeader><CardTitle className="flex items-center gap-2"><FileCode2 className="h-5 w-5 text-sky-400" />What was detected</CardTitle></CardHeader><CardContent><p className="text-sm leading-7 text-muted-foreground">{finding.description ?? finding.message ?? "The scanner identified a risky pattern in this file. Review its runtime context before release."}</p><div className="mt-5 grid gap-3 sm:grid-cols-3"><Fact label="Repository" value={repo} /><Fact label="File" value={file} /><Fact label="Exact line" value={finding.line ? String(finding.line) : "Not recorded"} /></div></CardContent></Card></TabsContent>
        <TabsContent value="code"><CodeEvidence finding={finding} file={file} /></TabsContent>
        <TabsContent value="risk"><Card className="border-orange-500/20"><CardHeader><CardTitle className="flex items-center gap-2"><ShieldAlert className="h-5 w-5 text-orange-400" />Why this is a risk</CardTitle></CardHeader><CardContent className="space-y-4"><p className="text-sm leading-7 text-muted-foreground">{finding.technicalDetails ?? finding.description ?? finding.message ?? "This pattern may weaken the repository’s security or reliability if it is reachable in production."}</p><div className="rounded-2xl border border-orange-500/20 bg-orange-500/5 p-4"><p className="text-sm font-medium">Review priority</p><p className="mt-1 text-sm text-muted-foreground">{severity === "critical" || severity === "high" ? "Address before the next release and verify the affected execution path." : "Plan remediation and validate whether compensating controls already exist."}</p></div></CardContent></Card></TabsContent>
        <TabsContent value="fix"><Card className="border-emerald-500/20"><CardHeader><CardTitle className="flex items-center gap-2"><Wrench className="h-5 w-5 text-emerald-400" />Generated remediation</CardTitle></CardHeader><CardContent>{fix ? <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5"><p className="text-sm leading-7">{fix}</p></div> : <p className="text-sm text-muted-foreground">No generated fix was stored for this finding. Review the affected code and replace the flagged pattern with a validated alternative.</p>}<p className="mt-4 flex gap-2 text-xs leading-5 text-muted-foreground"><Lightbulb className="mt-0.5 h-4 w-4 shrink-0" />Validate generated guidance in tests and code review before merging.</p></CardContent></Card></TabsContent>
        <TabsContent value="ai"><Card className="border-violet-500/20 bg-[radial-gradient(circle_at_top_right,rgba(139,92,246,.12),transparent_40%),var(--card)]"><CardHeader><CardTitle className="flex items-center gap-2"><Bot className="h-5 w-5 text-violet-400" />Repository context <Sparkles className="h-4 w-4 text-violet-400" /></CardTitle></CardHeader><CardContent><p className="text-sm leading-7 text-muted-foreground">{scan.findings?.ai_summary ?? "AI feedback was not stored for this scan."}</p></CardContent></Card></TabsContent>
      </Tabs>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-border bg-muted/20 p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 truncate text-sm font-medium" title={value}>{value}</p></div>;
}

function CodeEvidence({ finding, file }: { finding: Finding; file: string }) {
  const codeLines = finding.snippet?.split("\n") ?? [];
  const firstLine = finding.line ?? 1;
  return <Card className="overflow-hidden border-red-500/20"><CardHeader className="border-b border-border bg-muted/20"><div className="flex flex-wrap items-center justify-between gap-3"><CardTitle className="flex items-center gap-2"><FileCode2 className="h-5 w-5 text-red-400" />Pinpointed code</CardTitle><span className="font-mono text-xs text-muted-foreground">{file}{finding.line ? `:${finding.line}` : ""}</span></div></CardHeader><CardContent className="p-0">{codeLines.length ? <div className="overflow-x-auto bg-zinc-950 py-3 font-mono text-sm text-zinc-200">{codeLines.map((line, offset) => <div key={`${offset}-${line}`} className="grid min-w-max grid-cols-[4rem_1fr] border-l-2 border-red-500 bg-red-500/10"><span className="select-none border-r border-white/10 px-3 py-1 text-right text-red-300">{firstLine + offset}</span><code className="whitespace-pre px-4 py-1">{line || " "}</code></div>)}</div> : <div className="p-8 text-center"><p className="text-sm font-medium">Code snippet not stored</p><p className="mx-auto mt-2 max-w-lg text-xs leading-5 text-muted-foreground">This scan recorded the file{finding.line ? ` and exact line ${finding.line}` : ""}, but not the source text. Re-run the repository scan to store code evidence for this finding.</p></div>}<div className="border-t border-border p-4"><p className="flex items-start gap-2 text-xs leading-5 text-muted-foreground"><ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />The highlighted code is the exact evidence captured by the scanner. Always inspect the surrounding function before applying a generated fix.</p></div></CardContent></Card>;
}
