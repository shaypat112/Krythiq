"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/app/lib/supabase";
import { buildTeamAuthHeaders } from "@/app/lib/http";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import ProfileHeader from "./components/ProfileHeader";
import ScanTable, { type ScanRow } from "./components/ScanTable";
import StatsRow from "./components/StatsRow";
import TabNav, { type TabKey } from "./components/TabNav";
import IntegrationPanel from "./components/IntegrationPanel";
import RepoTable, { type ConnectedRepo } from "./components/RepoTable";
import { useTeam } from "@/app/components/TeamProvider";
import MultiStepLoaderDemo from "@/components/multi-step-loader-demo";

function severityValue(severity: string) {
  return { critical: 4, high: 3, medium: 2, low: 1 }[severity.toLowerCase() as "critical" | "high" | "medium" | "low"] ?? 0;
}

export default function ProfileClient({ initialTab = "scans" }: { initialTab?: TabKey }) {
  const [email, setEmail] = useState<string | null>(null);
  const [name, setName] = useState("Developer");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [tier, setTier] = useState<"free" | "pro" | "team">("free");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scans, setScans] = useState<ScanRow[]>([]);
  const [repos, setRepos] = useState<ConnectedRepo[]>([]);

  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);
  const [scanningRepo, setScanningRepo] = useState<string | null>(null);

  const supabase = useMemo(() => createClient(), []);
  const { selectedTeamId } = useTeam();

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: userData, error: userErr } = await supabase.auth.getUser();
        if (!mounted) return;

        if (userErr || !userData.user) {
          setError("Please sign in to view your scans.");
          return;
        }

        setEmail(userData.user.email ?? null);
        setName(userData.user.user_metadata?.full_name ?? "Developer");
        setAvatarUrl(userData.user.user_metadata?.avatar_url ?? null);

        const { data: profileData } = await supabase
          .from("profiles")
          .select("id, full_name, username, avatar_url, tier")
          .eq("id", userData.user.id)
          .single();

        if (profileData) {
          setName(profileData.full_name ?? "Developer");
          setAvatarUrl(profileData.avatar_url ?? null);
          setTier(profileData.tier ?? "free");
        }

        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData.session?.access_token ?? null;
        const scanRes = accessToken
          ? await fetch("/api/scans/recent", {
              headers: buildTeamAuthHeaders(accessToken, selectedTeamId),
            })
          : null;
        if (scanRes && !scanRes.ok) throw new Error("Recent scans could not be loaded.");
        const scanJson = scanRes ? await scanRes.json() : null;
        const scanData = (scanJson?.scans ?? []) as Array<
          ScanRow & { findings?: { ai_summary?: string } }
        >;

        const { data: repoData } = await supabase
          .from("connected_repos")
          .select("id, full_name, private, last_scanned_at")
          .order("full_name", { ascending: true });

        if (!mounted) return;
        setScans(scanData.map((scan) => ({
          ...scan,
          summary: scan.findings?.ai_summary ?? null,
        })));
        setRepos((repoData as ConnectedRepo[]) ?? []);
      } catch (cause) {
        if (mounted) setError(cause instanceof Error ? cause.message : "Your workspace could not be loaded.");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, [selectedTeamId, supabase]);

  const initials = name
    .split(" ")
    .filter((part) => part.length > 0)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const stats = [
    { label: "Total scans", value: String(scans.length) },
    {
      label: "Highest severity",
      value: scans.length
        ? [...scans].sort((a, b) => severityValue(b.severity) - severityValue(a.severity))[0].severity.toUpperCase()
        : "-",
    },
    {
      label: "Avg score",
      value:
        scans.length > 0
          ? String(
              Math.round(
                scans.reduce((sum, scan) => sum + scan.score, 0) / scans.length,
              ),
            )
          : "-",
    },
  ];

  const connectGitHub = async () => {
    if (!supabase) return;
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    const providerToken = sessionData.session?.provider_token;

    if (!accessToken || !providerToken) {
      setError("GitHub is not connected. Sign in with GitHub first.");
      return;
    }

    setError(null);
    try {
      const res = await fetch("/api/github/repos", {
        method: "POST",
        headers: buildTeamAuthHeaders(
          accessToken,
          selectedTeamId,
          { "Content-Type": "application/json" },
        ),
        body: JSON.stringify({ providerToken }),
      });

      if (!res.ok) {
        const { error: message } = await res.json().catch(() => ({ error: null }));
        throw new Error(message ?? "Failed to sync repositories.");
      }

      const { repos: synced } = await res.json();
      setRepos(synced ?? []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Failed to sync repositories.");
    }
  };

  const runRepoScan = async (repo: ConnectedRepo) => {
    if (!supabase) return;
    setError(null);
    setScanningRepo(repo.full_name);

    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    const providerToken = sessionData.session?.provider_token;

    if (!accessToken) {
      setError("Please sign in to scan repositories.");
      setScanningRepo(null);
      return;
    }

    if (repo.private && !providerToken) {
      setError("GitHub authorization is required for private repositories.");
      setScanningRepo(null);
      return;
    }

    try {
      const res = await fetch("/api/github/repo-scan", {
        method: "POST",
        headers: buildTeamAuthHeaders(
          accessToken,
          selectedTeamId,
          { "Content-Type": "application/json" },
        ),
        body: JSON.stringify({
          providerToken: providerToken ?? null,
          repo: repo.full_name,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? "Failed to scan repository.");
      }

      const data = await res.json();
      const now = new Date().toISOString();
      const newScan: ScanRow = data.scan
      ? {
          repo: data.scan.repo ?? repo.full_name,
          created_at: data.scan.created_at ?? now,
          severity: data.scan.severity ?? data.severity,
          issues: data.scan.issues ?? data.issues,
          score: data.scan.score ?? data.score,
          summary: data.scan.findings?.ai_summary ?? data.summary ?? null,
        }
      : {
          repo: repo.full_name,
          created_at: now,
          severity: data.severity ?? "medium",
          issues: data.issues ?? 0,
          score: data.score ?? 0,
          summary: data.summary ?? null,
        };

      setScans((prev) => [newScan, ...prev].slice(0, 8));
      setRepos((prev) =>
        prev.map((item) =>
          item.full_name === repo.full_name
            ? { ...item, last_scanned_at: newScan.created_at }
            : item,
        ),
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Failed to scan repository.");
    } finally {
      setScanningRepo(null);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl space-y-6 py-10" aria-label="Loading scans">
        <Skeleton className="h-28" />
        <Skeleton className="h-20" />
        <Skeleton className="h-72" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <MultiStepLoaderDemo loading={scanningRepo !== null} />
      {error ? <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert> : null}
      <ProfileHeader
        name={name}
        email={email}
        tier={tier}
        initials={initials}
        avatarUrl={avatarUrl}
      />

      <StatsRow stats={stats} />

      <Card>
        <CardContent className="p-4">
          <TabNav active={activeTab} onChange={setActiveTab} />
        </CardContent>
      </Card>

      {activeTab === "scans" && <ScanTable scans={scans} />}

      {activeTab === "integrations" && (
        <div className="space-y-3">
          <IntegrationPanel
            title="GitHub"
            description="Link repos to trigger scans on pushes and PRs."
            connected={repos.length > 0}
            onClick={connectGitHub}
          />

          <RepoTable
            repos={repos}
            onConnect={connectGitHub}
            onScan={runRepoScan}
            scanningRepo={scanningRepo}
          />
        </div>
      )}

    </div>
  );
}
