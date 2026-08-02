"use client";

import {
  Bot,
  BrainCircuit,
  Check,
  Gauge,
  Save,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import type { AiUsageLevel, ScanScope } from "@/app/lib/ai-settings";
import { HelpTooltip } from "@/app/components/HelpTooltip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BentoGrid } from "@/components/ui/bento-grid";
import { Label } from "@/components/ui/label";
import { cn } from "@/app/lib/utils";
import { useSettings } from "./context";

const usageOptions: Array<{
  value: AiUsageLevel;
  label: string;
  description: string;
}> = [
  {
    value: "minimal",
    label: "Minimal",
    description: "Static checks only. Grok is not called.",
  },
  {
    value: "balanced",
    label: "Balanced",
    description: "A concise AI review using a bounded code sample.",
  },
  {
    value: "maximum",
    label: "Maximum",
    description: "A deeper review with more files and suggestions.",
  },
];

const scopeOptions: Array<{
  value: ScanScope;
  label: string;
  description: string;
}> = [
  {
    value: "frontend",
    label: "Frontend",
    description: "UI quality, accessibility, consistency, and shadcn/ui reuse.",
  },
  {
    value: "backend",
    label: "Backend",
    description: "Routes, auth, data access, security, and performance.",
  },
  {
    value: "all",
    label: "All",
    description: "Frontend, backend, and cross-cutting architecture.",
  },
];

function ToggleSetting({
  checked,
  onCheckedChange,
  title,
  description,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  title: string;
  description: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onCheckedChange(!checked)}
      className="flex w-full items-center justify-between gap-4 rounded-xl border border-border p-4 text-left transition hover:bg-muted/40"
    >
      <span>
        <span className="block text-sm font-medium">{title}</span>
        <span className="mt-1 block text-xs leading-5 text-muted-foreground">
          {description}
        </span>
      </span>
      <span
        aria-hidden
        className={cn(
          "flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition",
          checked ? "justify-end bg-foreground" : "justify-start bg-muted",
        )}
      >
        <span
          className={cn(
            "grid h-5 w-5 place-items-center rounded-full shadow-sm",
            checked
              ? "bg-background text-foreground"
              : "bg-background text-transparent",
          )}
        >
          <Check className="h-3 w-3" />
        </span>
      </span>
    </button>
  );
}

export function AiSection() {
  const {
    settings,
    update,
    save,
    saving,
    aiProviderConfigured,
  } = useSettings();

  return (
    <div className="space-y-6">
      <header>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">
            <Bot /> AI analysis
          </Badge>
          <Badge variant={aiProviderConfigured ? "default" : "subtle"}>
            {aiProviderConfigured ? "Grok connected" : "Grok not configured"}
          </Badge>
        </div>
        <h1 className="mt-4 text-2xl font-semibold">Control how AI reviews code</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Set the default scan focus and how much repository code the AI reviewer
          may inspect. Repository scans still use the selected token tier.
        </p>
      </header>

      <BentoGrid className="auto-rows-auto grid-cols-1 gap-4 lg:grid-cols-6">
      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm lg:col-span-2">
        <div className="pb-4">
          <h2 className="flex items-center gap-2 font-semibold">
            <Gauge className="h-5 w-5" /> AI usage
          </h2>
        </div>
        <div className="space-y-3">
          {usageOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={settings.aiUsageLevel === option.value}
              onClick={() => update("aiUsageLevel", option.value)}
              className={cn(
                "w-full rounded-xl border p-4 text-left transition",
                settings.aiUsageLevel === option.value
                  ? "border-foreground bg-foreground/5 ring-1 ring-foreground/20"
                  : "border-border hover:bg-muted/40",
              )}
            >
              <span className="text-sm font-medium">{option.label}</span>
              <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                {option.description}
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,.08),transparent_42%),var(--card)] p-5 shadow-sm lg:col-span-4">
        <div className="pb-4">
          <h2 className="flex items-center gap-2 font-semibold">
            <BrainCircuit className="h-5 w-5" /> Default scan focus
          </h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {scopeOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={settings.defaultScanScope === option.value}
              onClick={() => update("defaultScanScope", option.value)}
              className={cn(
                "rounded-xl border p-4 text-left transition",
                settings.defaultScanScope === option.value
                  ? "border-foreground bg-foreground/5 ring-1 ring-foreground/20"
                  : "border-border hover:bg-muted/40",
              )}
            >
              <span className="text-sm font-medium">{option.label}</span>
              <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                {option.description}
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-[radial-gradient(circle_at_top_right,rgba(139,92,246,.1),transparent_38%),var(--card)] p-5 shadow-sm lg:col-span-6">
        <div className="pb-4">
          <h2 className="flex items-center gap-2 font-semibold">
            <Sparkles className="h-5 w-5" /> Review output
          </h2>
        </div>
        <div className="space-y-4">
          <ToggleSetting
            checked={settings.vibeDetectionEnabled}
            onCheckedChange={(value) => update("vibeDetectionEnabled", value)}
            title="Vibe-coded estimate"
            description="Show a clearly labeled heuristic estimate with brief evidence—not a claim about authorship."
          />
          <ToggleSetting
            checked={settings.aiSuggestionsEnabled}
            onCheckedChange={(value) => update("aiSuggestionsEnabled", value)}
            title="Actionable suggestions"
            description="Recommend concise improvements and established open-source components such as shadcn/ui primitives."
          />
          <div>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-1.5">
                <Label htmlFor="ai-suggestion-count">Maximum suggestions</Label>
                <HelpTooltip>
                  The server caps this value at eight and may return fewer when
                  repository evidence is limited.
                </HelpTooltip>
              </div>
              <span className="rounded-md border border-border bg-muted px-2.5 py-1 font-mono text-sm">
                {settings.maxAiSuggestions}
              </span>
            </div>
            <input
              id="ai-suggestion-count"
              type="range"
              min={1}
              max={8}
              step={1}
              value={settings.maxAiSuggestions}
              onChange={(event) =>
                update("maxAiSuggestions", Number(event.target.value))
              }
              disabled={!settings.aiSuggestionsEnabled}
              className="mt-4 w-full accent-foreground disabled:opacity-50"
            />
          </div>
          <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm leading-6 text-muted-foreground">
            <p className="flex items-center gap-2 font-medium text-foreground">
              <ShieldCheck className="h-4 w-4" /> Credential safety
            </p>
            <p className="mt-2">
              Configure <code className="text-foreground">GROQ_API_KEY</code>{" "}
              only in the server deployment environment. The key is never saved
              in these settings, sent to the browser, or included in scan
              results. <code className="text-foreground">XAI_API_KEY</code> is
              supported as a fallback.
            </p>
          </div>
          <Button onClick={() => void save()} disabled={saving}>
            <Save />
            {saving ? "Saving…" : "Save AI preferences"}
          </Button>
        </div>
      </section>
      </BentoGrid>
    </div>
  );
}
