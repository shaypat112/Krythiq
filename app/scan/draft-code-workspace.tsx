"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Check, Code2, Download, ExternalLink, Eye, FileCode2, GitBranch, Loader2, Maximize2, Minimize2, Play, RotateCcw, Search, Users, Webhook, X } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/app/lib/supabase";
import { buildAuthHeaders } from "@/app/lib/http";
import { useTeam } from "@/app/components/TeamProvider";
import { cn } from "@/app/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Toolbar, type ToolbarItem } from "@/components/kokonutui/toolbar";

export type DraftPatch = {
  workspaceId: string;
  repository: string;
  file: string;
  title: string;
  originalContent: string;
  draftContent: string;
  patch: string;
  patchSha256: string;
  baseBranch: string;
  baseCommitSha: string;
  version: number;
};

type WorkspaceFile = {
  id?: string;
  path: string;
  base_blob_sha?: string | null;
  original_content: string;
  content: string;
  last_edited_by?: string;
  version: number;
};

type RepositoryFile = { path: string; sha: string; size: number };
type WorkspaceRevision = { id: string; workspace_file_id: string; path: string; actor_id: string; from_version: number; to_version: number; before_content: string; after_content: string; created_at: string };
type WorkspaceAuditEvent = { id: string; actor_id: string; action: string; metadata: Record<string, unknown>; created_at: string };
type WorkspaceTab = "edit" | "changed" | "diff" | "preview" | "collaborators" | "publish";

const workspaceTabs: Array<ToolbarItem & { id: WorkspaceTab }> = [
  { id: "edit", title: "Files", icon: Code2, activeClassName: "!bg-sky-500/10 !ring-sky-500/30", iconClassName: "text-sky-400" },
  { id: "changed", title: "Changed files", icon: FileCode2, activeClassName: "!bg-amber-500/10 !ring-amber-500/30", iconClassName: "text-amber-400" },
  { id: "diff", title: "Diff", icon: GitBranch, activeClassName: "!bg-violet-500/10 !ring-violet-500/30", iconClassName: "text-violet-400" },
  { id: "preview", title: "Preview", icon: Eye, activeClassName: "!bg-emerald-500/10 !ring-emerald-500/30", iconClassName: "text-emerald-400" },
  { id: "collaborators", title: "Collaborators", icon: Users, activeClassName: "!bg-pink-500/10 !ring-pink-500/30", iconClassName: "text-pink-400" },
  { id: "publish", title: "Publish", icon: Check, activeClassName: "!bg-cyan-500/10 !ring-cyan-500/30", iconClassName: "text-cyan-400" },
];

function download(name: string, contents: string, type = "text/plain") {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

function filePatch(file: WorkspaceFile) {
  if (file.content === file.original_content) return "";
  const oldLines = file.original_content.split("\n");
  const newLines = file.content.split("\n");
  return `--- a/${file.path}\n+++ b/${file.path}\n@@ -1,${oldLines.length} +1,${newLines.length} @@\n${oldLines.map((line) => `-${line}`).join("\n")}\n${newLines.map((line) => `+${line}`).join("\n")}\n`;
}

function previewAddress(value: string) {
  try {
    const url = new URL(value.trim());
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

export function DraftCodeWorkspace({ draft, onClose }: { draft: DraftPatch; onClose: () => void }) {
  const supabase = useMemo(() => createClient(), []);
  const { selectedTeam } = useTeam();
  const initialFile = useMemo<WorkspaceFile>(() => ({ path: draft.file, original_content: draft.originalContent, content: draft.draftContent, version: draft.version }), [draft]);
  const [openedFiles, setOpenedFiles] = useState<Record<string, WorkspaceFile>>({ [draft.file]: initialFile });
  const [repositoryFiles, setRepositoryFiles] = useState<RepositoryFile[]>([{ path: draft.file, sha: "", size: draft.originalContent.length }]);
  const [activePath, setActivePath] = useState(draft.file);
  const [fileQuery, setFileQuery] = useState("");
  const [loadingTree, setLoadingTree] = useState(true);
  const [openingPath, setOpeningPath] = useState<string | null>(null);
  const [treeError, setTreeError] = useState<string | null>(null);
  const [focusMode, setFocusMode] = useState(false);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("edit");
  const [saveState, setSaveState] = useState<"saved" | "dirty" | "saving" | "conflict" | "error">("saved");
  const [conflictContent, setConflictContent] = useState<string | null>(null);
  const [presence, setPresence] = useState<Array<{ user_id: string; active_file_path: string | null; last_seen_at: string }>>([]);
  const [profiles, setProfiles] = useState<Array<{ id: string; username?: string | null; full_name?: string | null }>>([]);
  const [revisions, setRevisions] = useState<WorkspaceRevision[]>([]);
  const [auditEvents, setAuditEvents] = useState<WorkspaceAuditEvent[]>([]);
  const [selectedCollaborator, setSelectedCollaborator] = useState<string | null>(null);
  const [commitMessage, setCommitMessage] = useState(`Update ${draft.repository}`.slice(0, 200));
  const [publishing, setPublishing] = useState<string | null>(null);
  const [exportingZip, setExportingZip] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("http://localhost:3000");
  const [runningPreviewUrl, setRunningPreviewUrl] = useState<string | null>(null);
  const lastSaved = useRef<Record<string, string>>({ [draft.file]: draft.draftContent });

  const current = openedFiles[activePath] ?? initialFile;
  const changedFiles = useMemo(() => Object.values(openedFiles).filter((file) => file.content !== file.original_content), [openedFiles]);
  const patch = useMemo(() => changedFiles.map(filePatch).filter(Boolean).join("\n"), [changedFiles]);
  const visibleFiles = useMemo(() => {
    const query = fileQuery.trim().toLowerCase();
    return query ? repositoryFiles.filter((file) => file.path.toLowerCase().includes(query)) : repositoryFiles;
  }, [fileQuery, repositoryFiles]);
  const canPreview = /\.(html?|svg)$/i.test(activePath);

  useEffect(() => {
    const saved = window.localStorage.getItem(`krythiq:preview-url:${draft.repository}`);
    const timer = window.setTimeout(() => {
      if (saved && previewAddress(saved)) setPreviewUrl(saved);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [draft.repository]);

  const runPreview = () => {
    const url = previewAddress(previewUrl);
    if (!url) { toast.error("Enter a valid http:// or https:// preview URL."); return; }
    window.localStorage.setItem(`krythiq:preview-url:${draft.repository}`, url);
    setPreviewUrl(url);
    setActiveTab("preview");
    const localHost = ["localhost", "127.0.0.1", "[::1]"].includes(new URL(url).hostname);
    const canEmbed = window.location.protocol === "http:" && localHost;
    if (canEmbed) setRunningPreviewUrl(url);
    else {
      setRunningPreviewUrl(null);
      window.open(url, "_blank", "noopener,noreferrer");
      toast.success(localHost ? "Opened your local app in a new tab." : "Opened the preview in a new tab.");
    }
  };

  useEffect(() => {
    let active = true;
    void (async () => {
      const session = (await supabase.auth.getSession()).data.session;
      if (!session || !active) return;
      const headers = buildAuthHeaders(session.access_token, { "Content-Type": "application/json" });
      const [workspaceResponse, treeResponse] = await Promise.all([
        fetch(`/api/workspaces/${draft.workspaceId}`, { headers }),
        fetch(`/api/workspaces/${draft.workspaceId}`, { method: "POST", headers, body: JSON.stringify({ action: "repository.tree", providerToken: session.provider_token ?? null }) }),
      ]);
      const workspacePayload = await workspaceResponse.json().catch(() => ({}));
      const treePayload = await treeResponse.json().catch(() => ({}));
      if (!active) return;
      if (workspaceResponse.ok && Array.isArray(workspacePayload.files)) {
        const files = Object.fromEntries((workspacePayload.files as WorkspaceFile[]).map((file) => [file.path, file]));
        setOpenedFiles(files);
        lastSaved.current = Object.fromEntries(Object.values(files).map((file) => [file.path, file.content]));
        setPresence(workspacePayload.presence ?? []);
        setProfiles(workspacePayload.profiles ?? []);
        setRevisions(workspacePayload.revisions ?? []);
        setAuditEvents(workspacePayload.auditEvents ?? []);
      }
      if (treeResponse.ok) {
        setRepositoryFiles(treePayload.files ?? []);
      } else {
        setTreeError(treePayload.error ?? "Reconnect GitHub to browse every repository file.");
      }
      setLoadingTree(false);
    })();
    return () => { active = false; };
  }, [draft.workspaceId, supabase]);

  useEffect(() => {
    let active = true;
    let userId = "";
    const loadPresence = async () => {
      const session = (await supabase.auth.getSession()).data.session;
      if (!session || !active) return;
      userId = session.user.id;
      const response = await fetch(`/api/workspaces/${draft.workspaceId}`, { headers: buildAuthHeaders(session.access_token) });
      const payload = await response.json().catch(() => ({}));
      if (response.ok && active) { setPresence(payload.presence ?? []); setProfiles(payload.profiles ?? []); setRevisions(payload.revisions ?? []); setAuditEvents(payload.auditEvents ?? []); }
      await supabase.from("workspace_presence").upsert({ workspace_id: draft.workspaceId, user_id: userId, active_file_path: activePath, last_seen_at: new Date().toISOString() });
    };
    void loadPresence();
    const heartbeat = window.setInterval(() => { if (userId) void supabase.from("workspace_presence").upsert({ workspace_id: draft.workspaceId, user_id: userId, active_file_path: activePath, last_seen_at: new Date().toISOString() }); }, 30_000);
    const channel = supabase.channel(`workspace:${draft.workspaceId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "workspace_files", filter: `workspace_id=eq.${draft.workspaceId}` }, (event) => {
        const file = event.new as WorkspaceFile;
        if (!file.path || typeof file.content !== "string" || typeof file.version !== "number") return;
        setOpenedFiles((currentFiles) => {
          const local = currentFiles[file.path];
          if (!local || file.version <= local.version) return currentFiles;
          if (file.last_edited_by === userId || local.content === lastSaved.current[file.path]) {
            lastSaved.current[file.path] = file.content;
            return { ...currentFiles, [file.path]: file };
          }
          if (file.path === activePath) { setConflictContent(file.content); setSaveState("conflict"); }
          return currentFiles;
        });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "workspace_presence", filter: `workspace_id=eq.${draft.workspaceId}` }, () => { void loadPresence(); })
      .subscribe();
    return () => { active = false; window.clearInterval(heartbeat); void supabase.removeChannel(channel); if (userId) void supabase.from("workspace_presence").delete().eq("workspace_id", draft.workspaceId).eq("user_id", userId); };
  }, [activePath, draft.workspaceId, supabase]);

  useEffect(() => {
    if (!current || current.content === lastSaved.current[activePath] || saveState === "conflict" || saveState === "saving") return;
    const path = activePath;
    const content = current.content;
    const expectedVersion = current.version;
    const timer = window.setTimeout(() => {
      void (async () => {
        setSaveState("saving");
        const token = (await supabase.auth.getSession()).data.session?.access_token;
        if (!token) { setSaveState("error"); return; }
        const response = await fetch(`/api/workspaces/${draft.workspaceId}`, { method: "PATCH", headers: buildAuthHeaders(token, { "Content-Type": "application/json" }), body: JSON.stringify({ path, content, expectedVersion }) });
        const payload = await response.json().catch(() => ({}));
        if (response.status === 409) { if (payload.file?.content) setConflictContent(payload.file.content); setSaveState("conflict"); toast.error(payload.error ?? "This file changed in another session."); return; }
        if (!response.ok) { setSaveState("error"); toast.error(payload.error ?? "Workspace save failed."); return; }
        lastSaved.current[path] = payload.file.content;
        setOpenedFiles((files) => ({ ...files, [path]: payload.file }));
        setSaveState("saved");
      })();
    }, 800);
    return () => window.clearTimeout(timer);
  }, [activePath, current, draft.workspaceId, saveState, supabase]);

  const openFile = async (path: string) => {
    if (path === activePath) return;
    if (saveState !== "saved") { toast.error("Wait for the current file to finish saving."); return; }
    if (openedFiles[path]) { setActivePath(path); setConflictContent(null); return; }
    setOpeningPath(path);
    const session = (await supabase.auth.getSession()).data.session;
    if (!session) { setOpeningPath(null); return; }
    const response = await fetch(`/api/workspaces/${draft.workspaceId}`, { method: "POST", headers: buildAuthHeaders(session.access_token, { "Content-Type": "application/json" }), body: JSON.stringify({ action: "file.open", path, providerToken: session.provider_token ?? null }) });
    const payload = await response.json().catch(() => ({}));
    setOpeningPath(null);
    if (!response.ok) { toast.error(payload.error ?? "Unable to open this file."); return; }
    lastSaved.current[path] = payload.file.content;
    setOpenedFiles((files) => ({ ...files, [path]: payload.file }));
    setActivePath(path);
  };

  const audit = async (action: "file.downloaded" | "patch.exported") => {
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    if (token) await fetch(`/api/workspaces/${draft.workspaceId}`, { method: "POST", headers: buildAuthHeaders(token, { "Content-Type": "application/json" }), body: JSON.stringify({ action, path: activePath }) });
  };
  const collaboratorName = (userId: string) => { const profile = profiles.find((item) => item.id === userId); return profile?.full_name ?? profile?.username ?? "Team member"; };
  const selectedRevisions = selectedCollaborator ? revisions.filter((revision) => revision.actor_id === selectedCollaborator) : [];
  const selectedEvents = selectedCollaborator ? auditEvents.filter((event) => event.actor_id === selectedCollaborator && event.action !== "file.modified") : [];
  const publish = async (mode: "branch" | "pull_request" | "main") => {
    const session = (await supabase.auth.getSession()).data.session;
    if (!session?.access_token) { toast.error("Sign in before publishing."); return; }
    if (saveState !== "saved") { toast.error("Wait for the current file to finish saving."); return; }
    setPublishing(mode);
    const response = await fetch(`/api/workspaces/${draft.workspaceId}/publish`, { method: "POST", headers: buildAuthHeaders(session.access_token, { "Content-Type": "application/json" }), body: JSON.stringify({ mode, commitMessage, providerToken: session.provider_token ?? null }) });
    const payload = await response.json().catch(() => ({}));
    setPublishing(null);
    if (!response.ok) {
      if (payload.branchCreated && payload.url) toast.error(payload.error ?? "Pull request creation failed.", { action: { label: "Open branch", onClick: () => window.open(payload.url, "_blank", "noopener,noreferrer") } });
      else if (String(payload.error ?? "").toLowerCase().includes("reconnect github")) toast.error(payload.error, { action: { label: "Reconnect", onClick: () => { window.location.href = "/settings?section=integrations"; } } });
      else toast.error(payload.error ?? "Publishing failed.");
      return;
    }
    toast.success(mode === "pull_request" ? "Pull request created." : mode === "main" ? "Published to the default branch." : "Branch published.", { action: payload.url ? { label: "Open GitHub", onClick: () => window.open(payload.url, "_blank", "noopener,noreferrer") } : undefined });
  };
  const exportZip = async () => {
    const session = (await supabase.auth.getSession()).data.session;
    if (!session?.access_token) return;
    setExportingZip(true);
    const response = await fetch(`/api/workspaces/${draft.workspaceId}/export`, { method: "POST", headers: buildAuthHeaders(session.access_token, { "Content-Type": "application/json" }), body: JSON.stringify({ providerToken: session.provider_token ?? null }) });
    if (!response.ok) { const payload = await response.json().catch(() => ({})); toast.error(payload.error ?? "ZIP export failed."); setExportingZip(false); return; }
    const filename = (response.headers.get("content-disposition") ?? "").match(/filename="([^"]+)"/)?.[1] ?? `${draft.repository.replace("/", "-")}.zip`;
    const url = URL.createObjectURL(await response.blob()); const link = document.createElement("a"); link.href = url; link.download = filename; link.click(); URL.revokeObjectURL(url);
    setExportingZip(false); toast.success("Modified repository ZIP downloaded.");
  };

  return (
    <section className={cn("overflow-hidden border border-border bg-background", focusMode ? "fixed inset-0 z-[100] flex flex-col" : "min-h-[calc(100svh-10rem)] rounded-xl")}>
      <header className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3">
        <Code2 className="size-5 text-sky-500" />
        <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{draft.repository}</p><p className="truncate text-xs text-muted-foreground">{activePath} · {draft.baseBranch}@{draft.baseCommitSha.slice(0, 7)}</p></div>
        <Badge variant="outline">{repositoryFiles.length.toLocaleString()} files</Badge>
        <Button asChild variant="ghost" size="sm"><Link href="/settings?section=webhooks"><Webhook />Webhooks</Link></Button>
        <Button variant="outline" size="sm" onClick={() => setFocusMode((value) => !value)}>{focusMode ? <Minimize2 /> : <Maximize2 />}{focusMode ? "Exit focus" : "Fullscreen"}</Button>
        <Button variant="ghost" size="icon-sm" aria-label="Close workspace" onClick={onClose}><X /></Button>
      </header>

      <div className="grid min-h-0 flex-1 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="flex min-h-0 flex-col border-b border-border bg-muted/10 lg:border-b-0 lg:border-r">
          <div className="border-b border-border p-3"><div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={fileQuery} onChange={(event) => setFileQuery(event.target.value)} placeholder="Search repository files" className="pl-9" /></div></div>
          <div className={cn("overflow-y-auto p-2", focusMode ? "max-h-none flex-1" : "max-h-[62svh]")}>
            {loadingTree ? <p className="flex items-center gap-2 p-3 text-xs text-muted-foreground"><Loader2 className="size-3 animate-spin" />Loading repository tree…</p> : null}
            {treeError ? <p className="m-2 rounded-lg border border-amber-500/25 bg-amber-500/10 p-3 text-xs leading-5 text-amber-200">{treeError}</p> : null}
            {visibleFiles.map((file) => {
              const opened = openedFiles[file.path]; const changed = opened && opened.content !== opened.original_content;
              return <button key={file.path} type="button" title={file.path} onClick={() => void openFile(file.path)} className={cn("flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs hover:bg-muted", activePath === file.path && "bg-muted text-foreground")}><FileCode2 className="size-3.5 shrink-0 text-muted-foreground" /><span className="truncate">{file.path}</span>{openingPath === file.path ? <Loader2 className="ml-auto size-3 animate-spin" /> : changed ? <span className="ml-auto text-sky-500">M</span> : null}</button>;
            })}
          </div>
        </aside>

        <div className="min-w-0 min-h-0">
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as WorkspaceTab)} className="gap-0">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b px-3 py-2">
              <Toolbar ariaLabel="Draft workspace tools" selected={activeTab} onSelect={(value) => setActiveTab(value as WorkspaceTab)} items={workspaceTabs} className="max-w-full" />
              <span className="text-xs text-muted-foreground">{saveState === "dirty" ? "Unsaved changes…" : saveState === "saving" ? "Saving…" : saveState === "conflict" ? "Save conflict" : saveState === "error" ? "Save failed" : "Saved"}</span>
            </div>
            <TabsContent value="edit" className="mt-0"><textarea value={current.content} onChange={(event) => { setOpenedFiles((files) => ({ ...files, [activePath]: { ...current, content: event.target.value } })); setSaveState("dirty"); }} spellCheck={false} aria-label={`Edit ${activePath}`} className={cn("w-full resize-none border-0 bg-zinc-950 p-5 font-mono text-[13px] leading-6 text-zinc-100 outline-none", focusMode ? "h-[calc(100svh-155px)]" : "min-h-[620px]")} /></TabsContent>
            <TabsContent value="changed" className="mt-0 min-h-[620px] p-5"><div className="divide-y divide-border border-y border-border">{changedFiles.map((file) => <button key={file.path} type="button" onClick={() => void openFile(file.path)} className="flex w-full items-center gap-3 py-4 text-left"><FileCode2 className="size-5 text-sky-500" /><span className="min-w-0 flex-1 truncate font-medium">{file.path}</span><Badge variant="outline">Modified</Badge></button>)}{!changedFiles.length ? <p className="py-12 text-center text-sm text-muted-foreground">No changed files yet.</p> : null}</div></TabsContent>
            <TabsContent value="diff" className="mt-0">{patch ? <pre className="min-h-[620px] max-h-[72svh] overflow-auto bg-zinc-950 p-5 font-mono text-xs leading-6 text-zinc-100"><code>{patch}</code></pre> : <div className="grid min-h-[620px] place-items-center text-sm text-muted-foreground">Your workspace diff will appear after the first edit.</div>}</TabsContent>
            <TabsContent value="preview" className="mt-0 min-h-[620px]">
              <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
                <Input aria-label="Application preview URL" value={previewUrl} onChange={(event) => setPreviewUrl(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") runPreview(); }} placeholder="http://localhost:3000" className="min-w-64 flex-1 font-mono text-xs" />
                <Button size="sm" onClick={runPreview}><Play />Run preview</Button>
                <Button size="sm" variant="outline" onClick={() => { const url = previewAddress(previewUrl); if (url) window.open(url, "_blank", "noopener,noreferrer"); else toast.error("Enter a valid preview URL."); }}><ExternalLink />Open tab</Button>
              </div>
              {runningPreviewUrl ? <iframe title={`Application preview at ${runningPreviewUrl}`} src={runningPreviewUrl} className="min-h-[565px] w-full bg-white" /> : canPreview ? <iframe title={`Mockup preview of ${activePath}`} sandbox="" srcDoc={current.content} className="min-h-[565px] w-full bg-white" /> : <div className="grid min-h-[565px] place-items-center p-8 text-center"><div className="max-w-lg"><p className="font-medium">Run your codebase locally, then enter its URL above.</p><p className="mt-2 text-sm leading-6 text-muted-foreground">Local Krythiq can embed localhost here. From the production site, browsers block insecure localhost frames, so the same button opens your app in a new tab. HTML and SVG files also render here as safe mockups.</p></div></div>}
            </TabsContent>
            <TabsContent value="collaborators" className="mt-0 min-h-[620px] p-5">
              <h3 className="font-semibold">Active collaborators</h3><p className="mt-1 text-sm text-muted-foreground">Select a collaborator to inspect exactly what they changed and when.</p>
              <div className="mt-5 max-w-2xl divide-y divide-border border-y">{presence.map((viewer) => <button key={viewer.user_id} type="button" onClick={() => setSelectedCollaborator(viewer.user_id)} className={cn("flex w-full items-center gap-3 py-3 text-left", selectedCollaborator === viewer.user_id && "bg-muted/50")}><span className="grid size-9 place-items-center rounded-full bg-muted text-xs font-semibold">{collaboratorName(viewer.user_id).slice(0, 2).toUpperCase()}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{collaboratorName(viewer.user_id)}</span><span className="block truncate text-xs text-muted-foreground">{viewer.active_file_path ?? "Browsing workspace"} · active {new Date(viewer.last_seen_at).toLocaleTimeString()}</span></span><span className="size-2 rounded-full bg-emerald-500" /></button>)}{!presence.length ? <p className="py-8 text-center text-sm text-muted-foreground">No active collaborators detected.</p> : null}</div>
              {selectedCollaborator ? <section className="mt-8 max-w-4xl"><div className="flex items-center justify-between gap-3"><div><h4 className="font-semibold">{collaboratorName(selectedCollaborator)}’s activity</h4><p className="mt-1 text-xs text-muted-foreground">Newest activity first · up to 200 recent workspace events</p></div><Button size="xs" variant="ghost" onClick={() => setSelectedCollaborator(null)}><X />Close</Button></div><div className="mt-4 space-y-3">{selectedRevisions.map((revision) => <details key={revision.id} className="border border-border bg-muted/10"><summary className="cursor-pointer list-none p-3"><span className="block text-sm font-medium">Edited {revision.path}</span><span className="mt-1 block text-xs text-muted-foreground">Version {revision.from_version} → {revision.to_version} · {new Date(revision.created_at).toLocaleString()}</span></summary><pre className="max-h-96 overflow-auto border-t border-border bg-zinc-950 p-4 font-mono text-xs leading-5 text-zinc-100"><code>{filePatch({ path: revision.path, original_content: revision.before_content, content: revision.after_content, version: revision.to_version })}</code></pre></details>)}{selectedEvents.map((event) => <div key={event.id} className="border border-border p-3"><p className="text-sm font-medium">{event.action.replaceAll(".", " ")}</p><p className="mt-1 text-xs text-muted-foreground">{typeof event.metadata?.path === "string" ? `${event.metadata.path} · ` : ""}{new Date(event.created_at).toLocaleString()}</p></div>)}{!selectedRevisions.length && !selectedEvents.length ? <p className="border-y border-border py-8 text-center text-sm text-muted-foreground">No recorded edits from this collaborator yet. Exact diffs are recorded after the workspace revision migration is deployed.</p> : null}</div></section> : null}
            </TabsContent>
            <TabsContent value="publish" className="mt-0 min-h-[620px] p-5"><div className="max-w-2xl space-y-5"><div><h3 className="font-semibold">Publish reviewed changes</h3><p className="mt-1 text-sm text-muted-foreground">Krythiq verifies the saved base commit and GitHub permissions before publishing.</p></div><Input value={commitMessage} maxLength={200} onChange={(event) => setCommitMessage(event.target.value)} /><div className="grid gap-3 sm:grid-cols-2"><Button variant="outline" disabled={publishing !== null || !changedFiles.length} onClick={() => void publish("branch")}>{publishing === "branch" ? <Loader2 className="animate-spin" /> : <GitBranch />}Create branch</Button><Button disabled={publishing !== null || !changedFiles.length} onClick={() => void publish("pull_request")}>{publishing === "pull_request" ? <Loader2 className="animate-spin" /> : <GitBranch />}Create branch + PR</Button></div><Button variant="destructive" disabled={selectedTeam?.role !== "owner" || publishing !== null || !changedFiles.length} onClick={() => void publish("main")}>{publishing === "main" ? <Loader2 className="animate-spin" /> : <Check />}Push to {draft.baseBranch}</Button></div></TabsContent>
          </Tabs>
          <footer className="flex flex-wrap items-center gap-2 border-t p-3">
            {saveState === "conflict" && conflictContent !== null ? <div className="mb-2 flex w-full flex-wrap items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs"><span className="mr-auto">A teammate saved a newer version.</span><Button size="xs" variant="outline" onClick={() => { setOpenedFiles((files) => ({ ...files, [activePath]: { ...current, content: conflictContent } })); lastSaved.current[activePath] = conflictContent; setConflictContent(null); setSaveState("saved"); }}>Load teammate version</Button><Button size="xs" onClick={() => { lastSaved.current[activePath] = conflictContent; setConflictContent(null); setSaveState("saved"); }}>Keep mine</Button></div> : null}
            <Button size="sm" onClick={() => { download(activePath.split("/").at(-1) ?? "file.txt", current.content); void audit("file.downloaded"); }}><Download />Download file</Button>
            <Button size="sm" variant="outline" disabled={!changedFiles.length} onClick={() => { download(`${draft.repository.replace("/", "-")}.diff`, patch, "text/x-diff"); void audit("patch.exported"); }}><GitBranch />Export patch</Button>
            <Button size="sm" variant="outline" disabled={exportingZip || saveState !== "saved"} onClick={() => void exportZip()}>{exportingZip ? <Loader2 className="animate-spin" /> : <Download />}Export ZIP</Button>
            <Button size="sm" variant="ghost" disabled={current.content === current.original_content} onClick={() => { setOpenedFiles((files) => ({ ...files, [activePath]: { ...current, content: current.original_content } })); setSaveState("dirty"); }}><RotateCcw />Reset file</Button>
            <Button className="ml-auto" size="sm" variant="outline" onClick={runPreview}><Play />Run / preview</Button>
          </footer>
        </div>
      </div>
    </section>
  );
}
