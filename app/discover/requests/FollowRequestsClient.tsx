"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, Loader2, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/app/lib/supabase";
import { buildAuthHeaders } from "@/app/lib/http";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type RequestItem = { id: string; requester_id: string; created_at: string; profile?: { username?: string | null; full_name?: string | null; avatar_url?: string | null } | null };

export function FollowRequestsClient() {
  const supabase = useMemo(() => createClient(), []);
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState("");
  const load = useCallback(async () => { const token = (await supabase.auth.getSession()).data.session?.access_token ?? ""; const response = await fetch("/api/social/connections", { headers: buildAuthHeaders(token) }); const payload = await response.json().catch(() => ({})); if (response.ok) setRequests(payload.requests ?? []); else toast.error(payload.error ?? "Unable to load requests."); setLoading(false); }, [supabase]);
  useEffect(() => { const timer = window.setTimeout(() => { void load(); }, 0); return () => window.clearTimeout(timer); }, [load]);
  const respond = async (connectionId: string, action: "accept" | "decline") => { setWorking(connectionId); const token = (await supabase.auth.getSession()).data.session?.access_token ?? ""; const response = await fetch("/api/social/connections", { method: "PATCH", headers: buildAuthHeaders(token, { "Content-Type": "application/json" }), body: JSON.stringify({ connectionId, action }) }); const payload = await response.json().catch(() => ({})); if (response.ok) { toast.success(action === "accept" ? "Follow request accepted." : "Follow request declined."); await load(); } else toast.error(payload.error ?? "Unable to update request."); setWorking(""); };
  return <div className="mx-auto max-w-3xl space-y-5"><Button variant="ghost" asChild><Link href="/discover"><ArrowLeft />Back to Discover</Link></Button><Card className="rounded-3xl"><CardHeader><CardTitle className="flex items-center gap-2"><UserPlus className="size-5 text-sky-500" />Follow requests</CardTitle></CardHeader><CardContent className="space-y-3">{loading ? <div className="grid min-h-40 place-items-center"><Loader2 className="animate-spin text-muted-foreground" /></div> : requests.length ? requests.map((item) => { const name = item.profile?.full_name ?? item.profile?.username ?? "Krythiq user"; return <div key={item.id} className="flex flex-col gap-3 rounded-2xl border border-border p-4 sm:flex-row sm:items-center"><Link href={`/discover/people/${item.requester_id}`} className="flex min-w-0 flex-1 items-center gap-3"><Avatar><AvatarImage src={item.profile?.avatar_url ?? undefined} alt="" /><AvatarFallback>{name.slice(0, 2).toUpperCase()}</AvatarFallback></Avatar><div className="min-w-0"><p className="truncate font-medium">{name}</p>{item.profile?.username ? <p className="text-xs text-muted-foreground">@{item.profile.username}</p> : null}</div></Link><div className="flex gap-2"><Button size="sm" onClick={() => void respond(item.id, "accept")} disabled={working === item.id}><Check />Accept</Button><Button size="sm" variant="outline" onClick={() => void respond(item.id, "decline")} disabled={working === item.id}><X />Decline</Button></div></div>; }) : <p className="py-12 text-center text-sm text-muted-foreground">No pending follow requests.</p>}</CardContent></Card></div>;
}
