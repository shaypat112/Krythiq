"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, CheckCircle2, KeyRound, Loader2, Mail, ShieldCheck } from "lucide-react";
import { createClient } from "@/app/lib/supabase";
import { isValidEmail, normalizeEmail } from "@/app/lib/auth-validation";
import { buildTeamAuthHeaders } from "@/app/lib/http";
import { useTeam } from "@/app/components/TeamProvider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { ReferralSection } from "./referrals";

type EmailEvent = { id: string; label: string; defaultChannels: string[] };
type Preference = { channel: string; event: string; enabled: boolean };

export function EmailSection() {
  const supabase = useMemo(() => createClient(), []);
  const { selectedTeamId } = useTeam();
  const [currentEmail, setCurrentEmail] = useState("");
  const [emailVerified, setEmailVerified] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [events, setEvents] = useState<EmailEvent[]>([]);
  const [preferences, setPreferences] = useState<Map<string, boolean>>(new Map());
  const [deliveryAvailable, setDeliveryAvailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [authAction, setAuthAction] = useState<"email" | "reauth" | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data } = await supabase.auth.getSession();
        const session = data.session;
        if (!session) throw new Error("Sign in to manage email settings.");
        setCurrentEmail(session.user.email ?? "");
        setEmailVerified(Boolean(session.user.email_confirmed_at));

        const response = await fetch("/api/notification-preferences", {
          headers: buildTeamAuthHeaders(session.access_token, selectedTeamId),
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload?.error ?? "Unable to load email preferences.");
        if (!active) return;

        const emailChannel = (payload.channels as Array<{ id: string; available: boolean }>).find((channel) => channel.id === "email");
        const loadedEvents = payload.events as EmailEvent[];
        const stored = payload.preferences as Preference[];
        const next = new Map<string, boolean>();
        for (const event of loadedEvents) next.set(event.id, event.defaultChannels.includes("email") && Boolean(emailChannel?.available));
        for (const preference of stored) {
          if (preference.channel === "email") next.set(preference.event, preference.enabled);
        }
        setDeliveryAvailable(Boolean(emailChannel?.available));
        setEvents(loadedEvents);
        setPreferences(next);
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : "Unable to load email settings.");
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, [selectedTeamId, supabase]);

  const requestEmailChange = async () => {
    const email = normalizeEmail(newEmail);
    if (!isValidEmail(email)) {
      setError("Enter a valid new email address.");
      return;
    }
    if (email === normalizeEmail(currentEmail)) {
      setError("Enter a different email address.");
      return;
    }
    setAuthAction("email");
    setError(null);
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent("/settings?section=email")}`;
    const { error: updateError } = await supabase.auth.updateUser({ email }, { emailRedirectTo: redirectTo });
    setAuthAction(null);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setNewEmail("");
    toast.success("Verification emails sent. Complete the confirmation steps to change your address.");
  };

  const requestReauthentication = async () => {
    setAuthAction("reauth");
    setError(null);
    const { error: reauthError } = await supabase.auth.reauthenticate();
    setAuthAction(null);
    if (reauthError) {
      setError(reauthError.message);
      return;
    }
    toast.success("A reauthentication code was sent to your account email.");
  };

  const savePreferences = async () => {
    setSaving(true);
    setError(null);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("Your session expired. Sign in again.");
      const response = await fetch("/api/notification-preferences", {
        method: "PUT",
        headers: buildTeamAuthHeaders(token, selectedTeamId, { "Content-Type": "application/json" }),
        body: JSON.stringify({
          preferences: events.map((event) => ({
            event: event.id,
            channel: "email",
            enabled: deliveryAvailable && Boolean(preferences.get(event.id)),
          })),
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error ?? "Unable to save email preferences.");
      toast.success("Email preferences saved.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save email preferences.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="space-y-4"><Skeleton className="h-36" /><Skeleton className="h-96" /></div>;

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Personal delivery</p>
        <h1 className="mt-2 text-2xl font-semibold">Email</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">Manage your sign-in address and choose which security events are emailed to you. These choices apply to your user account in the selected workspace.</p>
      </header>

      {error ? <div role="alert" className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-500">{error}</div> : null}

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Mail className="h-5 w-5" /> Email identity</CardTitle></CardHeader>
        <CardContent className="space-y-5">
          <div className="flex flex-col gap-3 rounded-xl border border-border bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div><p className="text-xs text-muted-foreground">Current email</p><p className="mt-1 break-all text-sm font-medium">{currentEmail || "No email address"}</p></div>
            <Badge variant="outline" className={emailVerified ? "text-emerald-500" : "text-amber-500"}>
              {emailVerified ? <CheckCircle2 /> : <ShieldCheck />}
              {emailVerified ? "Verified" : "Verification required"}
            </Badge>
          </div>
          <div>
            <label htmlFor="new-email" className="text-sm font-medium">Change email address</label>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <Input id="new-email" type="email" autoComplete="email" value={newEmail} onChange={(event) => setNewEmail(event.target.value)} placeholder="you@company.com" />
              <Button type="button" variant="outline" onClick={() => void requestEmailChange()} disabled={authAction !== null || !newEmail.trim()}>
                {authAction === "email" ? <Loader2 className="animate-spin" /> : <Mail />}
                {authAction === "email" ? "Sending…" : "Change email"}
              </Button>
            </div>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">For security, Supabase may require confirmation from both your current and new addresses.</p>
          </div>
          <Button type="button" variant="outline" onClick={() => void requestReauthentication()} disabled={authAction !== null}>
            {authAction === "reauth" ? <Loader2 className="animate-spin" /> : <KeyRound />}
            {authAction === "reauth" ? "Sending…" : "Send reauthentication code"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Email delivery</CardTitle>
          <p className="text-sm text-muted-foreground">{deliveryAvailable ? `Messages are sent to ${currentEmail}.` : "Email delivery is not configured for this deployment yet."}</p>
        </CardHeader>
        <CardContent className="space-y-1">
          {events.map((event) => {
            const enabled = Boolean(preferences.get(event.id));
            return (
              <div key={event.id} className="flex items-center justify-between gap-4 border-b border-border py-3 last:border-0">
                <label htmlFor={`email-${event.id}`} className="text-sm">{event.label}</label>
                <button
                  id={`email-${event.id}`}
                  type="button"
                  role="switch"
                  aria-checked={enabled}
                  disabled={!deliveryAvailable}
                  onClick={() => setPreferences((current) => new Map(current).set(event.id, !enabled))}
                  className={`relative h-6 w-11 shrink-0 rounded-full transition ${enabled ? "bg-emerald-500" : "bg-muted"} disabled:cursor-not-allowed disabled:opacity-35`}
                >
                  <span className={`absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition-transform ${enabled ? "translate-x-5" : "translate-x-0"}`} />
                </button>
              </div>
            );
          })}
          <Button className="mt-5" onClick={() => void savePreferences()} disabled={saving || !deliveryAvailable}>
            {saving ? <Loader2 className="animate-spin" /> : <Check />}
            {saving ? "Saving…" : "Save email preferences"}
          </Button>
        </CardContent>
      </Card>
      <ReferralSection />
    </div>
  );
}
