"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowRight, Atom, BadgeCheck, Bot, CheckCircle2, Clipboard, ClipboardCheck, Clock3, Code2, FileDiff, Gem, Github, Loader2, MousePointer2, Rocket, ShieldCheck, Sparkles, Terminal, WandSparkles, Waves } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/app/lib/supabase";
import { buildTeamAuthHeaders } from "@/app/lib/http";
import { useTeam } from "@/app/components/TeamProvider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Toolbar, type ToolbarItem } from "@/components/kokonutui/toolbar";

type Finding = { title?: string; message?: string; file?: string; line?: number; severity?: string; type?: string; snippet?: string | null; suggestion?: string | null };
type Suggestion = { title: string; reason?: string; file?: string | null; line?: number | null; category?: string; evidence?: string | null; currentCode?: string | null; replacementCode?: string | null };
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

function useWorkflowAction() {
  const supabase = useMemo(() => createClient(), []);
  const { selectedTeamId } = useTeam();
  const [busy, setBusy] = useState<string | null>(null);
  const run = async (path: string, repository: string, suggestionIndex: number, baselineCreatedAt?: string) => {
    const key = `${repository}:${suggestionIndex}`; setBusy(key);
    try {
      const session = (await supabase.auth.getSession()).data.session;
      const token = session?.access_token;
      if (!token) throw new Error("Sign in to continue.");
      const response = await fetch(path, { method: "POST", headers: buildTeamAuthHeaders(token, selectedTeamId, { "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() }), body: JSON.stringify({ repository, suggestionIndex, baselineCreatedAt, providerToken: session?.provider_token ?? null }) });
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

export function GuidedFixesPage({ repository }: { repository?: string }) {
  const { scans, loading, error } = useRecentScans();
  const visibleScans = repository ? scans.filter((scan) => scan.repo === repository) : scans;
  return <WorkspacePage eyebrow="Guided fixes" title="Turn each finding into an agent-ready fix" description="Choose a repository issue, generate an evidence-grounded handoff with the LLM, then copy the prompt tailored to the coding agent you use."><SafetyNote icon={WandSparkles} text="Each generation costs 5 Tokens and creates every agent variant for that issue. Prompts are grounded in saved scan evidence; agents are told to inspect and verify the repository before editing." /><WorkspaceState loading={loading} error={error} empty={!visibleScans.length}>{visibleScans.map((scan) => <RepoAgentFixes key={scan.repo} scan={scan} />)}</WorkspaceState></WorkspacePage>;
}

export function DraftChangesPage() {
  const router = useRouter();
  const { scans, loading, error } = useRecentScans();
  const action = useWorkflowAction();
  const supabase = useMemo(() => createClient(), []);
  const { selectedTeamId } = useTeam();
  const [openingRepository, setOpeningRepository] = useState<string | null>(null);
  const [workspaces, setWorkspaces] = useState<Array<{ id: string; repository: string; title: string; base_branch: string; base_commit_sha: string; updated_at: string; workspace_files?: Array<{ path: string }> }>>([]);
  const loadWorkspaces = async () => {
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    if (!token) return;
    const response = await fetch("/api/workspaces", { headers: buildTeamAuthHeaders(token, selectedTeamId) });
    const payload = await response.json().catch(() => ({}));
    if (response.ok) setWorkspaces(payload.workspaces ?? []);
  };
  useEffect(() => { const timer = window.setTimeout(() => { void loadWorkspaces(); }, 0); return () => window.clearTimeout(timer); }, [selectedTeamId]); // eslint-disable-line react-hooks/exhaustive-deps
  const openWorkspace = (workspaceId: string) => router.push(`/scan/drafts/${workspaceId}`);
  const generate = async (repo: string, index: number) => {
    try { const result = await action.run("/api/workflow/draft-patch", repo, index) as { workspaceId: string }; await loadWorkspaces(); toast.success("Free draft workspace created."); router.push(`/scan/drafts/${result.workspaceId}`); } catch (cause) { toast.error(cause instanceof Error ? cause.message : "Draft generation failed."); }
  };
  const startWorkspace = async (repository: string) => {
    setOpeningRepository(repository);
    try {
      const session = (await supabase.auth.getSession()).data.session;
      if (!session?.access_token) throw new Error("Sign in to open a workspace.");
      const response = await fetch("/api/workspaces", { method: "POST", headers: buildTeamAuthHeaders(session.access_token, selectedTeamId, { "Content-Type": "application/json" }), body: JSON.stringify({ repository, providerToken: session.provider_token ?? null }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? "Unable to open repository workspace.");
      await loadWorkspaces(); toast.success("Free repository workspace opened."); router.push(`/scan/drafts/${payload.workspaceId}`);
    } catch (cause) { toast.error(cause instanceof Error ? cause.message : "Unable to open repository workspace."); }
    finally { setOpeningRepository(null); }
  };
  return <WorkspacePage eyebrow="Draft changes" title="Edit and review changes together" description="Open a repository workspace, edit code, inspect live diffs, collaborate, export, and publish reviewed changes."><SafetyNote icon={FileDiff} text="Workspaces are pinned to an exact GitHub commit and synchronized only with authorized team members. Repository code is never executed on the Krythiq server." />{workspaces.length ? <section className="border-y border-border py-4"><div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-semibold">Saved workspaces</h2><span className="text-xs text-muted-foreground">{workspaces.length} active</span></div><div className="divide-y divide-border">{workspaces.map((workspace) => <button key={workspace.id} type="button" className="flex w-full items-center gap-4 py-3 text-left transition hover:bg-muted/30" onClick={() => openWorkspace(workspace.id)}><FileDiff className="size-4 shrink-0 text-sky-500" /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{workspace.title}</span><span className="block truncate text-xs text-muted-foreground">{workspace.repository} · {workspace.base_branch}@{workspace.base_commit_sha.slice(0, 7)} · {workspace.workspace_files?.length ?? 0} opened files</span></span><span className="text-xs text-muted-foreground">{new Date(workspace.updated_at).toLocaleDateString()}</span><ArrowRight className="size-4" /></button>)}</div></section> : null}<WorkspaceState loading={loading} error={error} empty={!scans.length}><section className="border-y border-border"><div className="flex items-center justify-between border-b border-border py-3"><div><h2 className="text-sm font-semibold">Repositories</h2><p className="mt-1 text-xs text-muted-foreground">Open a workspace directly—scan recommendations are optional.</p></div><Badge variant="outline">{scans.length} available</Badge></div><div className="divide-y divide-border">{scans.map((scan) => { const suggestionCount = scan.findings?.aiReview?.suggestions?.length ?? 0; return <div key={scan.repo} className="flex flex-wrap items-center gap-4 py-4"><span className="grid size-9 place-items-center rounded-lg bg-sky-500/10 text-sky-500"><Code2 className="size-4" /></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{scan.repo}</p><p className="mt-1 text-xs text-muted-foreground">{suggestionCount ? `${suggestionCount} guided ${suggestionCount === 1 ? "change" : "changes"} available` : "Ready for direct editing"} · scanned {new Date(scan.created_at).toLocaleDateString()}</p></div><Button size="sm" disabled={openingRepository === scan.repo} onClick={() => void startWorkspace(scan.repo)}>{openingRepository === scan.repo ? <Loader2 className="animate-spin" /> : <Code2 />}{openingRepository === scan.repo ? "Opening…" : "Open workspace"}</Button>{suggestionCount ? <Button size="sm" variant="outline" onClick={() => void generate(scan.repo, 0)}>Draft first fix</Button> : null}</div>; })}</div></section></WorkspaceState></WorkspacePage>;
}

export function CheckFixesPage() {
  const { history, loading, error } = useRecentScans();
  const action = useWorkflowAction();
  const candidates = Array.from(new Map(history.flatMap((scan) => (scan.findings?.aiReview?.suggestions ?? []).map((item, index) => [`${scan.repo}:${item.file ?? ""}:${item.category ?? ""}:${item.title.toLowerCase()}`, { scan, index }]))).values());
  const verify = async (repo: string, index: number, baselineCreatedAt: string) => { try { const result = await action.run("/api/workflow/verify", repo, index, baselineCreatedAt); const label = result.outcome === "still_present" ? "Still present" : result.outcome === "verified" ? "Verified resolved" : "Inconclusive"; toast(result.explanation, { description: label }); } catch (cause) { toast.error(cause instanceof Error ? cause.message : "Verification failed."); } };
  return <WorkspacePage eyebrow="Check fixes" title="Prove what changed" description="Focused comparison gives an honest result: verified, still present, regressed, or inconclusive."><SafetyNote icon={BadgeCheck} text="Check Fixes is free. Krythiq compares saved scan evidence and never executes untrusted repository code on its servers." /><WorkspaceState loading={loading} error={error} empty={!history.length}>{candidates.map(({ scan, index }) => <VerificationCandidate key={`${scan.repo}:${scan.created_at}:${index}`} scan={scan} index={index} busy={action.busy} onVerify={verify} />)}</WorkspaceState></WorkspacePage>;
}

function VerificationCandidate({ scan, index, busy, onVerify }: { scan: Scan; index: number; busy: string | null; onVerify: (repo: string, index: number, baselineCreatedAt: string) => void }) {
  const item = scan.findings?.aiReview?.suggestions?.[index]; if (!item) return null;
  return <Card><CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-center gap-2"><BadgeCheck className="h-4 w-4 text-sky-500" /><p className="font-medium">{item.title}</p></div><p className="mt-2 text-sm text-muted-foreground">{scan.repo} · baseline {new Date(scan.created_at).toLocaleString()} · {item.file ?? "multiple files"}</p></div><Button variant="outline" disabled={busy === `${scan.repo}:${index}`} onClick={() => onVerify(scan.repo, index, scan.created_at)}><BadgeCheck />{busy ? "Checking…" : "Compare with latest scan · Free"}</Button></CardContent></Card>;
}

type AgentId = "codex" | "claude" | "windsurf" | "gemini" | "copilot" | "cursor" | "generic";
const agentTabs: Array<{ id: AgentId; label: string; cli?: string; icon: ToolbarItem["icon"] }> = [
  { id: "codex", label: "Codex", cli: "codex", icon: Atom },
  { id: "claude", label: "Claude Code", cli: "claude", icon: Sparkles },
  { id: "windsurf", label: "Windsurf", icon: Waves },
  { id: "gemini", label: "Gemini CLI", cli: "gemini", icon: Gem },
  { id: "copilot", label: "GitHub Copilot", icon: Github },
  { id: "cursor", label: "Cursor", icon: MousePointer2 },
  { id: "generic", label: "Other", icon: Bot },
];

function shellQuote(value: string) {
  return `'${value.replaceAll("'", `'"'"'`)}'`;
}

function terminalCommand(repository: string, cli: string, prompt: string) {
  return `# Run inside your local ${repository} checkout\ncd "$(git rev-parse --show-toplevel)" && ${cli} ${shellQuote(prompt)}`;
}

async function copyHandoff(value: string, successMessage: string) {
  try {
    await navigator.clipboard.writeText(value);
    toast.success(successMessage);
  } catch {
    toast.error("Clipboard access was blocked. Allow clipboard access and try again.");
  }
}

function RepoAgentFixes({ scan }: { scan: Scan }) {
  const suggestions = (scan.findings?.aiReview?.suggestions ?? []).map((item, index) => ({ title: item.title, description: item.reason, file: item.file, line: item.line, severity: null, index, source: "suggestion" as const }));
  const findings = (scan.findings?.list ?? []).map((item, index) => ({ title: item.title ?? item.message ?? "Repository issue", description: item.message ?? item.suggestion, file: item.file, line: item.line, severity: item.severity ?? null, index, source: "finding" as const }));
  const issues = [...suggestions, ...findings].slice(0, 12);
  return <Card><CardHeader><div className="flex flex-wrap items-start justify-between gap-4"><div><CardTitle>{scan.repo}</CardTitle><p className="mt-1 text-sm text-muted-foreground">{issues.length} specific {issues.length === 1 ? "issue" : "issues"} ready for an agent handoff</p></div><Badge variant="outline">{new Date(scan.created_at).toLocaleDateString()}</Badge></div></CardHeader><CardContent className="space-y-4">{issues.length ? issues.map((item) => <div key={`${item.source}:${item.index}:${item.title}`} className="rounded-2xl border border-border p-4 sm:p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><div className="flex items-center gap-2"><Sparkles className="h-4 w-4 shrink-0 text-fuchsia-500" /><p className="font-medium">{item.title}</p></div><p className="mt-2 text-sm leading-6 text-muted-foreground">{item.description ?? "Review the captured evidence and surrounding implementation."}</p><p className="mt-2 font-mono text-xs text-muted-foreground">{item.file ?? "Across the repository"}{item.line ? `:${item.line}` : ""}</p></div>{item.severity ? <Badge variant="outline" className="capitalize">{item.severity}</Badge> : null}</div><AgentPromptHandoff repository={scan.repo} source={item.source} issueIndex={item.index} /></div>) : <p className="py-6 text-center text-sm text-muted-foreground">Run a scan with saved findings to create agent prompts.</p>}</CardContent></Card>;
}

function AgentPromptHandoff({ repository, source, issueIndex }: { repository: string; source: "suggestion" | "finding"; issueIndex: number }) {
  const supabase = useMemo(() => createClient(), []);
  const { selectedTeamId } = useTeam();
  const [prompts, setPrompts] = useState<Record<AgentId, string> | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<AgentId>("codex");
  const [busy, setBusy] = useState(false);
  const generate = async () => {
    setBusy(true);
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) throw new Error("Sign in to generate agent prompts.");
      const response = await fetch("/api/workflow/agent-prompts", { method: "POST", headers: buildTeamAuthHeaders(token, selectedTeamId, { "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() }), body: JSON.stringify({ repository, source, issueIndex }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? "Unable to generate prompts.");
      setPrompts(payload.prompts);
      toast.success("Agent-specific prompts generated.");
    } catch (cause) { toast.error(cause instanceof Error ? cause.message : "Unable to generate prompts."); }
    finally { setBusy(false); }
  };
  if (!prompts) return <Button className="mt-4" size="sm" variant="outline" disabled={busy} onClick={() => void generate()}>{busy ? <Loader2 className="animate-spin" /> : <WandSparkles />}{busy ? "Generating all prompts…" : "Generate agent prompts · 5 Tokens"}</Button>;
  return <Tabs value={selectedAgent} onValueChange={(value) => setSelectedAgent(value as AgentId)} className="mt-5"><Toolbar ariaLabel="Choose a coding agent" selected={selectedAgent} onSelect={(value) => setSelectedAgent(value as AgentId)} items={agentTabs.map((agent) => ({ id: agent.id, title: agent.label, icon: agent.icon }))} />{agentTabs.map((agent) => <TabsContent key={agent.id} value={agent.id} className="mt-3"><div className="rounded-xl border border-border bg-muted/20"><pre className="max-h-80 overflow-auto whitespace-pre-wrap break-words p-4 font-mono text-xs leading-6">{prompts[agent.id]}</pre><div className="flex flex-wrap items-center gap-2 border-t border-border p-3"><Button type="button" size="sm" variant="outline" onClick={() => void copyHandoff(prompts[agent.id], `${agent.label} prompt copied.`)}><Clipboard />Copy prompt</Button>{agent.cli ? <Button type="button" size="sm" onClick={() => void copyHandoff(terminalCommand(repository, agent.cli!, prompts[agent.id]), `${agent.label} terminal command copied.`)}><Terminal />Copy terminal command</Button> : null}<span className="text-xs text-muted-foreground">{agent.cli ? "Paste into Terminal from anywhere inside the local repository." : "Paste this prompt into the agent while the repository is open."}</span></div></div></TabsContent>)}</Tabs>;
}

function WorkspacePage({ children }: { eyebrow: string; title: string; description: string; children: React.ReactNode }) { return <div className="mx-auto max-w-6xl space-y-6">{children}</div>; }
function WorkspaceState({ loading, error, empty, children }: { loading: boolean; error: string | null; empty: boolean; children: React.ReactNode }) { if (loading) return <div className="space-y-4"><Skeleton className="h-56" /><Skeleton className="h-56" /></div>; if (error) return <Card><CardContent className="p-6 text-sm text-destructive">{error}</CardContent></Card>; if (empty) return <Card><CardContent className="p-10 text-center"><Rocket className="mx-auto h-8 w-8 text-muted-foreground" /><p className="mt-4 font-medium">Run your first scan</p><p className="mt-1 text-sm text-muted-foreground">Your readiness evidence and guided workflow will appear here.</p><Button asChild className="mt-5"><Link href="/scan"><ShieldCheck />Start a scan</Link></Button></CardContent></Card>; return <div className="space-y-4">{children}</div>; }
function SafetyNote({ icon: Icon, text }: { icon: typeof ClipboardCheck; text: string }) { return <div className="flex gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4 text-sm leading-6"><Icon className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" /><p>{text}</p></div>; }
