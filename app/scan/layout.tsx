"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BadgeCheck,
  ChevronRight,
  ClipboardCheck,
  FileClock,
  FileSearch,
  GitPullRequestArrow,
  Rocket,
} from "lucide-react";
import { cn } from "@/app/lib/utils";

const NAV_ITEMS = [
  { href: "/scan", label: "New scan", icon: FileSearch, exact: true },
  { href: "/scan/readiness", label: "Launch readiness", icon: Rocket },
  { href: "/scan/fixes", label: "Guided fixes", icon: ClipboardCheck },
  { href: "/scan/drafts", label: "Draft changes", icon: GitPullRequestArrow },
  { href: "/scan/verification", label: "Check fixes", icon: BadgeCheck },
  { href: "/scan/history", label: "Scan history", icon: FileClock },
] as const;

function isCurrent(pathname: string, item: (typeof NAV_ITEMS)[number]) {
  return "exact" in item && item.exact
    ? pathname === item.href
    : pathname.startsWith(item.href);
}

export default function ScanLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-[calc(100svh-9rem)] items-start bg-background text-foreground">
      <aside className="sticky top-24 hidden h-[calc(100svh-7rem)] w-56 shrink-0 flex-col border-r border-border pr-3 sm:flex">
        <div className="px-3 pb-3 pt-1">
          <p className="text-sm font-semibold">Launch workspace</p>
          <p className="mt-1 text-xs text-muted-foreground">Scan, fix, and check</p>
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto py-2" aria-label="Scan workspace">
          {NAV_ITEMS.map((item) => {
            const active = isCurrent(pathname, item);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
                {active ? <ChevronRight className="ml-auto h-3.5 w-3.5" /> : null}
              </Link>
            );
          })}
        </nav>

      </aside>

      <div className="min-w-0 flex-1 sm:pl-6">
        <nav className="sticky top-[4.25rem] z-20 -mx-4 mb-5 flex gap-2 overflow-x-auto border-b border-border bg-background/95 px-4 py-3 backdrop-blur sm:hidden" aria-label="Scan workspace">
          {NAV_ITEMS.map((item) => {
            const active = isCurrent(pathname, item);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-sm",
                  active
                    ? "border-foreground/20 bg-foreground text-background"
                    : "border-border bg-card text-muted-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
