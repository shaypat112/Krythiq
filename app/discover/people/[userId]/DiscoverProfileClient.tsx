"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, BadgeCheck, BriefcaseBusiness, Building2, Clock3, GitFork, Loader2, MessageCircle, ScanSearch, UsersRound, UserCheck, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/app/lib/supabase";
import { buildAuthHeaders } from "@/app/lib/http";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ProfilePayload = {
  profile: { id: string; username?: string | null; full_name?: string | null; avatar_url?: string | null; updated_at?: string | null };
  professional: { headline: string; role: string; organization: string; companySize: string; community: string };
  posts: Array<{ id: string; body: string; post_type: string; scan_repository?: string | null; scan_severity?: string | null; scan_score?: number | null; scan_issues?: number | null; created_at: string }>;
  projects: Array<{ id: string; name: string; repository: string; team_name: string; verification_status: string; scan_score?: number | null; scan_issues?: number | null }>;
  connection: { id: string; requester_id: string; addressee_id: string; status: string } | null;
  viewerId: string;
  isSelf: boolean;
};

export function DiscoverProfileClient({ userId }: { userId: string }) {
  const supabase = useMemo(() => createClient(), []);
  const [data, setData] = useState<ProfilePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);

  const token = useCallback(async () => (await supabase.auth.getSession()).data.session?.access_token ?? "", [supabase]);
  const load = useCallback(async () => {
    setLoading(true);
    const accessToken = await token();
    const response = await fetch(`/api/social/profiles/${encodeURIComponent(userId)}`, { headers: buildAuthHeaders(accessToken) });
    const payload = await response.json().catch(() => ({}));
    if (response.ok) setData(payload as ProfilePayload); else toast.error(payload.error ?? "Unable to load profile.");
    setLoading(false);
  }, [token, userId]);
  useEffect(() => { const timer = window.setTimeout(() => { void load(); }, 0); return () => window.clearTimeout(timer); }, [load]);

  const requestFollow = async () => {
    setWorking(true);
    const accessToken = await token();
    const response = await fetch("/api/social/connections", { method: "POST", headers: buildAuthHeaders(accessToken, { "Content-Type": "application/json" }), body: JSON.stringify({ targetUserId: userId }) });
    const payload = await response.json().catch(() => ({}));
    if (response.ok) { toast.success("Follow request sent."); await load(); } else toast.error(payload.error ?? "Unable to send request.");
    setWorking(false);
  };

  if (loading) return <div className="grid min-h-[60vh] place-items-center"><Loader2 className="animate-spin text-muted-foreground" /></div>;
  if (!data) return <div className="mx-auto max-w-4xl rounded-3xl border border-border p-12 text-center">Profile unavailable.</div>;
  const name = data.profile.full_name ?? data.profile.username ?? "Krythiq builder";
  const accepted = data.connection?.status === "accepted";
  const pendingMine = data.connection?.status === "pending" && data.connection.requester_id === data.viewerId;
  const pendingTheirs = data.connection?.status === "pending" && data.connection.addressee_id === data.viewerId;
  const hasProfessionalInfo = Object.values(data.professional).some(Boolean);

  return <div className="mx-auto max-w-5xl space-y-6">
    <Button variant="ghost" asChild><Link href="/discover"><ArrowLeft />Back to Discover</Link></Button>
    <Card className="overflow-hidden rounded-3xl"><div className="h-28 bg-[radial-gradient(circle_at_20%_20%,rgba(56,189,248,.25),transparent_35%),radial-gradient(circle_at_80%_30%,rgba(217,70,239,.2),transparent_35%),var(--muted)]" /><CardContent className="relative p-6 pt-0"><Avatar className="-mt-12 size-24 border-4 border-card"><AvatarImage src={data.profile.avatar_url ?? undefined} alt="" /><AvatarFallback className="text-xl">{initials(name)}</AvatarFallback></Avatar><div className="mt-4 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><h1 className="text-3xl font-semibold tracking-tight">{name}</h1>{data.profile.username ? <p className="mt-1 text-sm text-muted-foreground">@{data.profile.username}</p> : null}<p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">Public build activity, verified team projects, and safe scan summaries shared by this user.</p></div>{!data.isSelf ? <div className="flex flex-wrap gap-2">{accepted ? <><Button variant="outline" disabled><UserCheck />Following</Button><Button asChild><Link href={`/discover/messages/${userId}`}><MessageCircle />Message</Link></Button></> : pendingMine ? <Button variant="outline" disabled><Clock3 />Request sent</Button> : pendingTheirs ? <Button asChild><Link href="/discover/requests"><UserPlus />Review request</Link></Button> : <Button onClick={() => void requestFollow()} disabled={working}>{working ? <Loader2 className="animate-spin" /> : <UserPlus />}Request to follow</Button>}</div> : null}</div></CardContent></Card>
    {hasProfessionalInfo ? <Card className="overflow-hidden rounded-3xl"><CardHeader><CardTitle className="flex items-center gap-2"><BriefcaseBusiness className="size-5 text-violet-500" />Professional profile</CardTitle></CardHeader><CardContent><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{data.professional.headline ? <ProfileDetail label="Headline" value={data.professional.headline} icon={BriefcaseBusiness} wide /> : null}{data.professional.role ? <ProfileDetail label="Role" value={data.professional.role} icon={BadgeCheck} /> : null}{data.professional.organization ? <ProfileDetail label="Organization" value={data.professional.organization} icon={Building2} /> : null}{data.professional.companySize ? <ProfileDetail label="Company size" value={companySizeLabel(data.professional.companySize)} icon={UsersRound} /> : null}{data.professional.community ? <ProfileDetail label="Community" value={data.professional.community} icon={UsersRound} /> : null}</div></CardContent></Card> : null}
    <div className="grid gap-6 lg:grid-cols-[1fr_.8fr]">
      <Card className="rounded-3xl"><CardHeader><CardTitle className="flex items-center gap-2"><ScanSearch className="size-5 text-sky-500" />Public activity</CardTitle></CardHeader><CardContent className="space-y-3">{data.posts.map((post) => <Link key={post.id} href={`/discover/${post.id}`} className="block rounded-2xl border border-border p-4 transition hover:bg-muted/50"><p className="line-clamp-3 text-sm leading-6">{post.body}</p>{post.scan_repository ? <div className="mt-3 flex flex-wrap items-center gap-2"><Badge variant="outline">{post.scan_repository}</Badge><span className="text-xs text-muted-foreground">{post.scan_issues ?? 0} issues · score {post.scan_score ?? 0}</span></div> : null}<p className="mt-3 text-xs text-muted-foreground">{new Date(post.created_at).toLocaleDateString()}</p></Link>)}{!data.posts.length ? <p className="py-8 text-center text-sm text-muted-foreground">No public posts yet.</p> : null}</CardContent></Card>
      <Card className="rounded-3xl"><CardHeader><CardTitle className="flex items-center gap-2"><GitFork className="size-5 text-fuchsia-500" />Team projects</CardTitle></CardHeader><CardContent className="space-y-3">{data.projects.map((project) => <div key={project.id} className="rounded-2xl border border-border p-4"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="truncate font-medium">{project.name}</p><p className="truncate text-xs text-muted-foreground">{project.repository}</p></div>{project.verification_status === "verified" ? <Badge className="text-sky-500"><BadgeCheck />Verified</Badge> : null}</div><p className="mt-3 text-xs text-muted-foreground">{project.team_name} · {project.scan_issues ?? 0} issues · score {project.scan_score ?? 0}</p></div>)}{!data.projects.length ? <p className="py-8 text-center text-sm text-muted-foreground">No pinned public projects yet.</p> : null}</CardContent></Card>
    </div>
  </div>;
}

function initials(name: string) { return name.split(" ").filter(Boolean).map((part) => part[0]).slice(0, 2).join("").toUpperCase() || "K"; }
function companySizeLabel(value: string) { return value === "solo" ? "Just me" : value === "201+" ? "201+ people" : `${value} people`; }
function ProfileDetail({ label, value, icon: Icon, wide = false }: { label: string; value: string; icon: typeof BriefcaseBusiness; wide?: boolean }) { return <div className={`rounded-2xl border border-border bg-muted/20 p-4 ${wide ? "sm:col-span-2" : ""}`}><p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground"><Icon className="size-3.5" />{label}</p><p className="mt-2 text-sm font-medium leading-6">{value}</p></div>; }
