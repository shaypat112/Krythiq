"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { buildAuthHeaders } from "@/app/lib/http";
import { useSettings } from "./context";
import {
  SectionCard,
  Toggle,
  FieldGroup,
  StyledInput,
  GhostButton,
} from "./primitives";

const WEBHOOK_EVENTS = [
  { id: "scan.completed", label: "Scan completed" },
  { id: "scan.failed", label: "Scan failed" },
] as const;

export function WebhooksSection() {
  const { settings, update, accessToken, save, setError, setStatus } = useSettings();
  const [testing, setTesting] = useState(false);

  const testWebhook = async () => {
    if (!accessToken) return;
    setTesting(true);
    setStatus(null);
    setError(null);

    if (!(await save())) { setTesting(false); return; }
    const res = await fetch("/api/settings/test-webhook", {
      method: "POST",
      headers: buildAuthHeaders(accessToken, { "Content-Type": "application/json" }),
      body: JSON.stringify({ webhookUrl: settings.webhookUrl, webhookSecret: settings.webhookSecret }),
    });

    if (res.ok) {
      setStatus("Test event delivered.");
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data?.error ?? "Webhook test failed.");
    }
    setTesting(false);
  };

  const toggleEvent = (id: string, checked: boolean) => {
    const next = checked
      ? [...settings.webhookEvents, id]
      : settings.webhookEvents.filter((x) => x !== id);
    update("webhookEvents", next);
  };

  return (
    <SectionCard
      title="Webhooks"
      description="Push scan events to your own infrastructure."
    >
      <Toggle
        label="Enable webhook delivery"
        description="Start sending events to your endpoint."
        checked={settings.webhookEnabled}
        onChange={(v) => update("webhookEnabled", v)}
      />

      <FieldGroup label="Webhook URL">
        <StyledInput
          value={settings.webhookUrl}
          onChange={(e) => update("webhookUrl", e.target.value)}
          placeholder="https://your-server.com/webhook"
        />
      </FieldGroup>

      <FieldGroup label="Signing secret (optional)">
        <StyledInput
          type="password"
          value={settings.webhookSecret}
          onChange={(e) => update("webhookSecret", e.target.value)}
          placeholder="Shared secret used to verify deliveries"
        />
        <p className="mt-2 text-xs text-muted-foreground">Deliveries include an HMAC SHA-256 value in the <code>x-votrio-signature</code> header when this is set.</p>
      </FieldGroup>

      <FieldGroup label="Events">
        <div className="space-y-2">
          {WEBHOOK_EVENTS.map((evt) => (
            <label
              key={evt.id}
              className="flex cursor-pointer items-center gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-3 transition-colors hover:bg-white/[0.04]"
            >
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-zinc-700 bg-zinc-900 accent-white"
                checked={settings.webhookEvents.includes(evt.id)}
                onChange={(e) => toggleEvent(evt.id, e.target.checked)}
              />
              <span className="text-sm text-zinc-200">{evt.label}</span>
            </label>
          ))}
        </div>
      </FieldGroup>

      <div className="pt-2">
        <GhostButton
          onClick={testWebhook}
          disabled={testing || !settings.webhookUrl}
        >
          {testing && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {testing ? "Sending…" : "Send test event"}
        </GhostButton>
      </div>
    </SectionCard>
  );
}
