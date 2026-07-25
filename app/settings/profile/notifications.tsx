"use client";

import { useEffect, useMemo, useState } from "react";
import { BellRing, Check, Loader2 } from "lucide-react";
import { createClient } from "@/app/lib/supabase";
import { buildTeamAuthHeaders } from "@/app/lib/http";
import { useTeam } from "@/app/components/TeamProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

type Channel = { id: string; label: string; description: string; available: boolean };
type Event = { id: string; label: string; defaultChannels: string[] };
type Preference = { channel: string; event: string; enabled: boolean };

export function NotificationsSection() {
  const supabase = useMemo(() => createClient(), []);
  const { selectedTeamId } = useTeam();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [preferences, setPreferences] = useState<Map<string, boolean>>(new Map());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    </div>
  );
}
