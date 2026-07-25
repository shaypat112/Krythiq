"use client";

import { useSettings } from "./context";
import { SectionCard, FieldGroup, StyledInput, GhostButton } from "./primitives";
import { Loader2, Save, X } from "lucide-react";

export function AccountSection() {
  const { settings, update, save, saving, setStatus } = useSettings();

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
