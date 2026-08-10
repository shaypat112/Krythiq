"use client";

import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  AlertCircle, CheckCircle2, ChevronDown, ChevronRight, Clipboard, Download,
  FileCode2, Filter, FolderGit2, Github, LoaderCircle, RotateCw, Search, ShieldAlert, X, CircleStop,
} from "lucide-react";
import { createClient } from "@/app/lib/supabase";
import { buildTeamAuthHeaders } from "@/app/lib/http";
import { useTeam } from "@/app/components/TeamProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { BentoGrid } from "@/components/ui/bento-grid";
import { Skeleton } from "@/components/ui/skeleton";
import { AnimatedList } from "@/components/ui/animated-list";
import MultiStepLoaderDemo from "@/components/multi-step-loader-demo";
import { SystemDesignOverview } from "@/app/components/SystemDesignOverview";
import { HelpTooltip } from "@/app/components/HelpTooltip";
import { LinkedInScanShare } from "@/app/components/LinkedInScanShare";
import { toast } from "sonner";
import FileUpload from "@/components/kokonutui/file-upload";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ActionSearchBar, scanActionIcons, type ScanAction } from "./ActionSearchBar";
import { TechnologyCloud } from "./TechnologyCloud";
import { readScanTier, scanTierCatalog, type ScanTier } from "@/app/lib/tokens";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  readScanScope,
  type ScanScope,
} from "@/app/lib/ai-settings";
import { scanCheckpointsForScope } from "@/app/lib/scanner/checkpoints";

type Severity = "low" | "medium" | "high" | "critical";
type Finding = {
  file: string; line: number; severity: Severity; score: number; type: string;
  message: string; snippet?: string; suggestion?: string; source: "regex" | "ai";
  category?: "code" | "secrets"; confidence?: string; advisoryId?: string; technicalDetails?: string;
};
type RepositoryProfile = {
  metadata: { description: string | null; defaultBranch: string; visibility: string; stars: number; forks: number; openIssues: number; sizeKb: number; pushedAt: string | null };
  metrics: { repositoryFiles: number; scannedFiles: number; scannedLines: number; scannedBytes: number; directories: number };
  languages: Array<{ name: string; bytes: number; files: number; lines: number; percent: number }>;
  fileTypes: Array<{ name: string; files: number; lines: number }>;
  largestFiles: Array<{ path: string; bytes: number; lines: number }>;
  manifests: string[];
  technologies: string[];
  dependencies: string[];
};
type ScanIntelligence = { summary: string; architecture: string; securityPosture: string; strengths: string[]; priorities: Array<{ title: string; reason: string; effort: "low" | "medium" | "high" }>; observations: string[] };
type AiReview = {
  scope: ScanScope;
  provider: "groq" | "xai";
  vibeCodedPercent: number | null;
  reasoning: string;
  summary: string;
  scores: { componentUsage: number; consistency: number; accessibility: number; responsive: number; designSystem: number; overall: number };
  suggestions: Array<{ title: string; reason: string; file: string | null; replacement: string | null; category: "components" | "a11y" | "responsive" | "consistency"; evidence: string | null; line?: number | null; currentCode?: string | null; replacementCode?: string | null }>;
};
type SystemDesignScenario = { id: "traffic-spike" | "data-growth" | "dependency-failure" | "multi-region" | "cost-pressure"; title: string; status: "ready" | "watch" | "risk" | "unknown"; confidence: "low" | "medium"; reflection: string; evidence: string[]; nextStep: string };
type SystemDesignAssessment = { summary: string; disclaimer: string; scenarios: SystemDesignScenario[] };
type ScanResult = { sourceType?: "repository" | "file"; repoUrl: string; totalFindings: number; findings: Finding[]; profile: RepositoryProfile; systemDesign: SystemDesignAssessment; intelligence: ScanIntelligence | null; aiReview?: AiReview | null; scanScope?: ScanScope; scan?: { id?: string; repo?: string; score?: number; created_at?: string } | null };
type Stage = "validating" | "cloning" | "detecting" | "dependencies" | "reading" | "analyzing" | "recommendations";
const stages: { id: Stage; title: string; fallback: string }[] = [
  { id: "validating", title: "Validating repository", fallback: "Checking the GitHub URL and preparing isolation." },
  { id: "cloning", title: "Reading files", fallback: "Fetching repository metadata and files through GitHub." },
  { id: "detecting", title: "Detecting package managers", fallback: "Looking for manifests and lockfiles." },
  { id: "dependencies", title: "Checking dependencies", fallback: "Comparing pinned package versions with known OSV advisories." },
  { id: "reading", title: "Parsing manifests", fallback: "Cataloging supported source and manifest files." },
  { id: "analyzing", title: "Analyzing risky code", fallback: "Reviewing code and possible secret exposure." },
  { id: "recommendations", title: "Generating recommendations", fallback: "Ranking findings and generating the configured bounded AI review." },
];
const severityRank: Record<Severity, number> = { critical: 4, high: 3, medium: 2, low: 1 };
function severityClass(severity: Severity) {
  return { critical: "border-rose-500/30 bg-rose-500/10 text-rose-300", high: "border-orange-500/30 bg-orange-500/10 text-orange-300", medium: "border-amber-500/30 bg-amber-500/10 text-amber-300", low: "border-sky-500/30 bg-sky-500/10 text-sky-300" }[severity];
}

function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a"); link.href = url; link.download = name; link.click(); URL.revokeObjectURL(url);
}

function csvCell(value: string | number) {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function normalizeGitHubUrl(value: string) {
  const trimmed = value.trim().replace(/\/$/, "").replace(/\.git$/, "");
  if (/^[\w.-]+\/[\w.-]+$/.test(trimmed)) return `https://github.com/${trimmed}`;
  return trimmed;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function ScanWorkspace() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const { selectedTeamId } = useTeam();
  const [repoUrl, setRepoUrl] = useState("");
  const [scanTier, setScanTier] = useState<ScanTier>("mid");
  const [analysisScope, setAnalysisScope] = useState<ScanScope>("frontend");
  const [finalTokenBalance, setFinalTokenBalance] = useState<number | null>(null);
  const [phase, setPhase] = useState<"idle" | "scanning" | "done" | "error">("idle");
  const [activeStage, setActiveStage] = useState<Stage | null>(null);
  const [stageDetails, setStageDetails] = useState<Partial<Record<Stage, string>>>({});
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [severity, setSeverity] = useState<"all" | Severity>("all");
  const [sort, setSort] = useState<"severity" | "path">("severity");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [reviewed, setReviewed] = useState<Set<string>>(new Set());
  const [falsePositive, setFalsePositive] = useState<Set<string>>(new Set());
  const [ignored, setIgnored] = useState<Map<string, string>>(new Map());
  const [ignoreTarget, setIgnoreTarget] = useState<string | null>(null);
  const [ignoreReason, setIgnoreReason] = useState("");
  const [scanController, setScanController] = useState<AbortController | null>(null);
  const [scanMode, setScanMode] = useState<"repository" | "file">("repository");
  const [githubStatus, setGithubStatus] = useState<"loading" | "connected" | "disconnected" | "expired">("loading");
  const [connectingGitHub, setConnectingGitHub] = useState(false);
  const [reportSelection, setReportSelection] = useState<Set<string>>(new Set());
  const [savingReportSelection, setSavingReportSelection] = useState(false);

  const findingKey = (finding: Finding) => `${finding.file}:${finding.line}:${finding.type}`;
  const notify = (message: string) => toast(message);

  useEffect(() => {
    const requestedTier = readScanTier(new URLSearchParams(window.location.search).get("tier"));
    if (requestedTier) setScanTier(requestedTier);
  }, []);

  const saveReportSelection = async (next: Set<string>) => {
    if (!result?.scan?.id) return;
    setReportSelection(next);
    setSavingReportSelection(true);
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) { setSavingReportSelection(false); return; }
    const response = await fetch("/api/scans/report-selection", {
      method: "PATCH",
      headers: buildTeamAuthHeaders(token, selectedTeamId, { "Content-Type": "application/json" }),
      body: JSON.stringify({ scanId: result.scan.id, selectedKeys: Array.from(next) }),
    });
    setSavingReportSelection(false);
    if (!response.ok) notify("Could not update the saved report selection.");
  };

  useEffect(() => {
    let active = true;
    const updateGitHubStatus = async () => {
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      const hasGitHubIdentity = data.session?.user.identities?.some((identity) => identity.provider === "github") === true;
      setGithubStatus(hasGitHubIdentity ? (data.session?.provider_token ? "connected" : "expired") : "disconnected");
      if (data.session?.access_token) {
        const settingsResponse = await fetch("/api/settings/load", {
          method: "POST",
          headers: buildTeamAuthHeaders(data.session.access_token, selectedTeamId),
        });
        const settingsPayload = await settingsResponse.json().catch(() => ({}));
        const savedScope = readScanScope(settingsPayload?.settings?.defaultScanScope);
        if (active && savedScope) setAnalysisScope(savedScope);
      }
    };
    void updateGitHubStatus();
    const { data: listener } = supabase.auth.onAuthStateChange(() => { void updateGitHubStatus(); });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [selectedTeamId, supabase]);

  const connectGitHub = async () => {
    setConnectingGitHub(true);
    setError(null);
    const options = {
      redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent("/scan")}`,
      scopes: "repo read:user user:email",
    };
    const result = githubStatus === "disconnected"
      ? await supabase.auth.linkIdentity({ provider: "github", options })
      : await supabase.auth.signInWithOAuth({ provider: "github", options });
    if (result.error) {
      setError(result.error.message);
      setConnectingGitHub(false);
    }
  };

  const saveFindingStatus = async (findingKey: string, status: "reviewed" | "false_positive" | "ignored" | "open", reason?: string) => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token || !result) return;
    const response = await fetch("/api/findings/status", { method: "PUT", headers: buildTeamAuthHeaders(token, selectedTeamId, { "Content-Type": "application/json" }), body: JSON.stringify({ repository: result.repoUrl, findingKey, status, reason }) });
    if (!response.ok) notify("Could not save this decision. Apply the finding_reviews migration, then try again.");
  };

  useEffect(() => {
    if (!result) return;
    let active = true;
    const loadReviewStatus = async () => {
      const { data } = await supabase.auth.getSession(); const token = data.session?.access_token;
      if (!token) return;
      const response = await fetch(`/api/findings/status?repository=${encodeURIComponent(result.repoUrl)}`, { headers: buildTeamAuthHeaders(token, selectedTeamId) });
      const payload = await response.json().catch(() => ({}));
      if (!active || !response.ok) return;
      const reviews = payload.reviews as Array<{ finding_key: string; status: string; reason: string | null }>;
      setReviewed(new Set(reviews.filter((item) => item.status === "reviewed").map((item) => item.finding_key)));
      setFalsePositive(new Set(reviews.filter((item) => item.status === "false_positive").map((item) => item.finding_key)));
      setIgnored(new Map(reviews.filter((item) => item.status === "ignored").map((item) => [item.finding_key, item.reason ?? ""])));
    };
    void loadReviewStatus(); return () => { active = false; };
  }, [result, selectedTeamId, supabase]);

  const startScan = async () => {
    const normalizedUrl = normalizeGitHubUrl(repoUrl);
    if (!/^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/?$/.test(normalizedUrl)) {
      setError("Enter a GitHub URL or owner/repository, for example github.com/krythiq/demo."); return;
    }
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) { setError("Sign in to run a repository scan."); return; }
    const tokenResponse = await fetch("/api/tokens", { headers: buildTeamAuthHeaders(token, selectedTeamId) });
    const tokenAccount = await tokenResponse.json().catch(() => ({}));
    if (!tokenResponse.ok) { setError(tokenAccount.error ?? "Unable to verify your Token balance."); return; }
    if (Number(tokenAccount.balance) < scanTierCatalog[scanTier].cost) {
      router.push(`/billing?reason=insufficient_tokens&tier=${scanTier}`);
      return;
    }
    setPhase("scanning"); setError(null); setResult(null); setActiveStage("validating"); setStageDetails({});
    setRepoUrl(normalizedUrl);
    setReviewed(new Set()); setFalsePositive(new Set()); setIgnored(new Map()); setReportSelection(new Set());
    const controller = new AbortController();
    setScanController(controller);
    try {
      const response = await fetch("/api/scan/github", {
        method: "POST", headers: buildTeamAuthHeaders(token, selectedTeamId, { "Content-Type": "application/json", Accept: "text/event-stream", "Idempotency-Key": `repo-scan:${crypto.randomUUID()}` }),
        body: JSON.stringify({ repoUrl: normalizedUrl, providerToken: data.session?.provider_token ?? null, scanTier, options: { scanScope: analysisScope } }),
        signal: controller.signal,
      });
      if (response.status === 402) {
        router.push(`/billing?reason=insufficient_tokens&tier=${scanTier}`);
        return;
      }
      if (!response.ok || !response.body) throw new Error((await response.json().catch(() => ({}))).error ?? "Unable to start scan.");
      const reader = response.body.getReader(); const decoder = new TextDecoder(); let buffer = "";
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const messages = buffer.split("\n\n"); buffer = messages.pop() ?? "";
        for (const message of messages) {
          const event = message.match(/^event: (.+)$/m)?.[1]; const raw = message.match(/^data: (.+)$/m)?.[1];
          if (!event || !raw) continue;
          const payload = JSON.parse(raw) as { stage?: Stage; detail?: string; error?: string; balance?: number; refunded?: boolean } | ScanResult;
          if (event === "progress" && "stage" in payload && payload.stage) { setActiveStage(payload.stage); setStageDetails((previous) => ({ ...previous, [payload.stage!]: payload.detail ?? "" })); }
          if (event === "complete") {
            const completed = payload as ScanResult & { tokenCharge?: { balance?: number } };
            setResult(completed);
            setReportSelection(new Set(completed.findings.map(findingKey)));
            setFinalTokenBalance(typeof completed.tokenCharge?.balance === "number" ? completed.tokenCharge.balance : null);
            setPhase("done"); setActiveStage("recommendations"); window.dispatchEvent(new Event("tokens:updated"));
          }
          if (event === "error") {
            if ("balance" in payload && typeof payload.balance === "number") setFinalTokenBalance(payload.balance);
            throw new Error("error" in payload ? `${payload.error}${payload.refunded ? ` Tokens were refunded; balance: ${Number(payload.balance).toLocaleString()} Tokens.` : ""}` : "Scan failed.");
          }
        }
      }
    } catch (cause) {
      setError(cause instanceof DOMException && cause.name === "AbortError" ? "Scan cancelled. No result was saved." : cause instanceof Error ? cause.message : "Scan failed.");
      setPhase("error");
    } finally {
      setScanController(null);
    }
  };

  const scanFile = async (file: File) => {
    setPhase("scanning"); setError(null); setResult(null); setFinalTokenBalance(null); setActiveStage("reading");
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("Sign in to scan a file.");
      setActiveStage("analyzing");
      const body = new FormData();
      body.append("file", file);
      const response = await fetch("/api/scan/file", {
        method: "POST",
        headers: buildTeamAuthHeaders(token, selectedTeamId),
        body,
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? "Unable to scan file.");
      setResult(payload as ScanResult);
      setPhase("done");
      setActiveStage("recommendations");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to scan file.");
      setPhase("error");
    }
  };

  const findings = (result?.findings ?? []).filter((finding) => {
    const text = `${finding.message} ${finding.file} ${finding.type}`.toLowerCase();
    return (severity === "all" || finding.severity === severity) && text.includes(query.toLowerCase());
  }).sort((a, b) => sort === "severity" ? severityRank[b.severity] - severityRank[a.severity] : a.file.localeCompare(b.file) || a.line - b.line);
  const counts = (result?.findings ?? []).reduce<Record<Severity, number>>((all, finding) => ({ ...all, [finding.severity]: all[finding.severity] + 1 }), { critical: 0, high: 0, medium: 0, low: 0 });
  const score = result?.findings.length ? Math.max(...result.findings.map((finding) => finding.score)) : 0;
  const categoryCount = (category: "code" | "secrets") => result?.findings.filter((finding) => finding.category === category).length ?? 0;
  const severityChart = (["critical", "high", "medium", "low"] as Severity[]).map((level) => ({ name: level, value: counts[level], color: { critical: "#fb7185", high: "#fb923c", medium: "#fbbf24", low: "#38bdf8" }[level] }));
  const activeStageIndex = activeStage ? stages.findIndex((stage) => stage.id === activeStage) : 0;
  const progress = phase === "done" ? 100 : Math.max(8, Math.round(((activeStageIndex + 0.5) / stages.length) * 100));
  const reportRepo = result?.scan?.repo ?? result?.repoUrl.replace(/^https:\/\/github\.com\//, "").replace(/\/$/, "") ?? "repository";
  const suggestionHref = (index: number) => `/reports/${encodeURIComponent(reportRepo)}/ai-fixes/${index}`;
  const actions = useMemo<ScanAction[]>(() => result ? [
    ...(result.sourceType === "file" ? [] : [{ id: "intelligence", label: "Open repository summary", description: "Jump to the AI summary and priorities", icon: scanActionIcons.intelligence, run: () => document.getElementById("repository-intelligence")?.scrollIntoView({ behavior: "smooth" }) }]),
    { id: "cloud", label: result.sourceType === "file" ? "Open file details" : "Explore technologies", description: result.sourceType === "file" ? "View the detected language and file details" : "View languages, frameworks, and dependencies", icon: scanActionIcons.cloud, run: () => document.getElementById("technology-cloud")?.scrollIntoView({ behavior: "smooth" }) },
    { id: "high", label: "Show high-priority findings", description: "Filter findings to critical or high severity", icon: scanActionIcons.filter, run: () => { setSeverity(counts.critical ? "critical" : "high"); document.getElementById("findings")?.scrollIntoView({ behavior: "smooth" }); } },
    { id: "export", label: "Export JSON report", description: "Download the complete result for CI or review", icon: scanActionIcons.export, run: () => download("krythiq-scan.json", JSON.stringify(result, null, 2), "application/json") },
    { id: "reset", label: "Start another scan", description: "Clear this result and return to the scan input", icon: scanActionIcons.reset, run: () => { setResult(null); setPhase("idle"); window.scrollTo({ top: 0, behavior: "smooth" }); } },
  ] : [], [counts.critical, result]);

  return <main className="mx-auto max-w-7xl space-y-6 pb-12">
    <MultiStepLoaderDemo loading={phase === "scanning"} />
    <section className="overflow-hidden rounded-3xl border border-border bg-[radial-gradient(circle_at_10%_0%,rgba(14,165,233,.16),transparent_32%),radial-gradient(circle_at_90%_10%,rgba(168,85,247,.12),transparent_28%),var(--card)] p-6 sm:p-8">
      <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div><h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Find the risks worth fixing first.</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Krythiq safely reviews supported files from GitHub. Your login details are never included in a scan.</p></div>{result ? <div className="flex flex-wrap gap-2">{result.sourceType !== "file" ? <LinkedInScanShare repository={result.scan?.repo ?? result.repoUrl.replace(/^https?:\/\/github\.com\//, "")} severity={result.findings[0]?.severity ?? "low"} issues={result.totalFindings} score={score} /> : null}<Button variant="outline" onClick={() => { setResult(null); setPhase("idle"); }}><RotateCw />New scan</Button></div> : null}</div>
      <Tabs value={scanMode} onValueChange={(value) => setScanMode(value as "repository" | "file")} className="mt-7">
        <TabsList className="grid w-full max-w-sm grid-cols-2"><TabsTrigger value="repository"><FolderGit2 /> Repository</TabsTrigger><TabsTrigger value="file"><FileCode2 /> Single file</TabsTrigger></TabsList>
        <TabsContent value="repository" className="mt-5">
          {githubStatus !== "loading" && githubStatus !== "connected" ? (
            <div className="mb-5 flex flex-col gap-3 rounded-xl border border-sky-500/25 bg-sky-500/10 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium">{githubStatus === "expired" ? "Reconnect GitHub to scan private repositories" : "Connect GitHub for full repository access"}</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">Public repositories can be scanned now. GitHub access adds private repositories and a higher authenticated API limit.</p>
              </div>
              <Button type="button" onClick={() => void connectGitHub()} disabled={connectingGitHub} className="shrink-0">
                {connectingGitHub ? <LoaderCircle className="animate-spin" /> : <Github />}
                {connectingGitHub ? "Connecting…" : githubStatus === "expired" ? "Reconnect GitHub" : "Connect GitHub"}
              </Button>
            </div>
          ) : null}
          <fieldset className="mb-5">
            <legend className="text-sm font-medium">Analysis focus</legend>
            <p className="mt-1 text-xs text-muted-foreground">
              Choose which repository surface is loaded and reviewed. The token
              cost is still controlled by scan coverage.
            </p>
            <Tabs
              value={analysisScope}
              onValueChange={(value) =>
                setAnalysisScope(value as ScanScope)
              }
              className="mt-3"
            >
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="frontend">Frontend</TabsTrigger>
                <TabsTrigger value="backend">Backend</TabsTrigger>
                <TabsTrigger value="all">All</TabsTrigger>
              </TabsList>
            </Tabs>
          </fieldset>
          <fieldset className="mb-5">
            <legend className="text-sm font-medium">Scan coverage</legend>
            <div className="mt-2 max-w-xs">
              <Combobox
                items={Object.keys(scanTierCatalog)}
                value={scanTier}
                onValueChange={(value) => {
                  if (value) setScanTier(value as ScanTier);
                }}
                disabled={phase === "scanning"}
              >
                <ComboboxInput
                  className="h-9 w-full"
                  aria-label="Scan coverage"
                />
                <ComboboxContent>
                  <ComboboxEmpty>No coverage tier found.</ComboboxEmpty>
                  <ComboboxList>
                    {(Object.entries(scanTierCatalog) as Array<[ScanTier, (typeof scanTierCatalog)[ScanTier]]>).map(([tier, details]) => (
                      <ComboboxItem key={tier} value={tier}>
                        {details.label} · {details.cost} Tokens
                      </ComboboxItem>
                    ))}
                  </ComboboxList>
                </ComboboxContent>
              </Combobox>
            </div>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              {(Object.entries(scanTierCatalog) as Array<[ScanTier, (typeof scanTierCatalog)[ScanTier]]>).map(([tier, details]) => (
                <Card key={tier} className={scanTier === tier ? "border-sky-500/50 bg-sky-500/5" : "bg-background/50"}>
                  <CardContent className="relative h-full p-3 pr-9">
                    <span className="flex items-center justify-between gap-2 text-sm font-medium"><span>{details.label}</span><span>{details.cost} Tokens</span></span>
                    <span className="mt-2 block text-xs leading-5 text-muted-foreground">{scanCheckpointsForScope(analysisScope).slice(0, tier === "high" ? 4 : 3).map((check) => `✓ ${check}`).join(" · ")}</span>
                  <span className="absolute right-3 top-3">
                    <HelpTooltip side="bottom" contentClassName="max-h-[70vh] max-w-lg overflow-y-auto p-4">
                      <span className="block font-medium">{details.label} checkpoints:</span>
                      <span className="mt-2 block whitespace-pre-line">{scanCheckpointsForScope(analysisScope).map((check) => `• ${check}`).join("\n")}</span>
                    </HelpTooltip>
                  </span>
                  </CardContent>
                </Card>
              ))}
            </div>
          </fieldset>
          <div className="grid gap-3 lg:grid-cols-[1fr_auto]"><div><label htmlFor="repo-url" className="mb-2 block text-sm font-medium">GitHub repository</label><div className="relative"><FolderGit2 className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input id="repo-url" value={repoUrl} onChange={(event) => setRepoUrl(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && phase !== "scanning") void startScan(); }} placeholder="owner/repository or GitHub URL" disabled={phase === "scanning"} className="h-9 pl-9" aria-describedby="repo-help" autoCapitalize="none" autoCorrect="off" spellCheck={false} /></div><p id="repo-help" className="mt-2 text-xs text-muted-foreground">Paste a public GitHub URL or owner/repository. Krythiq uses read-only API access and does not execute repository code.</p></div>{phase === "scanning" ? <Button size="lg" variant="outline" onClick={() => scanController?.abort()} className="self-end"><CircleStop /> Cancel</Button> : <Button size="lg" onClick={startScan} className="self-end"><ShieldAlert /> {result ? "Rescan" : "Start scan"} · {scanTierCatalog[scanTier].cost} Tokens</Button>}</div>
        </TabsContent>
        <TabsContent value="file" className="mt-5">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,420px)_1fr] lg:items-center">
            <FileUpload uploadDelay={450} maxFileSize={1024 * 1024} acceptedFileTypes={[".ts", ".tsx", ".js", ".jsx", ".py", ".go", ".rs", ".java", ".cs", ".php", ".rb", ".sh", ".yml", ".yaml", ".json", ".txt"]} validateFile={(file) => /\.(?:tsx?|jsx?|py|go|rs|java|cs|php|rb|sh|ya?ml|json|txt)$/i.test(file.name) ? null : { code: "UNSUPPORTED_FILE", message: "Choose a supported source, config, or manifest file." }} onUploadSuccess={(file) => void scanFile(file)} onUploadError={(uploadError) => setError(uploadError.message)} />
            <div className="rounded-2xl border border-border bg-background/45 p-5"><p className="font-medium">Private, focused file review</p><p className="mt-2 text-sm leading-6 text-muted-foreground">Upload one code, configuration, or manifest file up to 1 MB. The scan is free, runs only for this request, and points to the exact lines that need attention.</p></div>
          </div>
        </TabsContent>
      </Tabs>
      {error && <div role="alert" className="mt-5 flex gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"><AlertCircle className="h-4 w-4 shrink-0" />{error}</div>}
    </section>

    {phase === "scanning" && <Card><CardHeader><div className="flex items-center justify-between gap-4"><CardTitle className="flex items-center gap-2"><LoaderCircle className="h-4 w-4 animate-spin text-sky-400" /> Scan in progress</CardTitle><span className="text-sm font-medium text-muted-foreground">{progress}%</span></div><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-sky-400 transition-[width] duration-500" style={{ width: `${progress}%` }} /></div></CardHeader><CardContent className="space-y-1">{stages.map((stage, index) => { const reached = activeStage ? stages.findIndex((item) => item.id === activeStage) >= index : false; const current = activeStage === stage.id; return <div key={stage.id} className={`flex gap-3 rounded-xl p-3 ${current ? "bg-sky-500/5" : ""}`}><div className="mt-0.5">{current ? <LoaderCircle className="h-4 w-4 animate-spin text-sky-400" /> : reached ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <div className="h-4 w-4 rounded-full border border-muted-foreground/40" />}</div><div><p className={reached ? "text-sm font-medium" : "text-sm text-muted-foreground"}>{stage.title}</p><p className="mt-0.5 text-xs text-muted-foreground">{stageDetails[stage.id] ?? stage.fallback}</p></div></div>; })}</CardContent></Card>}
    {phase === "done" && finalTokenBalance !== null ? <div role="status" className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-500">Scan completed. Final balance: {finalTokenBalance.toLocaleString()} Tokens.</div> : null}

    {phase === "scanning" && <div className="grid gap-4 md:grid-cols-4">{Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-28" />)}</div>}

    {result && <section className="space-y-6">
      <ActionSearchBar actions={actions} />
      <BentoGrid className="auto-rows-[8rem] grid-cols-1 gap-4 md:grid-cols-4"><Metric className="md:col-span-2 md:row-span-2" title="Overall risk" value={`${score}/100`} detail={score >= 75 ? "Needs attention" : score >= 55 ? "Review recommended" : "Lower observed risk"} /><Metric className="md:col-span-2" title="Total findings" value={String(result.totalFindings)} detail="Static checks completed" /><Metric title="Code issues" value={String(categoryCount("code"))} detail="Risky-code rules" /><Metric title="Secret exposure" value={String(categoryCount("secrets"))} detail="Credential-pattern rules" /></BentoGrid>
      <BentoGrid className="auto-rows-auto grid-cols-1 gap-3 md:grid-cols-6"><BentoPanel className="md:col-span-3 md:row-span-2"><h2 className="text-lg font-semibold">{result.sourceType === "file" ? "File overview" : "Repository overview"}</h2><p className="mt-3 text-sm leading-6 text-muted-foreground">{result.profile.metadata.description ?? "No description is available."}</p>{result.profile.manifests.length > 0 && <div className="mt-5 flex flex-wrap gap-2">{result.profile.manifests.map((manifest) => <Badge key={manifest} variant="outline">{manifest}</Badge>)}</div>}</BentoPanel><Coverage label={result.sourceType === "file" ? "File scanned" : "Source files scanned"} value={result.profile.metrics.scannedFiles.toLocaleString()} detail={result.sourceType === "file" ? result.repoUrl : `${result.profile.metrics.repositoryFiles.toLocaleString()} files in repository tree`} /><Coverage label="Lines analyzed" value={result.profile.metrics.scannedLines.toLocaleString()} detail={formatBytes(result.profile.metrics.scannedBytes)} />{result.sourceType === "file" ? <Coverage className="md:col-span-2" label="Detected language" value={result.profile.languages[0]?.name ?? "Text"} detail="Processed only for this request" /> : <><Coverage label="Directories" value={result.profile.metrics.directories.toLocaleString()} detail={`Default branch: ${result.profile.metadata.defaultBranch}`} /><Coverage label="GitHub activity" value={`${result.profile.metadata.stars} stars`} detail={`${result.profile.metadata.forks} forks · ${result.profile.metadata.openIssues} open issues`} /><Coverage className="md:col-span-2" label="Visibility" value={result.profile.metadata.visibility} detail={result.profile.metadata.pushedAt ? `Pushed ${new Date(result.profile.metadata.pushedAt).toLocaleDateString()}` : "Push date unavailable"} /></>}</BentoGrid>

      {result.aiReview ? (
        <div id="ai-ui-review" className="space-y-4">
          <BentoGrid className="auto-rows-auto grid-cols-1 gap-3 md:grid-cols-6">
            <BentoPanel className="border-fuchsia-500/25 bg-[radial-gradient(circle_at_top_right,rgba(217,70,239,.10),transparent_38%),var(--card)] md:col-span-3 md:row-span-2">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-fuchsia-500">AI code quality check</p>
                  <h2 className="mt-2 text-lg font-semibold">{result.aiReview.scope === "backend" ? "Backend quality and security" : result.aiReview.scope === "all" ? "Full-stack quality review" : "Design quality, not authorship"}</h2>
                </div>
                {result.aiReview.vibeCodedPercent !== null ? <Badge variant="outline">{result.aiReview.vibeCodedPercent}% needs review</Badge> : null}
              </div>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{result.aiReview.scope === "backend" ? "Checks sampled server files for authentication boundaries, validation, data access, error leakage, dependencies, performance, and maintainability." : result.aiReview.scope === "all" ? "Checks sampled frontend and backend files for UI quality, security boundaries, cross-stack consistency, accessibility, validation, and maintainability." : "Checks sampled frontend files for gratuitous gradients, glow-heavy surfaces, repeated rounded cards, weak hierarchy, inconsistent spacing, custom controls, and other brittle UI patterns."}</p>
              <p className="mt-4 text-xs leading-5 text-muted-foreground">This score is a guide based on the code that was scanned. It does not claim who or what wrote it.</p>
            </BentoPanel>
            {result.aiReview.suggestions.map((suggestion, index) => ({ suggestion, index })).filter(({ suggestion }) => suggestion.replacement).slice(0, 3).map(({ suggestion, index }) => (
              <Link key={`alternative:${suggestion.file}:${suggestion.title}`} href={suggestionHref(index)} className="group md:col-span-3">
              <BentoPanel className="h-full transition group-hover:border-fuchsia-500/40 group-hover:bg-muted/20">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="text-sm font-medium">{suggestion.title}</p>
                  <Badge variant="outline" className="text-emerald-500">{suggestion.replacement}</Badge>
                </div>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">{suggestion.reason}</p>
                {suggestion.file ? <p className="mt-3 truncate text-xs text-muted-foreground" title={suggestion.file}>Open {suggestion.file}{suggestion.line ? ` at line ${suggestion.line}` : ""} →</p> : <p className="mt-3 text-xs text-fuchsia-500">See exactly what to change →</p>}
              </BentoPanel>
              </Link>
            ))}
            {result.aiReview.suggestions.every((suggestion) => !suggestion.replacement) ? (
              <BentoPanel className="md:col-span-3"><p className="text-sm font-medium">No component swap recommended</p><p className="mt-2 text-xs leading-5 text-muted-foreground">The sampled files did not contain enough evidence for a responsible open-source alternative.</p></BentoPanel>
            ) : null}
          </BentoGrid>
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle>{result.aiReview.scope === "backend" ? "Backend AI scan" : result.aiReview.scope === "all" ? "Full-stack AI scan" : "Frontend AI scan"}</CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">
                  Groq analysis · {scanTierCatalog[scanTier].label}
                </p>
              </div>
              {result.aiReview.vibeCodedPercent !== null ? (
                <Badge variant="outline">
                  {result.aiReview.vibeCodedPercent}% AI-pattern estimate
                </Badge>
              ) : null}
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="overview">
              <TabsList className={`grid w-full ${result.aiReview.scope === "backend" ? "grid-cols-2" : "grid-cols-4"}`}>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                {result.aiReview.scope !== "backend" ? <TabsTrigger value="components">Components</TabsTrigger> : null}
                {result.aiReview.scope !== "backend" ? <TabsTrigger value="a11y">Accessibility</TabsTrigger> : null}
                <TabsTrigger value="suggestions">Suggestions</TabsTrigger>
              </TabsList>
              <TabsContent value="overview" className="space-y-5 pt-3">
                <p className="text-sm leading-6 text-muted-foreground">{result.aiReview.summary}</p>
                <BentoGrid className="auto-rows-auto grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <Metric title={result.aiReview.scope === "backend" ? "Overall code quality" : "Overall UI quality"} value={`${result.aiReview.scores.overall}/100`} detail={result.aiReview.scope === "backend" ? "Server-side quality" : "Frontend quality"} />
                  <Metric title="Consistency" value={`${result.aiReview.scores.consistency}/100`} detail={result.aiReview.scope === "backend" ? "Patterns and maintainability" : "Spacing, type, and tokens"} />
                  <Metric title={result.aiReview.scope === "backend" ? "Performance" : "Responsive"} value={`${result.aiReview.scores.responsive}/100`} detail={result.aiReview.scope === "backend" ? "Runtime and data access" : "Viewport patterns"} />
                  <Metric title={result.aiReview.scope === "backend" ? "Architecture" : "Component usage"} value={`${result.aiReview.scores.componentUsage}/100`} detail={result.aiReview.scope === "backend" ? "Boundaries and reuse" : "Open-source component adoption"} />
                  <Metric title={result.aiReview.scope === "backend" ? "Validation" : "Accessibility"} value={`${result.aiReview.scores.accessibility}/100`} detail={result.aiReview.scope === "backend" ? "Inputs and authorization" : "Semantic UI basics"} />
                  <Metric title={result.aiReview.scope === "backend" ? "Security foundations" : "Design system"} value={`${result.aiReview.scores.designSystem}/100`} detail={result.aiReview.scope === "backend" ? "Secure reusable primitives" : "Reusable foundations"} />
                </BentoGrid>
                <Card className="bg-muted/20"><CardContent className="p-4"><p className="text-sm font-medium">{result.aiReview.scope === "backend" ? "Why these changes matter" : "Why this may feel AI-generated"}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{result.aiReview.reasoning}</p></CardContent></Card>
              </TabsContent>
              {(["components", "a11y"] as const).map((category) => (
                <TabsContent key={category} value={category} className="pt-3">
                  <div className="space-y-2">
                    {result.aiReview!.suggestions.map((suggestion, index) => ({ suggestion, index })).filter(({ suggestion }) => suggestion.category === category).map(({ suggestion, index }) => (
                      <Card key={`${suggestion.file}:${suggestion.title}`} className="transition hover:border-fuchsia-500/30">
                        <CardContent className="p-4">
                          <div className="flex flex-wrap items-start justify-between gap-2"><p className="text-sm font-medium">{suggestion.title}</p>{suggestion.replacement ? <Badge variant="outline">{suggestion.replacement}</Badge> : null}</div>
                          <p className="mt-1 text-xs leading-5 text-muted-foreground">{suggestion.reason}</p>
                          {suggestion.evidence ? <p className="mt-2 rounded-md bg-muted/40 p-2 font-mono text-[11px] text-muted-foreground">{suggestion.evidence}</p> : null}
                          {suggestion.file ? <p className="mt-2 font-mono text-[11px] text-muted-foreground">{suggestion.file}</p> : null}
                          <Button asChild variant="link" size="sm" className="mt-2 h-auto px-0"><Link href={suggestionHref(index)}>Show me what to replace <ChevronRight /></Link></Button>
                        </CardContent>
                      </Card>
                    ))}
                    {result.aiReview!.suggestions.every((suggestion) => suggestion.category !== category) ? <p className="py-8 text-center text-sm text-muted-foreground">No {category === "a11y" ? "accessibility" : "component"} issues were returned from the sampled files.</p> : null}
                  </div>
                </TabsContent>
              ))}
              <TabsContent value="suggestions" className="pt-3">
                <AnimatedList delay={120} className="items-stretch gap-2" aria-label="Frontend improvement suggestions">
                  {result.aiReview.suggestions.map((suggestion, index) => (
                    <Card key={`${suggestion.file}:${suggestion.title}`}>
                      <CardContent className="p-4">
                        <div className="flex flex-wrap items-start justify-between gap-2"><div className="flex items-center gap-2"><Badge variant="subtle" className="capitalize">{suggestion.category}</Badge><p className="text-sm font-medium">{suggestion.title}</p></div>{suggestion.replacement ? <Badge variant="outline">{suggestion.replacement}</Badge> : null}</div>
                        <p className="mt-2 text-xs leading-5 text-muted-foreground">{suggestion.reason}</p>
                        {suggestion.file ? <p className="mt-2 font-mono text-[11px] text-muted-foreground">{suggestion.file}</p> : null}
                        <Button asChild variant="link" size="sm" className="mt-2 h-auto px-0"><Link href={suggestionHref(index)}>Open exact fix <ChevronRight /></Link></Button>
                      </CardContent>
                    </Card>
                  ))}
                </AnimatedList>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
        </div>
      ) : result.sourceType !== "file" && result.scanScope === "frontend" ? (
        <Card>
          <CardContent className="p-5">
            <p className="text-sm font-medium">AI UI review unavailable</p>
            <p className="mt-1 text-xs text-muted-foreground">
              The token-charged static scan completed normally. Enable AI usage
              in Settings and configure the server-only GROQ_API_KEY to add the
              frontend UI review.
            </p>
          </CardContent>
        </Card>
      ) : null}

      {result.intelligence ? <Card id="repository-intelligence" className="border-violet-500/30 bg-[radial-gradient(circle_at_top_right,rgba(139,92,246,.12),transparent_35%),var(--card)]"><CardHeader><div className="flex items-center justify-between gap-3"><CardTitle>Mistral repository intelligence</CardTitle><Badge className="border-violet-500/30 bg-violet-500/10 text-violet-300">AI analysis</Badge></div></CardHeader><CardContent className="space-y-5"><p className="text-sm leading-6">{result.intelligence.summary}</p><div className="grid gap-3 md:grid-cols-2"><Detail label="Architecture" value={result.intelligence.architecture} /><Detail label="Security posture" value={result.intelligence.securityPosture} /></div><div><p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Priorities</p><div className="mt-2 grid gap-2">{result.intelligence.priorities.map((priority) => <div key={priority.title} className="rounded-xl border border-border bg-background/60 p-3"><div className="flex items-center justify-between gap-3"><p className="text-sm font-medium">{priority.title}</p><Badge variant="outline" className="capitalize">{priority.effort} effort</Badge></div><p className="mt-1 text-xs leading-5 text-muted-foreground">{priority.reason}</p></div>)}</div></div>{result.intelligence.observations.length > 0 && <div><p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Observations</p><ul className="mt-2 grid gap-2 text-sm text-muted-foreground md:grid-cols-2">{result.intelligence.observations.map((item) => <li key={item} className="rounded-lg bg-muted/30 p-3">{item}</li>)}</ul></div>}</CardContent></Card> : result.scanScope !== "frontend" ? <Card><CardContent className="p-5"><p className="text-sm font-medium">AI repository intelligence unavailable</p><p className="mt-1 text-xs text-muted-foreground">The static scan completed normally. Configure MISTRAL_API_KEY in production to add bounded architecture and remediation analysis.</p></CardContent></Card> : null}

      <TechnologyCloud languages={result.profile.languages.map((language) => language.name)} technologies={result.profile.technologies ?? []} dependencies={result.profile.dependencies ?? []} />

      <BentoGrid className="auto-rows-auto grid-cols-1 gap-4 lg:grid-cols-6">
        <BentoPanel className="lg:col-span-4"><h2 className="text-base font-semibold">Language composition</h2><div className="mt-4 h-72"><ResponsiveContainer width="100%" height="100%"><BarChart data={result.profile.languages.slice(0, 8)} layout="vertical" margin={{ left: 8, right: 16 }}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} /><XAxis type="number" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} /><YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} /><Tooltip formatter={(value, name) => [name === "percent" ? `${value}%` : value, name === "percent" ? "GitHub bytes" : name]} contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} /><Bar dataKey="percent" fill="#38bdf8" radius={[0, 5, 5, 0]} /></BarChart></ResponsiveContainer></div></BentoPanel>
        <BentoPanel className="lg:col-span-2"><h2 className="text-base font-semibold">File types</h2><div className="mt-4 h-72"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={result.profile.fileTypes.slice(0, 8)} dataKey="lines" nameKey="name" innerRadius={54} outerRadius={88} paddingAngle={3}>{result.profile.fileTypes.slice(0, 8).map((entry, index) => <Cell key={entry.name} fill={["#38bdf8", "#a78bfa", "#34d399", "#fbbf24", "#fb7185", "#60a5fa", "#f97316", "#94a3b8"][index]} />)}</Pie><Tooltip formatter={(value, name) => [Number(value).toLocaleString(), `${name} lines`]} contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} /></PieChart></ResponsiveContainer></div></BentoPanel>
        <BentoPanel className="lg:col-span-2"><h2 className="text-base font-semibold">Severity distribution</h2><div className="mt-4 h-64"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={severityChart} dataKey="value" nameKey="name" innerRadius={48} outerRadius={76} paddingAngle={4}>{severityChart.map((entry) => <Cell key={entry.name} fill={entry.color} />)}</Pie><Tooltip formatter={(value, name) => [value, String(name).toUpperCase()]} contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} /></PieChart></ResponsiveContainer></div></BentoPanel>
        <BentoPanel className="lg:col-span-4"><h2 className="text-base font-semibold">Largest analyzed files</h2><div className="mt-4 grid gap-2 sm:grid-cols-2">{result.profile.largestFiles.slice(0, 6).map((file) => <div key={file.path} className="flex items-center justify-between gap-4 rounded-lg border border-border bg-muted/20 p-3"><div className="min-w-0"><p className="truncate text-sm font-medium">{file.path}</p><p className="mt-0.5 text-xs text-muted-foreground">{file.lines.toLocaleString()} lines</p></div><span className="shrink-0 font-mono text-xs text-muted-foreground">{formatBytes(file.bytes)}</span></div>)}</div></BentoPanel>
        <Coverage className="lg:col-span-2" label="Source analysis" value="Assessed" detail={`${result.profile.metrics.scannedFiles.toLocaleString()} supported files`} /><Coverage label="Repository structure" value="Assessed" detail="Tree, languages, manifests, and file sizes" /><Coverage label="Dependency advisories" value="Not assessed" detail="No vulnerability registry comparison" /><Coverage className="lg:col-span-2" label="Supply chain & licenses" value="Not assessed" detail="No SBOM or license engine" />
      </BentoGrid>
      {result.sourceType !== "file" && result.scanScope !== "frontend" && <SystemDesignOverview result={result.systemDesign} docsHref="/documentation/system-design" />}
      <div id="findings" className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div><h2 className="text-xl font-semibold">Findings</h2><p className="mt-1 text-sm text-muted-foreground">{result.totalFindings === 0 ? "No high-confidence static findings were detected in the supported files." : result.scan?.id ? `${reportSelection.size} of ${result.totalFindings} findings saved to this report${savingReportSelection ? " · Saving…" : ""}` : `${result.totalFindings} findings detected.`}</p></div><div className="flex flex-wrap items-center gap-3">{result.scan?.id && result.totalFindings > 0 ? <label className="flex cursor-pointer items-center gap-2 text-sm"><Checkbox checked={reportSelection.size === result.totalFindings} onCheckedChange={(checked) => void saveReportSelection(checked ? new Set(result.findings.map(findingKey)) : new Set())} disabled={savingReportSelection} /><span>Save all to report</span></label> : null}<Button variant="outline" size="sm" onClick={() => download("krythiq-findings.json", JSON.stringify(result, null, 2), "application/json")}><Download /> JSON</Button><Button variant="outline" size="sm" onClick={() => download("krythiq-findings.csv", ["severity,category,file,line,type,message", ...result.findings.map((f) => [f.severity, f.category ?? "code", f.file, f.line, f.type, f.message].map(csvCell).join(","))].join("\n"), "text/csv")}><Download /> CSV</Button></div></div>
      <BentoPanel><div className="grid gap-3 md:grid-cols-[1fr_160px_160px]"><div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search file, rule, or message" className="pl-9" /></div><select value={severity} onChange={(event) => setSeverity(event.target.value as "all" | Severity)} className="h-8 rounded-lg border border-input bg-background px-2 text-sm"><option value="all">All severities</option>{(["critical", "high", "medium", "low"] as Severity[]).map((level) => <option key={level} value={level}>{level} ({counts[level]})</option>)}</select><select value={sort} onChange={(event) => setSort(event.target.value as "severity" | "path")} className="h-8 rounded-lg border border-input bg-background px-2 text-sm"><option value="severity">Sort by severity</option><option value="path">Sort by path</option></select></div></BentoPanel>
      <div className="space-y-3">
        {findings.length === 0 ? <Card className={result.totalFindings === 0 ? "border-emerald-500/20 bg-emerald-500/5" : ""}><CardContent className="p-10 text-center">{result.totalFindings === 0 ? <CheckCircle2 className="mx-auto h-7 w-7 text-emerald-400" /> : <Filter className="mx-auto h-6 w-6 text-muted-foreground" />}<p className="mt-3 font-medium">{result.totalFindings === 0 ? "Static scan completed cleanly" : "No matching findings"}</p><p className="mx-auto mt-1 max-w-lg text-sm text-muted-foreground">{result.totalFindings === 0 ? "No supported rule matched. This is a useful signal, not a guarantee: runtime behavior, dependencies, and supply-chain risk were not assessed." : "Try clearing the search or choosing another severity."}</p></CardContent></Card> : findings.map((finding) => {
          const key = findingKey(finding); const isExpanded = expanded === key; const isIgnored = ignored.has(key);
          return <Card key={key} className={isIgnored ? "opacity-60" : ""}><CardContent className="p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
              {result.scan?.id ? <Checkbox checked={reportSelection.has(key)} onCheckedChange={(checked) => { const next = new Set(reportSelection); if (checked) next.add(key); else next.delete(key); void saveReportSelection(next); }} disabled={savingReportSelection} aria-label={`${reportSelection.has(key) ? "Remove" : "Add"} this finding ${reportSelection.has(key) ? "from" : "to"} the saved report`} className="mt-0.5" /> : null}
              <button className="flex min-w-0 flex-1 gap-3 text-left" onClick={() => setExpanded(isExpanded ? null : key)} aria-expanded={isExpanded}>
                <span className="mt-0.5">{isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</span>
                <span className="min-w-0"><span className="flex flex-wrap items-center gap-2"><Badge className={severityClass(finding.severity)}>{finding.severity}</Badge><Badge variant="outline">{finding.category === "secrets" ? "Secret exposure" : "Code issue"}</Badge>{isIgnored && <Badge variant="outline">Ignored</Badge>}</span><span className="mt-2 block font-medium">{finding.message}</span><span className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><FileCode2 className="h-3.5 w-3.5" /> {finding.file}:{finding.line} · {finding.type}</span></span>
              </button>
              <div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => { void navigator.clipboard.writeText(`${finding.file}:${finding.line}\n${finding.suggestion ?? finding.message}`); notify("Remediation copied."); }}><Clipboard /> Copy fix</Button>{isIgnored ? <Button size="sm" variant="outline" onClick={() => { setIgnored((current) => { const next = new Map(current); next.delete(key); return next; }); void saveFindingStatus(key, "open"); }}><RotateCw /> Reopen</Button> : <><Button size="sm" variant={reviewed.has(key) ? "secondary" : "outline"} onClick={() => { setReviewed((current) => new Set(current).add(key)); void saveFindingStatus(key, "reviewed"); }}>{reviewed.has(key) ? "Reviewed" : "Mark reviewed"}</Button><Button size="sm" variant={falsePositive.has(key) ? "secondary" : "outline"} onClick={() => { setFalsePositive((current) => new Set(current).add(key)); void saveFindingStatus(key, "false_positive"); }}>False positive</Button><Button size="sm" variant="outline" onClick={() => { setIgnoreTarget(key); setIgnoreReason(""); }}>Ignore</Button></>}</div>
            </div>
            {isExpanded && <div className="mt-4 grid gap-3 border-t border-border pt-4 md:grid-cols-2"><Detail label="Impact" value={finding.severity === "critical" || finding.severity === "high" ? "May expose application behavior or sensitive data if reachable." : "Requires review in its runtime context."} /><Detail label="Recommended fix" value={finding.suggestion ?? "Review and replace the flagged pattern."} /><Detail label="Advisory ID" value={finding.advisoryId ?? "Not available"} /><Detail label="Confidence" value={finding.confidence ?? "Not available"} /><div className="md:col-span-2"><Detail label="Technical details" value={finding.technicalDetails ?? finding.snippet ?? "No additional technical details are available."} /></div></div>}
          </CardContent></Card>;
        })}
      </div>
    </section>}
    {ignoreTarget && <div role="dialog" aria-modal="true" aria-labelledby="ignore-title" className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4"><div className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-2xl"><div className="flex items-start justify-between"><div><h2 id="ignore-title" className="font-semibold">Ignore this finding</h2><p className="mt-1 text-sm text-muted-foreground">A reason is required and will be saved to your finding review history.</p></div><Button variant="ghost" size="icon-sm" aria-label="Close" onClick={() => setIgnoreTarget(null)}><X /></Button></div><Textarea value={ignoreReason} onChange={(event) => setIgnoreReason(event.target.value)} placeholder="Why is this finding acceptable?" className="mt-4" /><div className="mt-4 flex justify-end gap-2"><Button variant="outline" onClick={() => setIgnoreTarget(null)}>Cancel</Button><Button disabled={!ignoreReason.trim()} onClick={() => { setIgnored((current) => new Map(current).set(ignoreTarget, ignoreReason.trim())); void saveFindingStatus(ignoreTarget, "ignored", ignoreReason.trim()); setIgnoreTarget(null); notify("Finding ignored."); }}>Ignore finding</Button></div></div></div>}
  </main>;
}

function Metric({ title, value, detail, className = "" }: { title: string; value: string; detail: string; className?: string }) { return <div className={`relative overflow-hidden rounded-2xl border border-border bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,.08),transparent_42%),var(--card)] p-5 shadow-sm ${className}`}><div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-400/40 to-transparent" /><p className="text-sm text-muted-foreground">{title}</p><p className="mt-2 text-3xl font-semibold tracking-tight">{value}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></div>; }
function BentoPanel({ children, className = "" }: { children: React.ReactNode; className?: string }) { return <div className={`relative overflow-hidden rounded-2xl border border-border bg-[radial-gradient(circle_at_top_right,rgba(139,92,246,.06),transparent_38%),var(--card)] p-5 shadow-sm ${className}`}><div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-400/30 to-transparent" />{children}</div>; }
function Coverage({ label, value, detail, className = "" }: { label: string; value: string; detail: string; className?: string }) { return <BentoPanel className={className}><p className="text-sm font-medium">{label}</p><p className="mt-3 text-sm text-muted-foreground">{value}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></BentoPanel>; }
function Detail({ label, value }: { label: string; value: string }) { return <div className="rounded-xl bg-muted/40 p-3"><p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p><p className="mt-1 whitespace-pre-wrap text-sm leading-6">{value}</p></div>; }
