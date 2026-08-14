"use client";
/* eslint-disable @next/next/no-img-element -- user-provided HTTPS media cannot be allowlisted ahead of time */

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { BadgeCheck, Globe2, Heart, ImagePlus, Lightbulb, Loader2, MessageCircle, PanelRightClose, PanelRightOpen, PartyPopper, Pin, ScanSearch, Send, ShieldCheck, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import Masonry from "@/components/Masonry";
import FileUpload from "@/components/kokonutui/file-upload";
import { cn } from "@/app/lib/utils";
import { createClient } from "@/app/lib/supabase";
import { buildTeamAuthHeaders } from "@/app/lib/http";
import { useTeam } from "@/app/components/TeamProvider";
import { Attachment, AttachmentHeader } from "@/components/ui/attachment";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { BentoGrid } from "@/components/ui/bento-grid";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Message, MessageAvatar, MessageContent, MessageGroup, MessageHeader } from "@/components/ui/message";
import { MessageScroller } from "@/components/ui/message-scroller";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export type Comment = { id: string; author_id: string; author_name: string; body: string; created_at: string };
type Reaction = { user_id: string; reaction: "like" | "celebrate" | "insightful" };
export type Post = { id: string; author_id: string; author_name: string; author_username?: string | null; author_avatar_url?: string | null; team_name?: string | null; body: string; media_url?: string | null; media_path?: string | null; visibility: "public" | "team"; post_type: "update" | "scan" | "milestone"; scan_repository?: string | null; scan_severity?: string | null; scan_score?: number | null; scan_issues?: number | null; scan_created_at?: string | null; created_at: string; social_reactions?: Reaction[]; social_comments?: Comment[]; social_projects?: { name: string; verification_status: string } | null };
type Project = { id: string; team_id: string; team_name: string; repository: string; name: string; verification_status: string; scan_score?: number | null; scan_issues?: number | null };
type ShareableScan = { repository: string; createdAt: string; severity: string; issues: number; score: number; publicRepository: boolean };
type FeedPayload = { posts: Post[]; projects: Project[]; shareableScans: ShareableScan[]; viewer: { userId: string; name: string; username?: string | null; avatarUrl?: string | null }; nextCursor?: string | null };

export function DiscoverClient() {
  const supabase = useMemo(() => createClient(), []);
  const { selectedTeamId, selectedTeam } = useTeam();
  const [scope, setScope] = useState<"public" | "team">("public");
  const [data, setData] = useState<FeedPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [working, setWorking] = useState(false);
  const [body, setBody] = useState("");
  const [mediaPath, setMediaPath] = useState("");
  const [mediaPreview, setMediaPreview] = useState("");
  const [showAttachment, setShowAttachment] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [scanRepo, setScanRepo] = useState("none");
  const [visibility, setVisibility] = useState<"public" | "team">("public");
  const [projectRepo, setProjectRepo] = useState("");
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const auth = useCallback(async () => {
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    if (!token) throw new Error("Sign in to use Explore.");
    return token;
  }, [supabase]);

  const fetchFeed = useCallback(async (before?: string) => {
    const token = await auth();
    const query = new URLSearchParams({ scope });
    if (before) query.set("before", before);
    const response = await fetch(`/api/social/feed?${query}`, { headers: buildTeamAuthHeaders(token, selectedTeamId) });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error ?? "Unable to load Explore.");
    const feed = payload as FeedPayload;
    feed.posts = await Promise.all(feed.posts.map(async (post) => {
      if (!post.media_path) return post;
      const { data: signed } = await supabase.storage.from("social-media").createSignedUrl(post.media_path, 3600);
      return { ...post, media_url: signed?.signedUrl ?? null };
    }));
    return feed;
  }, [auth, scope, selectedTeamId, supabase]);

  const load = useCallback(async () => {
    setLoading(true);
    try { setData(await fetchFeed()); }
    catch (cause) { toast.error(cause instanceof Error ? cause.message : "Unable to load Explore."); }
    finally { setLoading(false); }
  }, [fetchFeed]);

  const loadMore = useCallback(async () => {
    if (!data?.nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const next = await fetchFeed(data.nextCursor);
      setData((current) => current ? { ...next, posts: [...current.posts, ...next.posts] } : next);
    } catch (cause) { toast.error(cause instanceof Error ? cause.message : "Unable to load more posts."); }
    finally { setLoadingMore(false); }
  }, [data?.nextCursor, fetchFeed, loadingMore]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { if (!selectedTeamId && visibility === "team") setVisibility("public"); }, [selectedTeamId, visibility]);
  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target) return;
    const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) void loadMore(); }, { rootMargin: "600px" });
    observer.observe(target);
    return () => observer.disconnect();
  }, [loadMore]);

  const publish = async () => {
    if (!body.trim()) return;
    setWorking(true);
    try {
      const token = await auth();
      const response = await fetch("/api/social/feed", { method: "POST", headers: buildTeamAuthHeaders(token, selectedTeamId, { "Content-Type": "application/json" }), body: JSON.stringify({ body, mediaPath: mediaPath || null, visibility, repository: scanRepo === "none" ? null : scanRepo }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? "Unable to publish.");
      setBody(""); setMediaPath(""); setMediaPreview(""); setShowAttachment(false); setScanRepo("none"); toast.success("Post published."); await load();
    } catch (cause) { toast.error(cause instanceof Error ? cause.message : "Unable to publish."); }
    finally { setWorking(false); }
  };

  const uploadImage = async (file: File) => {
    setUploadingImage(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Sign in to upload an image.");
      const extensions: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" };
      const extension = extensions[file.type];
      if (!extension) throw new Error("Use a JPG, PNG, WebP, or GIF image.");
      const path = `${userData.user.id}/${crypto.randomUUID()}.${extension}`;
      const { error } = await supabase.storage.from("social-media").upload(path, file, { contentType: file.type, cacheControl: "3600", upsert: false });
      if (error) throw error;
      const { data: signed, error: signError } = await supabase.storage.from("social-media").createSignedUrl(path, 3600);
      if (signError || !signed?.signedUrl) throw signError ?? new Error("Unable to preview image.");
      setMediaPath(path); setMediaPreview(signed.signedUrl); toast.success("Image attached.");
    } catch (cause) { toast.error(cause instanceof Error ? cause.message : "Unable to upload image."); }
    finally { setUploadingImage(false); }
  };

  const removeImage = async () => {
    const path = mediaPath;
    setMediaPath(""); setMediaPreview(""); setShowAttachment(false);
    if (path) await supabase.storage.from("social-media").remove([path]);
  };

  const engage = async (postId: string, action: string, extra: Record<string, unknown> = {}) => {
    try {
      const token = await auth();
      const response = await fetch("/api/social/engage", { method: "POST", headers: buildTeamAuthHeaders(token, selectedTeamId, { "Content-Type": "application/json" }), body: JSON.stringify({ postId, action, ...extra }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? "Unable to update post.");
      if (action === "comment") setCommentDrafts((current) => ({ ...current, [postId]: "" }));
      await load();
    } catch (cause) { toast.error(cause instanceof Error ? cause.message : "Unable to update post."); }
  };

  const pinProject = async () => {
    if (!projectRepo || !selectedTeamId) return;
    setWorking(true);
    try {
      const token = await auth();
      const response = await fetch("/api/social/projects", { method: "POST", headers: buildTeamAuthHeaders(token, selectedTeamId, { "Content-Type": "application/json" }), body: JSON.stringify({ repository: projectRepo }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? "Unable to pin project.");
      if (payload.verified) toast.success("Project pinned and verified.");
      else toast.warning(`Project pinned without a badge: ${(payload.reasons ?? []).join(" ")}`);
      await load();
    } catch (cause) { toast.error(cause instanceof Error ? cause.message : "Unable to pin project."); }
    finally { setWorking(false); }
  };

  const teamScans = data?.shareableScans ?? [];
  return <div className="mx-auto max-w-[1500px] space-y-6">
    <div className="flex items-center justify-between gap-4 border-b border-border pb-4"><p className="text-sm text-muted-foreground">Community</p><div className="flex rounded-xl border border-border bg-background p-1"><Button size="sm" variant={scope === "public" ? "default" : "ghost"} onClick={() => setScope("public")}><Globe2 />Explore</Button><Button size="sm" variant={scope === "team" ? "default" : "ghost"} disabled={!selectedTeamId} onClick={() => setScope("team")}><Users />My team</Button></div></div>

    <div className={cn("grid items-start gap-4 transition-[grid-template-columns] duration-300", sidebarOpen ? "xl:grid-cols-[minmax(0,1fr)_380px]" : "xl:grid-cols-[minmax(0,1fr)_72px]")}>
      <main className="min-w-0">
        <Card className="mb-6 overflow-hidden"><CardHeader className="border-b border-border"><div className="flex items-center gap-3"><Avatar size="lg"><AvatarImage src={data?.viewer.avatarUrl ?? undefined} alt="" /><AvatarFallback>{initials(data?.viewer.name ?? "You")}</AvatarFallback></Avatar><div><CardTitle>Share something useful</CardTitle><p className="text-xs text-muted-foreground">Progress, lessons, or a safe scan snapshot</p></div></div></CardHeader><CardContent className="space-y-4 pt-5"><Textarea value={body} onChange={(event) => setBody(event.target.value.slice(0, 3000))} placeholder="What did you build, fix, verify, or learn?" className="min-h-24 resize-none border-0 bg-muted/40 text-base shadow-none focus-visible:ring-1" />{showAttachment ? mediaPreview ? <Attachment><AttachmentHeader name="Uploaded image" onRemove={() => void removeImage()} /><img src={mediaPreview} alt="Attachment preview" className="max-h-80 w-full object-cover" /></Attachment> : <FileUpload className="max-w-none" uploadDelay={250} maxFileSize={5 * 1024 * 1024} acceptedFileTypes={["image/jpeg", "image/png", "image/webp", "image/gif"]} onUploadSuccess={(file) => void uploadImage(file)} onUploadError={(uploadError) => toast.error(uploadError.message)} /> : null}<div className="grid gap-3 sm:grid-cols-2"><Select value={scanRepo} onValueChange={setScanRepo}><SelectTrigger><SelectValue placeholder="Attach a safe scan summary" /></SelectTrigger><SelectContent><SelectItem value="none">No scan attached</SelectItem>{teamScans.map((scan) => <SelectItem key={scan.repository} value={scan.repository}>{scan.repository}{scan.publicRepository ? "" : " · private"}</SelectItem>)}</SelectContent></Select><Select value={visibility} onValueChange={(value) => setVisibility(value as "public" | "team")}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="public">Public Explore</SelectItem>{selectedTeamId ? <SelectItem value="team">{selectedTeam?.name ?? "Selected team"} only</SelectItem> : null}</SelectContent></Select></div><div className="flex items-center justify-between gap-3"><Button type="button" variant="ghost" size="sm" onClick={() => setShowAttachment(true)}><ImagePlus />Add image</Button><Button onClick={() => void publish()} disabled={working || uploadingImage || !body.trim()}>{working || uploadingImage ? <Loader2 className="animate-spin" /> : <Send />}Post</Button></div><p className="text-xs text-muted-foreground">Only summary numbers are shared. Findings and source code stay private.</p></CardContent></Card>

        {loading ? <Masonry>{Array.from({ length: 6 }, (_, index) => <Skeleton key={index} className={`rounded-3xl ${index % 2 ? "h-80" : "h-64"}`} />)}</Masonry> : data?.posts.length ? <Masonry>{data.posts.map((post) => <PostCard key={post.id} post={post} viewerId={data.viewer.userId} comment={commentDrafts[post.id] ?? ""} setComment={(value) => setCommentDrafts((current) => ({ ...current, [post.id]: value }))} engage={engage} />)}</Masonry> : <Card><CardContent className="p-12 text-center"><ScanSearch className="mx-auto size-10 text-muted-foreground" /><p className="mt-4 font-medium">No posts here yet</p><p className="mt-1 text-sm text-muted-foreground">Be the first to share a useful build update.</p></CardContent></Card>}
        <div ref={loadMoreRef} className="grid min-h-20 place-items-center" aria-live="polite">{loadingMore ? <Loader2 className="animate-spin text-muted-foreground" /> : data?.nextCursor ? <span className="text-xs text-muted-foreground">Keep scrolling</span> : data?.posts.length ? <span className="text-xs text-muted-foreground">You’re all caught up</span> : null}</div>
      </main>

      <aside className={cn("fixed right-3 top-24 z-40 transition-[width] duration-300 xl:sticky xl:right-auto xl:top-6 xl:z-auto xl:w-auto", sidebarOpen ? "w-[min(380px,calc(100vw-1.5rem))]" : "w-16")}>
        <div className={cn("overflow-hidden transition-all duration-300", sidebarOpen && "max-h-[calc(100svh-7rem)] overflow-y-auto")}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button type="button" variant={sidebarOpen ? "ghost" : "outline"} size={sidebarOpen ? "sm" : "icon-lg"} className={cn("shrink-0", sidebarOpen ? "mb-3 w-full justify-between" : "size-[50px] rounded-xl border-sky-500/25 bg-sky-500/10 text-sky-400 shadow-[0_0_24px_rgba(56,189,248,.12)] hover:bg-sky-500/15 hover:text-sky-300")} onClick={() => setSidebarOpen((open) => !open)} aria-expanded={sidebarOpen} aria-label={sidebarOpen ? "Close community sidebar" : "Open community sidebar"}>
                {sidebarOpen ? <><span className="flex items-center gap-2"><PanelRightClose className="size-4" />Community tools</span><span className="text-[10px] font-normal text-muted-foreground">Close</span></> : <PanelRightOpen className="size-6" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left" sideOffset={12} className="max-w-64 rounded-xl border border-sky-400/25 bg-zinc-950 px-4 py-3 text-left text-white shadow-[0_16px_50px_rgba(0,0,0,.45),0_0_30px_rgba(56,189,248,.14)]">
              <span className="block text-sm font-semibold">{sidebarOpen ? "Close community tools" : "Open community tools"}</span>
              {!sidebarOpen ? <span className="mt-1 block text-xs leading-5 text-zinc-400">People, verified projects, pinning, and sharing controls.</span> : null}
            </TooltipContent>
          </Tooltip>
          {sidebarOpen ? <BentoGrid className="auto-rows-auto grid-cols-2 gap-3">
            <Button asChild variant="secondary" size="sm" className="col-span-2"><Link href="/discover/requests"><UserPlus className="size-4" />Review follow requests</Link></Button>
            {selectedTeamId ? <RainbowBentoCard className="col-span-2"><h2 className="flex items-center gap-2 font-semibold"><Pin className="size-5 text-fuchsia-500" />Pin a team project</h2><p className="mt-2 text-xs leading-5 text-muted-foreground">Feature one project and check its badge from recent evidence.</p><div className="mt-3 space-y-2"><Select value={projectRepo} onValueChange={setProjectRepo}><SelectTrigger className="h-9"><SelectValue placeholder="Choose repository" /></SelectTrigger><SelectContent>{teamScans.map((scan) => <SelectItem key={scan.repository} value={scan.repository}>{scan.repository}</SelectItem>)}</SelectContent></Select><Button className="w-full" size="sm" variant="outline" disabled={!projectRepo || working} onClick={() => void pinProject()}><BadgeCheck />Pin and check badge</Button></div></RainbowBentoCard> : null}
            <RainbowBentoCard><h2 className="flex items-center gap-2 text-sm font-semibold"><Users className="size-4 text-sky-500" />People</h2><div className="mt-3 space-y-2">{Array.from(new Map((data?.posts ?? []).map((post) => [post.author_id, post])).values()).slice(0, 4).map((person) => <Link href={`/discover/people/${person.author_id}`} key={person.author_id} className="flex items-center gap-2 rounded-lg p-1 transition hover:bg-muted"><Avatar size="sm"><AvatarImage src={person.author_avatar_url ?? undefined} alt="" /><AvatarFallback>{initials(person.author_name)}</AvatarFallback></Avatar><div className="min-w-0"><p className="truncate text-xs font-medium">{person.author_name}</p>{person.author_username ? <p className="truncate text-[10px] text-muted-foreground">@{person.author_username}</p> : null}</div></Link>)}{!data?.posts.length ? <p className="text-xs leading-5 text-muted-foreground">No people yet.</p> : null}</div></RainbowBentoCard>
            <RainbowBentoCard><h2 className="flex items-center gap-2 text-sm font-semibold"><ShieldCheck className="size-4 text-emerald-500" />Verified</h2><div className="mt-3 space-y-2">{data?.projects.filter((project) => project.verification_status === "verified").slice(0, 3).map((project) => <div key={project.id} className="min-w-0 rounded-xl bg-background/60 p-2"><p className="truncate text-xs font-medium">{project.name}</p><p className="truncate text-[10px] text-muted-foreground">{project.team_name}</p></div>)}{!data?.projects.some((project) => project.verification_status === "verified") ? <p className="text-xs leading-5 text-muted-foreground">No verified projects yet.</p> : null}</div></RainbowBentoCard>
          </BentoGrid> : null}
        </div>
      </aside>
    </div>
  </div>;
}

export function PostCard({ post, viewerId, comment, setComment, engage, detail = false }: { post: Post; viewerId: string; comment: string; setComment: (value: string) => void; engage: (postId: string, action: string, extra?: Record<string, unknown>) => Promise<void>; detail?: boolean }) {
  const reactions = post.social_reactions ?? [];
  const comments = post.social_comments ?? [];
  const mine = reactions.find((reaction) => reaction.user_id === viewerId);
  return <article className={detail ? "mx-auto max-w-3xl" : "inline-block w-full"}><Card className="group overflow-hidden rounded-3xl transition duration-300 hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-xl"><CardContent className="p-0"><div className="flex items-start gap-3 p-5 pb-4"><Link href={`/discover/people/${post.author_id}`} aria-label={`View ${post.author_name}'s profile`}><Avatar size="lg"><AvatarImage src={post.author_avatar_url ?? undefined} alt={`${post.author_name}'s avatar`} /><AvatarFallback>{initials(post.author_name)}</AvatarFallback></Avatar></Link><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><Link href={`/discover/people/${post.author_id}`} className="font-semibold hover:underline">{post.author_name}</Link>{post.social_projects?.verification_status === "verified" ? <Badge className="text-sky-500"><BadgeCheck />Verified</Badge> : null}</div><p className="truncate text-xs text-muted-foreground">{post.author_username ? `@${post.author_username} · ` : ""}{relativeTime(post.created_at)} · {post.visibility === "team" ? "Team" : "Public"}</p></div></div>
    <Link href={`/discover/${post.id}`} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{post.media_url ? <div className="overflow-hidden border-y border-border bg-muted"><img src={post.media_url} alt="Post attachment" loading="lazy" className={`w-full object-cover transition duration-500 group-hover:scale-[1.015] ${detail ? "max-h-[680px]" : "max-h-[520px]"}`} /></div> : null}<div className="p-5"><p className="whitespace-pre-wrap text-sm leading-7">{post.body}</p>{post.post_type === "scan" && post.scan_repository ? <div className="mt-5 rounded-2xl border border-sky-500/20 bg-sky-500/5 p-4"><div className="flex items-center justify-between gap-3"><div className="min-w-0"><p className="text-[10px] font-semibold uppercase tracking-[.18em] text-sky-500">Shared scan</p><p className="mt-1 truncate font-medium">{post.scan_repository}</p></div><Badge variant="outline">{post.scan_severity ?? "unknown"}</Badge></div><div className="mt-4 grid grid-cols-3 gap-2 text-center"><Metric label="Issues" value={post.scan_issues ?? 0} /><Metric label="Risk" value={post.scan_score ?? 0} /><Metric label="Scanned" value={post.scan_created_at ? new Date(post.scan_created_at).toLocaleDateString() : "—"} /></div></div> : null}</div></Link>
    <div className="border-t border-border p-4"><div className="flex items-center gap-1"><ReactionButton active={mine?.reaction === "like"} icon={Heart} label="Like" onClick={() => void engage(post.id, mine?.reaction === "like" ? "unreact" : "react", { reaction: "like" })} /><ReactionButton active={mine?.reaction === "celebrate"} icon={PartyPopper} label="Celebrate" onClick={() => void engage(post.id, mine?.reaction === "celebrate" ? "unreact" : "react", { reaction: "celebrate" })} /><ReactionButton active={mine?.reaction === "insightful"} icon={Lightbulb} label="Insightful" onClick={() => void engage(post.id, mine?.reaction === "insightful" ? "unreact" : "react", { reaction: "insightful" })} /><Link href={`/discover/${post.id}`} aria-label="Open post comments" className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><MessageCircle className="size-4" />{comments.length}</Link></div>{comments.length ? <MessageScroller className={detail ? "mt-4 max-h-[28rem]" : "mt-4 max-h-56"}><MessageGroup>{comments.slice(detail ? 0 : -3).map((item) => <Message key={item.id}><MessageAvatar><Avatar size="sm"><AvatarFallback>{initials(item.author_name)}</AvatarFallback></Avatar></MessageAvatar><MessageContent><div className="rounded-2xl bg-muted/60 px-3 py-2"><MessageHeader className="px-0">{item.author_name}</MessageHeader><p className="mt-1 text-sm leading-5">{item.body}</p></div></MessageContent></Message>)}</MessageGroup></MessageScroller> : null}<div className="mt-4 flex gap-2"><Input value={comment} onChange={(event) => setComment(event.target.value.slice(0, 1000))} placeholder="Add a comment…" aria-label="Comment" /><Button size="icon" variant="ghost" aria-label="Post comment" disabled={!comment.trim()} onClick={() => void engage(post.id, "comment", { body: comment })}><Send /></Button></div></div></CardContent></Card></article>;
}

function RainbowBentoCard({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn("group relative isolate min-w-0 overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:border-transparent hover:shadow-lg", className)}>
    <div aria-hidden="true" className="pointer-events-none absolute -inset-12 -z-10 bg-[conic-gradient(from_120deg,rgba(56,189,248,.65),rgba(168,85,247,.55),rgba(244,114,182,.5),rgba(52,211,153,.55),rgba(56,189,248,.65))] opacity-0 blur-xl transition-opacity duration-500 group-hover:opacity-25" />
    <div aria-hidden="true" className="pointer-events-none absolute inset-px -z-10 rounded-[calc(1rem-1px)] bg-card/95" />
    {children}
  </section>;
}

function initials(name: string) { return name.split(" ").filter(Boolean).map((part) => part[0]).slice(0, 2).join("").toUpperCase() || "K"; }
function relativeTime(value: string) { const seconds = Math.max(1, Math.floor((Date.now() - new Date(value).getTime()) / 1000)); if (seconds < 60) return `${seconds}s`; if (seconds < 3600) return `${Math.floor(seconds / 60)}m`; if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`; if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`; return new Date(value).toLocaleDateString(); }
function ReactionButton({ active, icon: Icon, label, onClick }: { active: boolean; icon: typeof Heart; label: string; onClick: () => void }) { return <Button size="icon-sm" title={label} aria-label={label} variant={active ? "secondary" : "ghost"} className={active && label === "Like" ? "text-rose-500" : ""} onClick={onClick}><Icon className={active && label === "Like" ? "fill-current" : ""} /></Button>; }
function Metric({ label, value }: { label: string; value: string | number }) { return <div className="rounded-xl bg-background/80 p-2"><p className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</p><p className="mt-1 text-sm font-semibold">{value}</p></div>; }
