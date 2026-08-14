"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createClient } from "@/app/lib/supabase";
import { buildAuthHeaders } from "@/app/lib/http";
import { Button } from "@/components/ui/button";
import { DraftCodeWorkspace, type DraftPatch } from "../../draft-code-workspace";

export function DraftWorkspaceClient({ workspaceId }: { workspaceId: string }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [draft, setDraft] = useState<DraftPatch | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      const session = (await supabase.auth.getSession()).data.session;
      if (!session) { if (active) setError("Sign in to open this workspace."); return; }
      const response = await fetch(`/api/workspaces/${workspaceId}`, { headers: buildAuthHeaders(session.access_token) });
      const payload = await response.json().catch(() => ({}));
      if (!active) return;
      const file = payload.files?.[0];
      if (!response.ok || !file) { setError(payload.error ?? "This workspace could not be opened."); return; }
      setDraft({ workspaceId: payload.workspace.id, repository: payload.workspace.repository, file: file.path, title: payload.workspace.title, originalContent: file.original_content, draftContent: file.content, patch: "", patchSha256: "", baseBranch: payload.workspace.base_branch, baseCommitSha: payload.workspace.base_commit_sha, version: file.version });
    })();
    return () => { active = false; };
  }, [supabase, workspaceId]);

  if (error) return <div className="grid min-h-[65svh] place-items-center text-center"><div><p className="font-medium">Unable to open draft workspace</p><p className="mt-2 text-sm text-muted-foreground">{error}</p><Button className="mt-5" variant="outline" onClick={() => router.replace("/scan/drafts")}>Back to drafts</Button></div></div>;
  if (!draft) return <div className="grid min-h-[65svh] place-items-center text-sm text-muted-foreground"><span className="flex items-center gap-2"><Loader2 className="size-4 animate-spin" />Opening repository workspace…</span></div>;
  return <DraftCodeWorkspace draft={draft} onClose={() => router.push("/scan/drafts")} />;
}
