"use client";

import { useSettings } from "./context";
import { SectionCard, FieldGroup, StyledInput, GhostButton } from "./primitives";
import { Loader2, Save, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/app/lib/supabase";
import type { Provider } from "@supabase/supabase-js";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RepositoryConnections } from "./repositories";

export function AccountSection() {
  const { settings, update, save, saving, setStatus, setError } = useSettings();

  const handleSave = async () => {
    setStatus(null);
    await save();
  };

  const handleCancel = () => {
    setStatus(null);
    // Reset to default or reload from server would go here
    setStatus("Changes cancelled.");
    setTimeout(() => setStatus(null), 2000);
  };

  const supabase = useMemo(() => createClient(), []);
  const [identities, setIdentities] = useState<string[]>([]);
  const [linking, setLinking] = useState<string | null>(null);
  useEffect(() => { void supabase.auth.getUser().then(({ data }) => setIdentities(data.user?.identities?.map((identity) => identity.provider) ?? [])); }, [supabase]);
  const link = async (provider: Provider, scopes: string) => {
    setLinking(provider);
    const { error } = await supabase.auth.linkIdentity({ provider, options: { scopes, redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent("/settings?section=account")}` } });
    if (error) { setLinking(null); setError(error.message); }
  };

  return (
    <div className="space-y-6"><SectionCard
      title="Account"
      description="Your personal profile information."
    >
      <FieldGroup label="Full name">
        <StyledInput
          value={settings.fullName}
          onChange={(e) => update("fullName", e.target.value)}
          placeholder="Jane Smith"
        />
      </FieldGroup>

      <FieldGroup label="Username">
        <StyledInput
          value={settings.username}
          onChange={(e) => update("username", e.target.value)}
          placeholder="janesmith"
        />
      </FieldGroup>

      <FieldGroup label="Avatar URL">
        <StyledInput
          value={settings.avatarUrl}
          onChange={(e) => update("avatarUrl", e.target.value)}
          placeholder="https://…"
        />
      </FieldGroup>

      <div className="grid gap-4 border-t border-border pt-5 sm:grid-cols-2">
        <FieldGroup label="Professional headline"><StyledInput value={settings.professionalHeadline} onChange={(e) => update("professionalHeadline", e.target.value.slice(0, 160))} placeholder="Security-minded full-stack developer" /></FieldGroup>
        <FieldGroup label="Role"><StyledInput value={settings.roleTitle} onChange={(e) => update("roleTitle", e.target.value.slice(0, 120))} placeholder="Founder, engineer, student…" /></FieldGroup>
        <FieldGroup label="Company or organization"><StyledInput value={settings.companyName} onChange={(e) => update("companyName", e.target.value.slice(0, 200))} placeholder="Organization name" /></FieldGroup>
        <FieldGroup label="Company size"><select value={settings.companySize} onChange={(e) => update("companySize", e.target.value)} className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm"><option value="">Not specified</option><option value="solo">Just me</option><option value="2-10">2–10</option><option value="11-50">11–50</option><option value="51-200">51–200</option><option value="201+">201+</option></select></FieldGroup>
        <FieldGroup label="Discord server or community"><StyledInput value={settings.communityServerName} onChange={(e) => update("communityServerName", e.target.value.slice(0, 200))} placeholder="Community name (optional)" /></FieldGroup>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-border mt-4">
        <div className="flex gap-2">
          <GhostButton onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <Save className="h-3.5 w-3.5" />
                Save changes
              </>
            )}
          </GhostButton>
          <GhostButton onClick={handleCancel} disabled={saving}>
            <X className="h-3.5 w-3.5" />
            Cancel
          </GhostButton>
        </div>
      </div>
    </SectionCard>
    <SectionCard title="Connected sign-in methods" description="Link identities for convenient sign-in. This does not grant repository, server-admin, posting, or company-page permissions.">
      {[
        { provider: "github" as Provider, label: "GitHub", scopes: "read:user user:email" },
        { provider: "discord" as Provider, label: "Discord", scopes: "identify email" },
        { provider: "linkedin_oidc" as Provider, label: "LinkedIn", scopes: "openid profile email" },
      ].map((item) => { const connected = identities.includes(item.provider); return <div key={item.provider} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3"><div><p className="text-sm font-medium">{item.label}</p><p className="text-xs text-muted-foreground">{connected ? "Linked to this Krythiq account" : "Not connected"}</p></div>{connected ? <Badge variant="outline">Connected</Badge> : <Button size="sm" variant="outline" disabled={linking !== null} onClick={() => void link(item.provider, item.scopes)}>{linking === item.provider ? <Loader2 className="animate-spin" /> : null}Link</Button>}</div>; })}
    </SectionCard>
    <RepositoryConnections /></div>
  );
}
