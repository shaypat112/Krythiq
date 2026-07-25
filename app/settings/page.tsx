"use client";

import { useSearchParams } from "next/navigation";

import { AccountSection } from "./profile/account";
import { RetentionSection } from "./profile/retention";
import { TeamsSection } from "./profile/teams";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

const SECTION_MAP = {
  account: AccountSection,
  retention: RetentionSection,
  teams: TeamsSection,
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
