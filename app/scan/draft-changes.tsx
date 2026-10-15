"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Code2, FileDiff, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/app/lib/supabase";
import { buildTeamAuthHeaders } from "@/app/lib/http";
import { useTeam } from "@/app/components/TeamProvider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

type RepositoryScan = { repo: string; created_at: string };
type Workspace = {
  id: string;
  repository: string;
  title: string;
  base_branch: string;
  base_commit_sha: string;
  updated_at: string;
  workspace_files?: Array<{ path: string }>;
};

export function DraftChangesPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const { selectedTeamId } = useTeam();
  const [data, setData] = useState<{ scans: RepositoryScan[]; workspaces: Workspace[]; teamId: string | null } | null>(null);
  const [error, setError] = useState<{ teamId: string | null; message: string } | null>(null);
  const [openingRepository, setOpeningRepository] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const token = (await supabase.auth.getSession()).data.session?.access_token;
        if (!token) throw new Error("Sign in to view repository workspaces.");
        const headers = buildTeamAuthHeaders(token, selectedTeamId);
        const [scanResponse, workspaceResponse] = await Promise.all([
          fetch("/api/scans/recent", { headers, signal: controller.signal }),
          fetch("/api/workspaces", { headers, signal: controller.signal }),
        ]);
        const [scanPayload, workspacePayload] = await Promise.all([scanResponse.json(), workspaceResponse.json()]);
        if (!scanResponse.ok) throw new Error(scanPayload.error ?? "Could not load repositories.");
        if (!workspaceResponse.ok) throw new Error(workspacePayload.error ?? "Could not load workspaces.");
        if (controller.signal.aborted) return;
        const scans = Array.from(new Map<string, RepositoryScan>((scanPayload.scans ?? []).map((scan: RepositoryScan) => [scan.repo, scan])).values());
        setData({ scans, workspaces: workspacePayload.workspaces ?? [], teamId: selectedTeamId });
        setError(null);
      } catch (cause) {
        if (!controller.signal.aborted) {
          setError({ teamId: selectedTeamId, message: cause instanceof Error ? cause.message : "Could not load repository workspaces." });
        }
      }
    })();
    return () => controller.abort();
  }, [selectedTeamId, supabase]);

  const startWorkspace = async (repository: string) => {
    setOpeningRepository(repository);
    try {
      const session = (await supabase.auth.getSession()).data.session;
      if (!session?.access_token) throw new Error("Sign in to open a workspace.");
      const response = await fetch("/api/workspaces", {
        method: "POST",
        headers: buildTeamAuthHeaders(session.access_token, selectedTeamId, { "Content-Type": "application/json" }),
        body: JSON.stringify({ repository, providerToken: session.provider_token ?? null }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Unable to open repository workspace.");
      toast.success("Repository workspace opened.");
      router.push(`/scan/drafts/${payload.workspaceId}`);
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Unable to open repository workspace.");
    } finally {
      setOpeningRepository(null);
    }
  };

  const current = data?.teamId === selectedTeamId ? data : null;
  const currentError = error?.teamId === selectedTeamId ? error.message : null;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Draft changes</h1>
        <p className="mt-2 text-sm text-muted-foreground">Open a repository workspace, edit code, inspect diffs, collaborate, export, and publish reviewed changes.</p>
      </header>
      <div className="flex gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4 text-sm leading-6">
        <FileDiff className="mt-0.5 size-5 shrink-0 text-amber-500" />
        <p>Workspaces are pinned to a GitHub commit and shared only with authorized team members. Repository code is never executed on the Krythiq server.</p>
      </div>
      {currentError ? <p role="alert" className="text-sm text-destructive">{currentError}</p> : !current ? <Skeleton className="h-56" /> : (
        <>
          {current.workspaces.length ? (
            <section className="border-y border-border py-4">
              <div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-semibold">Saved workspaces</h2><span className="text-xs text-muted-foreground">{current.workspaces.length} active</span></div>
              <div className="divide-y divide-border">
                {current.workspaces.map((workspace) => (
                  <Link key={workspace.id} href={`/scan/drafts/${workspace.id}`} className="flex items-center gap-4 py-3 transition hover:bg-muted/30">
                    <FileDiff className="size-4 shrink-0 text-sky-500" />
                    <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{workspace.title}</span><span className="block truncate text-xs text-muted-foreground">{workspace.repository} · {workspace.base_branch}@{workspace.base_commit_sha.slice(0, 7)} · {workspace.workspace_files?.length ?? 0} opened files</span></span>
                    <span className="text-xs text-muted-foreground">{new Date(workspace.updated_at).toLocaleDateString()}</span><ArrowRight className="size-4" />
                  </Link>
                ))}
              </div>
            </section>
          ) : null}
          {current.scans.length ? (
            <section className="border-y border-border">
              <div className="flex items-center justify-between border-b border-border py-3"><h2 className="text-sm font-semibold">Repositories</h2><Badge variant="outline">{current.scans.length} available</Badge></div>
              <div className="divide-y divide-border">
                {current.scans.map((scan) => (
                  <div key={scan.repo} className="flex flex-wrap items-center gap-4 py-4">
                    <span className="grid size-9 place-items-center rounded-lg bg-sky-500/10 text-sky-500"><Code2 className="size-4" /></span>
                    <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{scan.repo}</p><p className="mt-1 text-xs text-muted-foreground">Ready for editing · scanned {new Date(scan.created_at).toLocaleDateString()}</p></div>
                    <Button size="sm" disabled={openingRepository !== null} onClick={() => void startWorkspace(scan.repo)}>{openingRepository === scan.repo ? <Loader2 className="animate-spin" /> : <Code2 />}{openingRepository === scan.repo ? "Opening…" : "Open workspace"}</Button>
                  </div>
                ))}
              </div>
            </section>
          ) : (
            <div className="border-y border-border py-10 text-center"><ShieldCheck className="mx-auto size-8 text-muted-foreground" /><p className="mt-4 font-medium">Run your first scan</p><p className="mt-1 text-sm text-muted-foreground">Scanned repositories will appear here for editing.</p><Button asChild className="mt-5"><Link href="/scan"><ShieldCheck />Start a scan</Link></Button></div>
          )}
        </>
      )}
    </div>
  );
}
