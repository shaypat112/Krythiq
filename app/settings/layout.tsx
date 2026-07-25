"use client";
import React, { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Check, ChevronRight, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  User,
  CreditCard,
  Webhook,
  Database,
  Palette,
  Users,
  Plug,
  BellRing,
  Braces,
} from "lucide-react";
import { cn } from "../lib/utils";
import { SettingsProvider, useSettings } from "./profile/context";

const NAV_SECTIONS = [
  { id: "account", label: "Account", icon: User },
  { id: "billing", label: "Billing", icon: CreditCard },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "webhooks", label: "Webhooks", icon: Webhook },
  { id: "retention", label: "Data", icon: Database },
  { id: "teams", label: "Teams", icon: Users },
  { id: "integrations", label: "Integrations", icon: Plug },
  { id: "notifications", label: "Notifications", icon: BellRing },
  { id: "api", label: "API", icon: Braces },
] as const;

export type SectionId = (typeof NAV_SECTIONS)[number]["id"];

function Sidebar({ active }: { active: SectionId }) {
  const { save, saving } = useSettings();

  return (
    <aside className="hidden w-56 shrink-0 flex-col border-r border-border bg-background sm:flex">
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {NAV_SECTIONS.map(({ id, label, icon: Icon }) => (
          <Link
            key={id}
            href={`/settings?section=${id}`}
            className={cn(
              "group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all",
              active === id
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon
              className={cn(
                "h-4 w-4 shrink-0 transition-colors",
                active === id
                  ? "text-accent-foreground"
                  : "text-muted-foreground group-hover:text-foreground",
              )}
            />
            {label}
            {active === id && (
              <ChevronRight className="ml-auto h-3.5 w-3.5 text-muted-foreground" />
            )}
          </Link>
        ))}
      </nav>

      <div className="shrink-0 border-t border-border p-3">
        <button
          onClick={save}
          disabled={saving}
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-lg bg-foreground py-2 text-sm font-medium text-background",
            "transition-all hover:opacity-90 active:scale-[0.98]",
            "disabled:opacity-50 disabled:cursor-not-allowed",
          )}
        >
          {saving ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…
            </>
          ) : (
            <>
              <Check className="h-3.5 w-3.5" /> Save changes
            </>
          )}
        </button>
      </div>
    </aside>
  );
}

function MobileSettingsNav({ active }: { active: SectionId }) {
  const { save, saving } = useSettings();

  return (
    <div className="border-b border-border bg-background p-3 sm:hidden">
      <div className="flex gap-2 overflow-x-auto pb-2" aria-label="Settings sections">
        {NAV_SECTIONS.map(({ id, label, icon: Icon }) => (
          <Link
            key={id}
            href={`/settings?section=${id}`}
            aria-current={active === id ? "page" : undefined}
            className={cn(
              "inline-flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-sm",
              active === id
                ? "border-foreground/20 bg-foreground text-background"
                : "border-border bg-card text-muted-foreground",
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
      </div>
      <button
        onClick={save}
        disabled={saving}
        className="mt-1 flex w-full items-center justify-center gap-2 rounded-lg bg-foreground py-2 text-sm font-medium text-background disabled:cursor-not-allowed disabled:opacity-50"
      >
        {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
        {saving ? "Saving…" : "Save changes"}
      </button>
    </div>
  );
}

function SettingsInner({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();
  const { loading } = useSettings();

  const requestedSection = searchParams?.get("section");
  const active = NAV_SECTIONS.some((section) => section.id === requestedSection)
    ? requestedSection as SectionId
    : "account";

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="w-full max-w-2xl space-y-4"><Skeleton className="h-10 w-40" /><Skeleton className="h-72" /></div>
      </div>
    );
  }

  return (
    <div
      className="flex min-h-screen bg-background text-foreground"
      style={{ fontFamily: "'DM Sans', 'Inter', system-ui, sans-serif" }}
    >
      <Sidebar active={active} />
      <div className="min-w-0 flex-1">
        <MobileSettingsNav active={active} />

      <div className="bg-background px-4 py-8 sm:px-10 sm:py-10">
        <div className="mx-auto max-w-2xl space-y-6">
          {children}
        </div>
      </div>
      </div>
    </div>
  );
}

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SettingsProvider>
      <Suspense
        fallback={
          <div className="flex min-h-screen items-center justify-center bg-background">
            <div className="w-full max-w-2xl space-y-4"><Skeleton className="h-10 w-40" /><Skeleton className="h-72" /></div>
          </div>
        }
      >
        <SettingsInner>{children}</SettingsInner>
      </Suspense>
    </SettingsProvider>
  );
}
