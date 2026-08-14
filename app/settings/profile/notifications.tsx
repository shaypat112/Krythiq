"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BellRing, Check, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { createClient } from "@/app/lib/supabase";
import { buildTeamAuthHeaders } from "@/app/lib/http";
import { useTeam } from "@/app/components/TeamProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

type Channel = { id: string; label: string; description: string; available: boolean };
type Event = { id: string; label: string; defaultChannels: string[] };
type Preference = { channel: string; event: string; enabled: boolean };
type NotificationItem = { id: string; type: string; data: Record<string, unknown>; read_at: string | null; created_at: string };

function notificationDetail(item: NotificationItem) {
  const candidates = [item.data.message, item.data.repo_name, item.data.repository, item.data.sender_name, item.data.inviter_name];
  const value = candidates.find((candidate) => typeof candidate === "string" && candidate.trim());
  return typeof value === "string" ? value : "Account activity recorded by Krythiq.";
}

export function NotificationsSection() {
  const supabase = useMemo(() => createClient(), []);
  const { selectedTeamId } = useTeam();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [preferences, setPreferences] = useState<Map<string, boolean>>(new Map());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [notificationPage, setNotificationPage] = useState(1);
  const [notificationLoading, setNotificationLoading] = useState(true);
  const [notificationError, setNotificationError] = useState<string | null>(null);
  const [notificationHasMore, setNotificationHasMore] = useState(false);

  const loadNotifications = useCallback(async (page: number) => {
    setNotificationLoading(true);
    setNotificationError(null);
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) throw new Error("Sign in to view notification history.");
      const response = await fetch(`/api/notifications?page=${page}&pageSize=50`, { headers: buildTeamAuthHeaders(token, selectedTeamId) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error ?? "Unable to load notification history.");
      const rows = (payload.notifications ?? []) as NotificationItem[];
      setNotifications(rows);
      setNotificationPage(page);
      setNotificationHasMore(rows.length === 50);
    } catch (cause) {
      setNotificationError(cause instanceof Error ? cause.message : "Unable to load notification history.");
    } finally {
      setNotificationLoading(false);
    }
  }, [selectedTeamId, supabase]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true); setError(null);
      try {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        if (!token) throw new Error("Sign in to manage notifications.");
        const response = await fetch("/api/notification-preferences", { headers: buildTeamAuthHeaders(token, selectedTeamId) });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload?.error ?? "Unable to load notification preferences.");
        if (!active) return;
        const loadedChannels = payload.channels as Channel[];
        const loadedEvents = payload.events as Event[];
        const stored = payload.preferences as Preference[];
        const next = new Map<string, boolean>();
        for (const event of loadedEvents) for (const channel of loadedChannels) next.set(`${event.id}:${channel.id}`, event.defaultChannels.includes(channel.id) && channel.available);
        for (const preference of stored) next.set(`${preference.event}:${preference.channel}`, preference.enabled);
        setChannels(loadedChannels); setEvents(loadedEvents); setPreferences(next);
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : "Unable to load notification preferences.");
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, [selectedTeamId, supabase]);

  useEffect(() => { void loadNotifications(1); }, [loadNotifications]);

  useEffect(() => {
    let active = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    void supabase.auth.getUser().then(({ data }) => {
      if (!active || !data.user) return;
      channel = supabase.channel(`settings-notifications:${data.user.id}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${data.user.id}` }, () => { void loadNotifications(notificationPage); })
        .subscribe();
    });
    return () => { active = false; if (channel) void supabase.removeChannel(channel); };
  }, [loadNotifications, notificationPage, supabase]);

  const toggle = (event: string, channel: Channel) => {
    if (!channel.available) return;
    const key = `${event}:${channel.id}`;
    setPreferences((current) => new Map(current).set(key, !current.get(key)));
  };

  const save = async () => {
    setSaving(true); setError(null);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("Your session expired. Sign in again.");
      const body = { preferences: events.flatMap((event) => channels.map((channel) => ({ event: event.id, channel: channel.id, enabled: Boolean(preferences.get(`${event.id}:${channel.id}`)) && channel.available }))) };
      const response = await fetch("/api/notification-preferences", { method: "PUT", headers: buildTeamAuthHeaders(token, selectedTeamId, { "Content-Type": "application/json" }), body: JSON.stringify(body) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error ?? "Unable to save notification preferences.");
      toast.success("Notification preferences saved.");
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Unable to save notification preferences.";
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="space-y-4"><Skeleton className="h-24" /><Skeleton className="h-96" /></div>;

  return (
    <div className="space-y-6">
      <header><p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Delivery</p><h1 className="mt-2 text-2xl font-semibold">Notifications</h1><p className="mt-2 text-sm leading-6 text-muted-foreground">Choose exactly which events reach each channel. Channels remain disabled until their integration and delivery adapter are production-ready.</p></header>
      {error ? <div role="alert" className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-500">{error}</div> : null}
      <Card className="overflow-hidden">
        <CardHeader><CardTitle className="flex items-center gap-2"><BellRing className="h-5 w-5" /> Event routing</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead><tr className="border-y border-border bg-muted/30"><th className="px-4 py-3 text-left font-medium">Event</th>{channels.map((channel) => <th key={channel.id} className="px-3 py-3 text-center font-medium"><span>{channel.label}</span>{!channel.available ? <span className="mt-1 block text-[10px] font-normal text-muted-foreground">Not configured</span> : null}</th>)}</tr></thead>
              <tbody>{events.map((event) => <tr key={event.id} className="border-b border-border last:border-b-0"><th className="px-4 py-3 text-left font-normal">{event.label}</th>{channels.map((channel) => { const enabled = Boolean(preferences.get(`${event.id}:${channel.id}`)); return <td key={channel.id} className="px-3 py-3 text-center"><button type="button" role="switch" aria-checked={enabled} aria-label={`${event.label} via ${channel.label}`} disabled={!channel.available} onClick={() => toggle(event.id, channel)} className={`relative h-6 w-11 rounded-full transition ${enabled ? "bg-emerald-500" : "bg-muted"} disabled:cursor-not-allowed disabled:opacity-35`}><span className={`absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition-transform ${enabled ? "translate-x-5" : "translate-x-0"}`} /></button></td>; })}</tr>)}</tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      <Button onClick={() => void save()} disabled={saving}>{saving ? <Loader2 className="animate-spin" /> : <Check />}{saving ? "Saving…" : "Save notification preferences"}</Button>

      <section className="border-t border-border pt-8" aria-labelledby="notification-history-title">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="notification-history-title" className="text-base font-semibold">Notification history</h2>
            <p className="mt-1 text-sm text-muted-foreground">Every in-app notification recorded for your account, newest first.</p>
          </div>
          <span className="text-xs text-muted-foreground">Page {notificationPage} · up to 50 per page</span>
        </div>

        <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 text-zinc-100 shadow-sm">
          <Table className="table-fixed">
            <TableHeader className="bg-zinc-900/80 [&_tr]:border-zinc-800">
              <TableRow className="border-zinc-800 hover:bg-zinc-900/80">
                <TableHead className="w-[46%] px-4 text-zinc-400">Notification</TableHead>
                <TableHead className="w-[18%] px-4 text-zinc-400">Status</TableHead>
                <TableHead className="w-[36%] px-4 text-zinc-400">Timestamp</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {notificationLoading ? <TableRow className="border-zinc-800 hover:bg-transparent"><TableCell colSpan={3} className="h-28 text-center text-zinc-400"><span className="inline-flex items-center gap-2"><Loader2 className="size-4 animate-spin" />Loading notification history…</span></TableCell></TableRow> : notificationError ? <TableRow className="border-zinc-800 hover:bg-transparent"><TableCell colSpan={3} className="h-28 whitespace-normal px-4 text-center text-red-400">{notificationError}</TableCell></TableRow> : notifications.length ? notifications.map((item) => {
                const label = events.find((event) => event.id === item.type)?.label ?? item.type.split(".").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
                return <TableRow key={item.id} className="border-zinc-800 hover:bg-zinc-900/60">
                  <TableCell className="whitespace-normal px-4 py-3"><p className="font-medium text-zinc-100">{label}</p><p className="mt-1 line-clamp-2 text-xs leading-5 text-zinc-400">{notificationDetail(item)}</p></TableCell>
                  <TableCell className="px-4 py-3"><Badge variant="outline" className={item.read_at ? "border-zinc-700 text-zinc-400" : "border-sky-500/40 bg-sky-500/10 text-sky-300"}>{item.read_at ? "Read" : "Unread"}</Badge></TableCell>
                  <TableCell className="whitespace-normal px-4 py-3"><time dateTime={item.created_at} className="text-sm text-zinc-200">{new Date(item.created_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}</time><p className="mt-1 text-xs text-zinc-500">{new Date(item.created_at).toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p></TableCell>
                </TableRow>;
              }) : <TableRow className="border-zinc-800 hover:bg-transparent"><TableCell colSpan={3} className="h-28 text-center text-zinc-400">No notifications have been recorded yet.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>

        <div className="mt-4 flex items-center justify-end gap-2">
          <Button size="sm" variant="outline" disabled={notificationLoading || notificationPage === 1} onClick={() => void loadNotifications(notificationPage - 1)}><ChevronLeft />Previous</Button>
          <Button size="sm" variant="outline" disabled={notificationLoading || !notificationHasMore} onClick={() => void loadNotifications(notificationPage + 1)}>Next<ChevronRight /></Button>
        </div>
      </section>
    </div>
  );
}
