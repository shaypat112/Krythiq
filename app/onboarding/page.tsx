"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Code2, GraduationCap, Loader2, Rocket, ShieldCheck } from "lucide-react";

import { createClient } from "@/app/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [experience, setExperience] = useState("");
  const [goal, setGoal] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void supabase.auth.getUser().then(({ data, error: userError }) => {
      if (!active) return;
      if (userError || !data.user) {
        router.replace("/auth");
        return;
      }
      if (!data.user.email_confirmed_at) {
        router.replace("/auth?verification=required");
        return;
      }
      if (data.user.user_metadata?.onboarding_completed === true) {
        router.replace("/dashboard");
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
    setSaving(true);
    setError(null);
    const { data } = await supabase.auth.getUser();
    const { error: updateError } = await supabase.auth.updateUser({
      data: {
        ...(data.user?.user_metadata ?? {}),
        onboarding_completed: true,
        developer_experience: experience,
        onboarding_goal: goal,
      },
    });
    if (updateError) {
      setError("We could not finish setup. Please try again.");
      setSaving(false);
      return;
    }
    const requested = new URLSearchParams(window.location.search).get("next");
    const destination = requested?.startsWith("/") && !requested.startsWith("//")
      ? requested
      : "/dashboard";
    router.replace(destination);
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
    <div className="mx-auto max-w-3xl py-6">
      <div className="mb-8">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5" />
          One-minute setup
        </span>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
          Make Votrio useful from your first scan.
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
          We’ll use these choices to keep explanations simple and prioritize the next action that fits how you build.
        </p>
      </div>

      <div className="space-y-6">
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
            {saving ? "Creating workspace…" : "Continue to Votrio"}
            {!saving ? <ArrowRight /> : null}
          </Button>
        </div>
      </div>
    </div>
  );
}
