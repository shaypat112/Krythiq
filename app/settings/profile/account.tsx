"use client";

import { useMemo, useState } from "react";
import { useSettings } from "./context";
import { SectionCard, FieldGroup, StyledInput, GhostButton } from "./primitives";
import { createClient } from "@/app/lib/supabase";
import { isValidEmail, normalizeEmail } from "@/app/lib/auth-validation";
import { KeyRound, Loader2, Mail, Save, X } from "lucide-react";

export function AccountSection() {
  const { settings, update, save, saving, setStatus, setError } = useSettings();
  const supabase = useMemo(() => createClient(), []);
  const [newEmail, setNewEmail] = useState("");
  const [authAction, setAuthAction] = useState<"email" | "reauth" | null>(null);

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

  const requestEmailChange = async () => {
    const email = normalizeEmail(newEmail);
    if (!isValidEmail(email)) {
      setError("Enter a valid new email address.");
      return;
    }
    setAuthAction("email");
    setError(null);
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent("/settings?section=account")}`;
    const { error } = await supabase.auth.updateUser({ email }, { emailRedirectTo: redirectTo });
    setAuthAction(null);
    if (error) {
      setError(error.message);
      return;
    }
    setNewEmail("");
    setStatus("Verification emails sent. Complete the requested confirmation steps to change your address.");
  };

  const requestReauthentication = async () => {
    setAuthAction("reauth");
    setError(null);
    const { error } = await supabase.auth.reauthenticate();
    setAuthAction(null);
    if (error) {
      setError(error.message);
      return;
    }
    setStatus("A reauthentication code was sent to your account email.");
  };

  return (
    <SectionCard
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

      <div className="mt-6 space-y-4 border-t border-border pt-6">
        <div>
          <h3 className="text-sm font-medium">Email and identity</h3>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Verify a new email address or request a fresh identity check before sensitive account changes.
          </p>
        </div>
        <FieldGroup label="New email address">
          <StyledInput
            type="email"
            value={newEmail}
            onChange={(event) => setNewEmail(event.target.value)}
            placeholder="you@company.com"
          />
        </FieldGroup>
        <div className="flex flex-wrap gap-2">
          <GhostButton onClick={requestEmailChange} disabled={authAction !== null || !newEmail}>
            {authAction === "email" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
            {authAction === "email" ? "Sending…" : "Change email"}
          </GhostButton>
          <GhostButton onClick={requestReauthentication} disabled={authAction !== null}>
            {authAction === "reauth" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <KeyRound className="h-3.5 w-3.5" />}
            {authAction === "reauth" ? "Sending…" : "Reauthenticate"}
          </GhostButton>
        </div>
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
  );
}
