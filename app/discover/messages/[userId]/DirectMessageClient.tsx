"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/app/lib/supabase";
import { buildAuthHeaders } from "@/app/lib/http";
import { cn } from "@/app/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type Message = { id: string; connection_id: string; sender_id: string; body: string; read_at?: string | null; created_at: string };
type Payload = { connectionId: string; messages: Message[]; peer: { id: string; username?: string | null; full_name?: string | null; avatar_url?: string | null } | null; viewerId: string };

export function DirectMessageClient({ userId }: { userId: string }) {
  const supabase = useMemo(() => createClient(), []);
  const [data, setData] = useState<Payload | null>(null);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const auth = useCallback(async () => (await supabase.auth.getSession()).data.session?.access_token ?? "", [supabase]);
  const load = useCallback(async () => { const token = await auth(); const response = await fetch(`/api/social/messages/${encodeURIComponent(userId)}`, { headers: buildAuthHeaders(token) }); const payload = await response.json().catch(() => ({})); if (response.ok) setData(payload as Payload); else toast.error(payload.error ?? "Unable to load messages."); setLoading(false); }, [auth, userId]);
  useEffect(() => { const timer = window.setTimeout(() => { void load(); }, 0); return () => window.clearTimeout(timer); }, [load]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [data?.messages]);
  useEffect(() => {
    if (!data?.connectionId) return;
    const channel = supabase.channel(`dm:${data.connectionId}`).on("postgres_changes", { event: "INSERT", schema: "public", table: "social_messages", filter: `connection_id=eq.${data.connectionId}` }, (event) => {
      const message = event.new as Message;
      setData((current) => current ? { ...current, messages: [...current.messages.filter((item) => item.id !== message.id), message] } : current);
    }).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [data?.connectionId, supabase]);
  const send = async () => { const body = draft.trim(); if (!body) return; setSending(true); const token = await auth(); const response = await fetch(`/api/social/messages/${encodeURIComponent(userId)}`, { method: "POST", headers: buildAuthHeaders(token, { "Content-Type": "application/json" }), body: JSON.stringify({ body }) }); const payload = await response.json().catch(() => ({})); if (response.ok) { setDraft(""); const message = payload.message as Message; setData((current) => current ? { ...current, messages: [...current.messages.filter((item) => item.id !== message.id), message] } : current); } else toast.error(payload.error ?? "Unable to send message."); setSending(false); };
  if (loading) return <div className="grid min-h-[60vh] place-items-center"><Loader2 className="animate-spin text-muted-foreground" /></div>;
  if (!data) return <div className="mx-auto max-w-3xl space-y-5"><Button variant="ghost" asChild><Link href={`/discover/people/${userId}`}><ArrowLeft />Back to profile</Link></Button><Card><CardContent className="p-12 text-center"><p className="font-medium">Conversation unavailable</p><p className="mt-2 text-sm text-muted-foreground">Both people must be connected before messaging.</p></CardContent></Card></div>;
  const name = data.peer?.full_name ?? data.peer?.username ?? "Krythiq user";
  return <div className="mx-auto max-w-3xl space-y-5"><Button variant="ghost" asChild><Link href={`/discover/people/${userId}`}><ArrowLeft />Back to profile</Link></Button><Card className="overflow-hidden rounded-3xl"><CardHeader className="border-b border-border"><CardTitle className="flex items-center gap-3"><Avatar><AvatarImage src={data.peer?.avatar_url ?? undefined} alt="" /><AvatarFallback>{name.slice(0, 2).toUpperCase()}</AvatarFallback></Avatar><span><span className="block">{name}</span>{data.peer?.username ? <span className="block text-xs font-normal text-muted-foreground">@{data.peer.username} · private conversation</span> : null}</span></CardTitle></CardHeader><CardContent className="p-0"><div className="h-[min(58svh,560px)] space-y-3 overflow-y-auto p-5">{data.messages.map((message) => { const mine = message.sender_id === data.viewerId; return <div key={message.id} className={cn("flex", mine ? "justify-end" : "justify-start")}><div className={cn("max-w-[78%] rounded-2xl px-4 py-2.5", mine ? "bg-primary text-primary-foreground" : "bg-muted")}><p className="whitespace-pre-wrap break-words text-sm leading-6">{message.body}</p><p className={cn("mt-1 text-[10px]", mine ? "text-primary-foreground/60" : "text-muted-foreground")}>{new Date(message.created_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</p></div></div>; })}{!data.messages.length ? <div className="grid h-full place-items-center text-center"><div><p className="font-medium">Start the conversation</p><p className="mt-1 text-sm text-muted-foreground">Messages are visible only to the two connected users.</p></div></div> : null}<div ref={bottomRef} /></div><form className="flex gap-2 border-t border-border p-4" onSubmit={(event) => { event.preventDefault(); void send(); }}><Input value={draft} onChange={(event) => setDraft(event.target.value.slice(0, 2000))} placeholder={`Message ${name}`} aria-label={`Message ${name}`} autoComplete="off" /><Button type="submit" disabled={!draft.trim() || sending}>{sending ? <Loader2 className="animate-spin" /> : <Send />}Send</Button></form></CardContent></Card></div>;
}
