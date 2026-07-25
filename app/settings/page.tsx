"use client";

import { useSearchParams } from "next/navigation";

import { AccountSection } from "./profile/account";

import { AppearanceSection } from "./profile/appearance";
import { WebhooksSection } from "./profile/webhooks";
import { BillingSection } from "./profile/billing";

import { RetentionSection } from "./profile/retention";
import { TeamsSection } from "./profile/teams";
import { IntegrationsSection } from "./profile/integrations";
import { NotificationsSection } from "./profile/notifications";
import { ApiSection } from "./profile/api";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

const SECTION_MAP = {
  account: AccountSection,
  billing: BillingSection,
  appearance: AppearanceSection,
  webhooks: WebhooksSection,

  retention: RetentionSection,
  teams: TeamsSection,
  integrations: IntegrationsSection,
  notifications: NotificationsSection,
  api: ApiSection,
} satisfies Record<string, React.ComponentType>;

type SectionKey = keyof typeof SECTION_MAP;

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="space-y-4 p-10"><Skeleton className="h-10 w-40" /><Skeleton className="h-72" /></div>}>
      <SettingsContent />
    </Suspense>
  );
}

function SettingsContent() {
  const searchParams = useSearchParams();
  const requestedSection = searchParams?.get("section");
  const active: SectionKey = requestedSection && requestedSection in SECTION_MAP
    ? requestedSection as SectionKey
    : "account";

  const Component = SECTION_MAP[active] ?? AccountSection;

  return <Component />;
}
