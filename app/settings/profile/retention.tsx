"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertCircle, Bell, CheckCircle2, Database, FolderGit2, ScanSearch, ShieldAlert, Trash2 } from "lucide-react";

import { buildAuthHeaders } from "@/app/lib/http";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useSettings } from "./context";
import { DangerButton, SectionCard } from "./primitives";

type ClearScope = "scan_history" | "notifications" | "all";
type DataSummary = {
  totals: {
    scans: number;
    findings: number;
    averageScore: number;
    repositories: number;
    unreadNotifications: number;
    reviewedFindings: number;
  };
  activity: Array<{ date: string; scans: number; findings: number }>;
  severity: Array<{ name: string; value: number }>;
  repositories: Array<{ name: string; scans: number; findings: number }>;
  recentScans: Array<{
    repo: string;
    created_at: string;
    severity: string;
    issues: number;
    score: number;
  }>;
};

const severityColors: Record<string, string> = {
  critical: "#f43f5e",
  high: "#f97316",
  medium: "#eab308",
  low: "#0ea5e9",
};

export function RetentionSection() {
  const { accessToken, setError, setStatus } = useSettings();
  const [summary, setSummary] = useState<DataSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [clearing, setClearing] = useState<ClearScope | null>(null);
  const [confirmation, setConfirmation] = useState<
    { action: "clear"; scope: ClearScope } | { action: "delete" } | null
  >(null);

  const loadSummary = useCallback(async () => {
    if (!accessToken) return;
    const response = await fetch("/api/settings/data-summary", {
      headers: buildAuthHeaders(accessToken),
    });
    const payload = await response.json().catch(() => ({}));
    if (response.ok) setSummary(payload as DataSummary);
    else setLoadError(payload?.error ?? "Unable to load your account data.");
    setLoading(false);
  }, [accessToken]);

  useEffect(() => {
    if (!accessToken) return;
    let active = true;
    fetch("/api/settings/data-summary", { headers: buildAuthHeaders(accessToken) })
      .then(async (response) => ({ response, payload: await response.json().catch(() => ({})) }))
      .then(({ response, payload }) => {
        if (!active) return;
        if (response.ok) setSummary(payload as DataSummary);
        else setLoadError(payload?.error ?? "Unable to load your account data.");
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setLoadError("Unable to connect to your account data.");
        setLoading(false);
      });
    return () => { active = false; };
  }, [accessToken]);

  const clearData = async (scope: ClearScope) => {
    if (!accessToken) return;
    setError(null);
    setClearing(scope);
    const res = await fetch("/api/settings/clear-data", {
      method: "POST",
      headers: buildAuthHeaders(accessToken, { "Content-Type": "application/json" }),
      body: JSON.stringify({ scope }),
    });
    setClearing(null);
    if (res.ok) {
      setStatus("Your data was cleared.");
      await loadSummary();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data?.error ?? "Unable to clear data.");
    }
  };

  const deleteAccount = async () => {
    if (!accessToken) return;
    setError(null);
    const res = await fetch("/api/settings/delete-account", {
      method: "POST",
      headers: buildAuthHeaders(accessToken, { "Content-Type": "application/json" }),
    });
    if (res.ok) {
      window.location.href = "/";
      return;
    }
    const data = await res.json().catch(() => ({}));
    setError(data?.error ?? "Unable to delete account.");
  };

  if (loading) return <DataSkeleton />;

  if (loadError || !summary) {
    return (
      <SectionCard title="Your data" description="Account-scoped activity and retention controls.">
        <div role="alert" className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div><p className="font-medium">Your data could not be loaded</p><p className="mt-1 text-xs opacity-80">{loadError}</p></div>
        </div>
        <Button variant="outline" onClick={() => { setLoading(true); setLoadError(null); void loadSummary(); }}>Try again</Button>
      </SectionCard>
    );
  }

  const hasScans = summary.totals.scans > 0;

  return (
    <div className="space-y-6">
      <SectionCard title="Your data" description="Security activity for your signed-in account only.">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Metric icon={ScanSearch} label="Total scans" value={summary.totals.scans} />
          <Metric icon={ShieldAlert} label="Findings" value={summary.totals.findings} />
          <Metric icon={FolderGit2} label="Repositories" value={summary.totals.repositories} />
          <Metric icon={Database} label="Average risk score" value={`${summary.totals.averageScore}/100`} />
          <Metric icon={CheckCircle2} label="Reviewed findings" value={summary.totals.reviewedFindings} />
          <Metric icon={Bell} label="Unread notifications" value={summary.totals.unreadNotifications} />
        </div>
      </SectionCard>

      <SectionCard title="30-day activity" description="Scans and findings recorded each day.">
        <div className="h-64" aria-label="Thirty-day scan activity chart">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={summary.activity} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
              <defs>
                <linearGradient id="scanFill" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.35} /><stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} /></linearGradient>
                <linearGradient id="findingFill" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#a855f7" stopOpacity={0.25} /><stop offset="95%" stopColor="#a855f7" stopOpacity={0} /></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="date" tickFormatter={(value) => new Date(`${value}T00:00:00Z`).toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" })} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} interval={6} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
              <Area type="monotone" dataKey="findings" stroke="#a855f7" fill="url(#findingFill)" strokeWidth={2} />
              <Area type="monotone" dataKey="scans" stroke="#0ea5e9" fill="url(#scanFill)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Risk distribution" description="Highest severity recorded per scan.">
          {hasScans ? <div className="h-56"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={summary.severity} dataKey="value" nameKey="name" innerRadius={48} outerRadius={78} paddingAngle={3}>{summary.severity.map((entry) => <Cell key={entry.name} fill={severityColors[entry.name]} />)}</Pie><Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} /></PieChart></ResponsiveContainer></div> : <EmptyState />}
          <div className="flex flex-wrap justify-center gap-3">{summary.severity.map((item) => <span key={item.name} className="flex items-center gap-1.5 text-xs capitalize text-muted-foreground"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: severityColors[item.name] }} />{item.name} {item.value}</span>)}</div>
        </SectionCard>

        <SectionCard title="Most scanned repositories" description="Top repositories by scan count.">
          {summary.repositories.length ? <div className="h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={summary.repositories} layout="vertical" margin={{ top: 0, right: 8, left: 12, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} /><XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} /><YAxis type="category" dataKey="name" width={100} tickFormatter={(value) => value.length > 16 ? `…${value.slice(-15)}` : value} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} /><Bar dataKey="scans" fill="#0ea5e9" radius={[0, 4, 4, 0]} /></BarChart></ResponsiveContainer></div> : <EmptyState />}
        </SectionCard>
      </div>

      <SectionCard title="Recent scans" description="Your eight most recent repository scans.">
        {summary.recentScans.length ? <div className="overflow-x-auto"><table className="w-full min-w-[560px] text-left text-sm"><thead className="border-b border-border text-xs uppercase tracking-wider text-muted-foreground"><tr><th className="pb-3 font-medium">Repository</th><th className="pb-3 font-medium">Severity</th><th className="pb-3 text-right font-medium">Findings</th><th className="pb-3 text-right font-medium">Score</th><th className="pb-3 text-right font-medium">Date</th></tr></thead><tbody>{summary.recentScans.map((scan, index) => <tr key={`${scan.repo}-${scan.created_at}-${index}`} className="border-b border-border/60 last:border-0"><td className="max-w-48 truncate py-3 font-medium">{scan.repo}</td><td className="py-3"><span className="capitalize" style={{ color: severityColors[scan.severity] }}>{scan.severity}</span></td><td className="py-3 text-right tabular-nums">{scan.issues}</td><td className="py-3 text-right tabular-nums">{scan.score}/100</td><td className="py-3 text-right text-muted-foreground">{new Date(scan.created_at).toLocaleDateString()}</td></tr>)}</tbody></table></div> : <EmptyState />}
      </SectionCard>

      <SectionCard title="Data retention" description="Account data is automatically removed after 30 days.">
        <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3"><div><p className="text-sm font-medium">Retention window</p><p className="mt-0.5 text-xs text-muted-foreground">Applies to scan history and notifications.</p></div><span className="rounded-md border border-border bg-background px-2.5 py-1 font-mono text-xs">30 days</span></div>
        <div className="pt-2"><p className="mb-3 text-xs font-medium uppercase tracking-widest text-muted-foreground">Danger zone</p><div className="flex flex-wrap gap-2"><DangerButton disabled={clearing !== null} onClick={() => setConfirmation({ action: "clear", scope: "scan_history" })}>{clearing === "scan_history" ? "Clearing…" : "Clear scan history"}</DangerButton><DangerButton disabled={clearing !== null} onClick={() => setConfirmation({ action: "clear", scope: "notifications" })}>{clearing === "notifications" ? "Clearing…" : "Clear notifications"}</DangerButton><DangerButton disabled={clearing !== null} onClick={() => setConfirmation({ action: "clear", scope: "all" })}>{clearing === "all" ? "Clearing…" : "Clear all data"}</DangerButton></div>
          <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-4"><p className="text-sm font-semibold text-red-500">Delete account</p><p className="mt-1 text-xs text-red-500/80">Permanently removes your profile, notifications, scans, linked repositories, and sign-in access.</p><DangerButton onClick={() => setConfirmation({ action: "delete" })} className="mt-4 w-full bg-red-600 px-4 py-3 text-sm font-semibold text-white hover:bg-red-700 hover:text-white">Delete my account permanently</DangerButton></div>
        </div>
      </SectionCard>

      <AlertDialog
        open={confirmation !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmation(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-destructive/10 text-destructive">
              <Trash2 />
            </AlertDialogMedia>
            <AlertDialogTitle>
              {confirmation?.action === "delete"
                ? "Permanently delete your account?"
                : "Clear this account data?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmation?.action === "delete"
                ? "Your profile, scans, notifications, linked repositories, and sign-in access will be permanently removed. This cannot be undone."
                : confirmation?.scope === "all"
                  ? "Your scan history and notifications will be permanently removed. Your account will remain active."
                  : `Your ${confirmation?.scope === "scan_history" ? "scan history" : "notifications"} will be permanently removed. This cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep my data</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (confirmation?.action === "delete") {
                  void deleteAccount();
                } else if (confirmation?.action === "clear") {
                  void clearData(confirmation.scope);
                }
              }}
            >
              {confirmation?.action === "delete"
                ? "Delete account"
                : "Clear data"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof Database; label: string; value: number | string }) {
  return <div className="rounded-xl border border-border bg-muted/20 p-4"><div className="flex items-center gap-2 text-xs text-muted-foreground"><Icon className="h-4 w-4" />{label}</div><p className="mt-3 text-2xl font-semibold tabular-nums">{value}</p></div>;
}

function EmptyState() {
  return <div className="flex h-40 flex-col items-center justify-center rounded-lg border border-dashed border-border text-center"><ScanSearch className="h-5 w-5 text-muted-foreground" /><p className="mt-2 text-sm font-medium">No scan data yet</p><p className="mt-1 text-xs text-muted-foreground">Run a scan to populate this chart.</p></div>;
}

function DataSkeleton() {
  return <div className="space-y-6"><Skeleton className="h-64 rounded-xl" /><Skeleton className="h-80 rounded-xl" /><div className="grid gap-6 lg:grid-cols-2"><Skeleton className="h-72 rounded-xl" /><Skeleton className="h-72 rounded-xl" /></div></div>;
}
