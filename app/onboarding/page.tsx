"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Building2, Check, Code2, Gamepad2, GraduationCap, Loader2, Rocket, ShieldCheck, UserRound } from "lucide-react";

import { createClient } from "@/app/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const experienceOptions = [
  { id: "new", label: "New to development", icon: GraduationCap },
  { id: "shipping", label: "Already shipping apps", icon: Rocket },
  { id: "professional", label: "Engineering team", icon: Code2 },
] as const;

const goalOptions = [
  "Scan my first repository",
  "Understand security findings",
  "Prepare an app for production",
] as const;

const workspaceOptions = [
  { id: "personal", label: "Personal", detail: "My own projects", icon: UserRound },
  { id: "company", label: "Company", detail: "A startup or team", icon: Building2 },
  { id: "community", label: "Community", detail: "A Discord server or group", icon: Gamepad2 },
] as const;

function requestedDestination() {
  const requested = new URLSearchParams(window.location.search).get("next");
  return requested?.startsWith("/") && !requested.startsWith("//") ? requested : "/dashboard";
}

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [experience, setExperience] = useState("");
  const [goal, setGoal] = useState("");
  const [workspaceType, setWorkspaceType] = useState<"personal" | "company" | "community">("personal");
  const [organizationName, setOrganizationName] = useState("");
  const [roleTitle, setRoleTitle] = useState("");
  const [organizationSize, setOrganizationSize] = useState("");
  const [communityServerName, setCommunityServerName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void supabase.auth.getUser().then(({ data, error: userError }) => {
      if (!active) return;
      if (userError || !data.user) {
        router.replace(`/auth?next=${encodeURIComponent(requestedDestination())}`);
        return;
      }
      if (!data.user.email_confirmed_at) {
        router.replace(`/auth?verification=required&next=${encodeURIComponent(requestedDestination())}`);
        return;
      }
      if (data.user.user_metadata?.onboarding_completed === true) {
        router.replace(requestedDestination());
        return;
      }
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [router, supabase]);

  const finish = async () => {
    if (!experience || !goal) {
      setError("Choose an experience level and your first goal.");
      return;
    }
    if (workspaceType !== "personal" && organizationName.trim().length < 2) {
      setError(workspaceType === "company" ? "Enter your company or organization name." : "Enter your community name.");
      return;
    }
    setSaving(true);
    setError(null);
    const { data } = await supabase.auth.getUser();
    if (workspaceType !== "personal") {
      const session = (await supabase.auth.getSession()).data.session;
      if (!session?.access_token) { setError("Your session expired. Sign in again."); setSaving(false); return; }
      const teamResponse = await fetch("/api/teams/create", { method: "POST", headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" }, body: JSON.stringify({ name: organizationName.trim(), source: "onboarding" }) });
      const teamPayload = await teamResponse.json().catch(() => ({}));
      if (!teamResponse.ok) { setError(teamPayload.error ?? "We could not create the organization workspace."); setSaving(false); return; }
    }
    const { error: updateError } = await supabase.auth.updateUser({
      data: {
        ...(data.user?.user_metadata ?? {}),
        onboarding_completed: true,
        developer_experience: experience,
        onboarding_goal: goal,
        workspace_type: workspaceType,
        organization_name: workspaceType === "personal" ? null : organizationName.trim(),
        role_title: roleTitle.trim() || null,
        organization_size: organizationSize || null,
        community_server_name: workspaceType === "community" ? communityServerName.trim() || organizationName.trim() : null,
      },
    });
    if (updateError) {
      setError("We could not finish setup. Please try again.");
      setSaving(false);
      return;
    }
    router.replace(requestedDestination());
    router.refresh();
  };

  if (loading) {
    return (
      <div className="grid min-h-[60vh] place-items-center" role="status">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Preparing your workspace…
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl py-6">
      <div className="mb-8">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5" />
          One-minute setup
        </span>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
          Make Krythiq useful from your first scan.
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
          We’ll use these choices to keep explanations simple and prioritize the next action that fits how you build.
        </p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader><CardTitle className="text-lg">What are you setting up?</CardTitle></CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">{workspaceOptions.map(({ id, label, detail, icon: Icon }) => <button key={id} type="button" onClick={() => setWorkspaceType(id)} aria-pressed={workspaceType === id} className={`relative rounded-xl border p-4 text-left transition ${workspaceType === id ? "border-foreground/40 bg-muted" : "border-border hover:bg-muted/40"}`}><Icon className="h-5 w-5" /><span className="mt-3 block text-sm font-medium">{label}</span><span className="mt-1 block text-xs text-muted-foreground">{detail}</span>{workspaceType === id ? <Check className="absolute right-3 top-3 h-4 w-4" /> : null}</button>)}</CardContent>
        </Card>

        {workspaceType !== "personal" ? <Card><CardHeader><CardTitle className="text-lg">{workspaceType === "company" ? "Company details" : "Community and server details"}</CardTitle></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2"><div><label htmlFor="organization-name" className="mb-2 block text-sm font-medium">{workspaceType === "company" ? "Company or organization name" : "Community name"}</label><Input id="organization-name" value={organizationName} onChange={(event) => setOrganizationName(event.target.value.slice(0, 120))} placeholder={workspaceType === "company" ? "Acme Labs" : "Builder community"} /></div><div><label htmlFor="role-title" className="mb-2 block text-sm font-medium">Your role</label><Input id="role-title" value={roleTitle} onChange={(event) => setRoleTitle(event.target.value.slice(0, 120))} placeholder="Founder, engineer, moderator…" /></div><div><label htmlFor="organization-size" className="mb-2 block text-sm font-medium">Size</label><select id="organization-size" value={organizationSize} onChange={(event) => setOrganizationSize(event.target.value)} className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm"><option value="">Choose a range</option><option value="2-10">2–10</option><option value="11-50">11–50</option><option value="51-200">51–200</option><option value="201+">201+</option></select></div>{workspaceType === "community" ? <div><label htmlFor="server-name" className="mb-2 block text-sm font-medium">Discord server name</label><Input id="server-name" value={communityServerName} onChange={(event) => setCommunityServerName(event.target.value.slice(0, 120))} placeholder="Optional if different" /></div> : null}</CardContent></Card> : <Card><CardHeader><CardTitle className="text-lg">Professional context</CardTitle></CardHeader><CardContent><label htmlFor="personal-role" className="mb-2 block text-sm font-medium">Role or headline</label><Input id="personal-role" value={roleTitle} onChange={(event) => setRoleTitle(event.target.value.slice(0, 120))} placeholder="Student developer, indie hacker, engineer…" /></CardContent></Card>}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">How do you build today?</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            {experienceOptions.map(({ id, label, icon: Icon }) => {
              const selected = experience === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setExperience(id)}
                  aria-pressed={selected}
                  className={`relative rounded-xl border p-4 text-left transition ${
                    selected
                      ? "border-foreground/40 bg-muted"
                      : "border-border hover:border-foreground/20 hover:bg-muted/40"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="mt-4 block text-sm font-medium">{label}</span>
                  {selected ? <Check className="absolute right-3 top-3 h-4 w-4" /> : null}
                </button>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">What should we help with first?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {goalOptions.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setGoal(option)}
                aria-pressed={goal === option}
                className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-sm transition ${
                  goal === option
                    ? "border-foreground/40 bg-muted font-medium"
                    : "border-border hover:bg-muted/40"
                }`}
              >
                {option}
                {goal === option ? <Check className="h-4 w-4" /> : null}
              </button>
            ))}
          </CardContent>
        </Card>

        {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
        <div className="flex justify-end">
          <Button size="lg" onClick={() => void finish()} disabled={saving}>
            {saving ? <Loader2 className="animate-spin" /> : null}
            {saving ? "Creating workspace…" : "Continue to Krythiq"}
            {!saving ? <ArrowRight /> : null}
          </Button>
        </div>
      </div>
    </div>
  );
}
