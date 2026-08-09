"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Copy, FileCode2, Lightbulb, MapPin } from "lucide-react";
import { toast } from "sonner";
import { buildTeamAuthHeaders } from "@/app/lib/http";
import { createClient } from "@/app/lib/supabase";
import { useTeam } from "@/app/components/TeamProvider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type AiSuggestion = { title: string; reason: string; file: string | null; replacement: string | null; category: string; evidence: string | null; line?: number | null; currentCode?: string | null; replacementCode?: string | null };
type Scan = { created_at: string; findings?: { aiReview?: { suggestions?: AiSuggestion[] } } | null };

export function AiFixDetailClient({ repo, suggestionId }: { repo: string; suggestionId: string }) {
  const supabase = useMemo(() => createClient(), []);
  const { selectedTeamId } = useTeam();
  const [scan, setScan] = useState<Scan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const index = Number.parseInt(suggestionId, 10);

  useEffect(() => {
    let active = true;
    void (async () => {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) { if (active) { setError("Sign in to open this fix."); setLoading(false); } return; }
      const response = await fetch(`/api/scans/report?repo=${encodeURIComponent(repo)}`, { headers: buildTeamAuthHeaders(token, selectedTeamId) });
      const payload = await response.json().catch(() => ({}));
      if (!active) return;
      if (!response.ok) setError(payload?.error ?? "This fix could not be loaded.");
      else setScan(payload?.latest ?? null);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [repo, selectedTeamId, supabase]);

  if (loading) return <div className="mx-auto max-w-5xl space-y-4"><Skeleton className="h-9 w-40" /><Skeleton className="h-64" /><Skeleton className="h-80" /></div>;
  const suggestion = Number.isInteger(index) && index >= 0 ? scan?.findings?.aiReview?.suggestions?.[index] : undefined;
  const reportHref = `/reports/${encodeURIComponent(repo)}`;
  if (error || !scan || !suggestion) return <div className="mx-auto max-w-4xl space-y-5"><Button asChild variant="ghost"><Link href={reportHref}><ArrowLeft />Back to report</Link></Button><Card><CardContent className="p-8"><h1 className="text-2xl font-semibold">Fix not found</h1><p className="mt-2 text-sm text-muted-foreground">{error ?? "Run a new scan to refresh this recommendation."}</p></CardContent></Card></div>;

  const location = suggestion.file ? `${suggestion.file}${suggestion.line ? `, line ${suggestion.line}` : ""}` : "Across the sampled interface";
  return <div className="mx-auto max-w-5xl space-y-6">
    <Button asChild variant="ghost" className="px-0"><Link href={reportHref}><ArrowLeft />Back to {repo}</Link></Button>
    <section className="rounded-3xl border border-fuchsia-500/25 bg-[radial-gradient(circle_at_top_right,rgba(217,70,239,.12),transparent_35%),var(--card)] p-7 sm:p-9">
      <div className="flex flex-wrap items-center gap-2"><Badge variant="outline">Fix {index + 1}</Badge>{suggestion.replacement ? <Badge className="bg-emerald-500/10 text-emerald-500">Use {suggestion.replacement}</Badge> : null}</div>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight">{suggestion.title}</h1>
      <p className="mt-3 max-w-3xl text-base leading-7 text-muted-foreground">{suggestion.reason}</p>
      <div className="mt-5 inline-flex items-center gap-2 rounded-xl border border-border bg-background/70 px-4 py-3 text-sm"><MapPin className="h-4 w-4 text-fuchsia-500" /><span>{location}</span></div>
    </section>
    <div className="grid gap-5 lg:grid-cols-2">
      <CodeCard title="Find this code" code={suggestion.currentCode ?? suggestion.evidence} line={suggestion.line} empty="The earlier scan saved the file but not the full code block. Run a new scan to capture an exact copy." />
      <CodeCard title="Replace it with this" code={suggestion.replacementCode} tone="good" empty={suggestion.replacement ? `Use ${suggestion.replacement} here. A ready-to-paste example was not returned, so open that component’s examples and match the current content.` : "Review the explanation and simplify this part of the page."} />
    </div>
    <Card><CardHeader><CardTitle className="flex items-center gap-2"><Lightbulb className="h-5 w-5 text-amber-500" />What to do next</CardTitle></CardHeader><CardContent><ol className="grid gap-3 text-sm leading-6 sm:grid-cols-3"><Step number="1" text={`Open ${suggestion.file ?? "the affected page"}${suggestion.line ? ` near line ${suggestion.line}` : ""}.`} /><Step number="2" text={suggestion.replacement ? `Swap the custom part for ${suggestion.replacement}.` : "Make the small change described above."} /><Step number="3" text="Preview the page, check mobile size, and make sure keyboard controls still work." /></ol></CardContent></Card>
  </div>;
}

function CodeCard({ title, code, line, tone = "bad", empty }: { title: string; code?: string | null; line?: number | null; tone?: "bad" | "good"; empty: string }) {
  return <Card className={tone === "good" ? "border-emerald-500/25" : "border-orange-500/25"}><CardHeader><div className="flex items-center justify-between gap-3"><CardTitle className="flex items-center gap-2"><FileCode2 className="h-5 w-5" />{title}</CardTitle>{code ? <Button size="sm" variant="outline" onClick={() => void navigator.clipboard.writeText(code).then(() => toast.success("Code copied."))}><Copy />Copy</Button> : null}</div></CardHeader><CardContent>{code ? <pre className="overflow-x-auto rounded-xl bg-zinc-950 p-4 text-sm leading-6 text-zinc-100"><code>{code}</code></pre> : <p className="rounded-xl bg-muted/30 p-4 text-sm leading-6 text-muted-foreground">{empty}</p>}{line ? <p className="mt-3 text-xs text-muted-foreground">Starts around line {line}.</p> : null}</CardContent></Card>;
}

function Step({ number, text }: { number: string; text: string }) { return <li className="flex gap-3 rounded-xl border border-border bg-muted/20 p-4"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-foreground text-xs font-semibold text-background">{number}</span><span>{text}</span><CheckCircle2 className="ml-auto h-4 w-4 shrink-0 text-emerald-500" /></li>; }
