"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/app/lib/supabase";
import { buildAuthHeaders } from "@/app/lib/http";
import { TeamSwitcher } from "./TeamSwitcher";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Bell, ChevronDown, CreditCard } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DesktopRequired } from "./mobile/DesktopRequired";

const appLinks = [
  { href: "/scan", label: "Security workspace" },
  { href: "/documentation", label: "Docs" },
  { href: "/partners", label: "Partners" },
  { href: "/settings", label: "Settings" },
];

function getDisplayName(user: User) {
  const meta = user.user_metadata ?? {};
  return (
    meta.full_name || meta.name || meta.user_name || user.email || "Account"
  );
}

function getAvatarUrl(user: User) {
  const meta = user.user_metadata ?? {};
  return meta.avatar_url || meta.picture || null;
}

function formatNotificationTitle(type: string) {
  switch (type) {
    case "scan.completed":
      return "Scan completed";
    case "review.created":
      return "Review created";
    case "repository.published":
      return "Repository published";
    default:
      return type.replace(".", " ");
  }
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);
  const [notifications, setNotifications] = useState<
    Array<{
      id: string;
      type: string;
      data: Record<string, unknown>;
      read_at: string | null;
      created_at: string;
    }>
  >([]);
  const [notifLoading, setNotifLoading] = useState(false);

  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const { data } = await supabase.auth.getUser();
      if (mounted) {
        setUser(data.user ?? null);
        setLoading(false);
      }
    };

    init();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
        setLoading(false);
      },
    );

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    let mounted = true;

    const loadNotifications = async () => {
      if (!user) {
        setNotifications([]);
        return;
      }
      setNotifLoading(true);
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        if (mounted) setNotifLoading(false);
        return;
      }
      const res = await fetch("/api/notifications", {
        headers: buildAuthHeaders(accessToken),
      });
      if (!mounted) return;
      if (res.ok) {
        const data = await res.json();
        setNotifications(data?.notifications ?? []);
      }
      setNotifLoading(false);
    };

    loadNotifications();

    return () => {
      mounted = false;
    };
  }, [user, supabase]);

  const displayName = user ? getDisplayName(user) : "";
  const avatarUrl = user ? getAvatarUrl(user) : null;
  const initials = displayName
    .split(" ")
    .filter((part: string) => part.length > 0)
    .map((part: string) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const signOut = async () => {
    setSigningOut(true);
    await supabase.auth.signOut();
    setUser(null);
    router.replace("/");
    router.refresh();
  };

  const unreadCount = notifications.filter((item) => !item.read_at).length;
  const isMarketingRoute =
    pathname === "/" ||
    pathname?.startsWith("/landing-page") ||
    pathname?.startsWith("/auth");
  const isPublicRoute =
    isMarketingRoute || pathname?.startsWith("/documentation");

  const getNotificationLabel = (item: (typeof notifications)[number]) => {
    const repoName = item.data?.["repo_name"];
    const repoUrl = item.data?.["repo_url"];
    const requesterName = item.data?.["requesterName"];
    const company = item.data?.["company"];

    if (typeof repoName === "string" && repoName.length > 0) return repoName;
    if (typeof repoUrl === "string" && repoUrl.length > 0) return repoUrl;
    if (typeof requesterName === "string" && requesterName.length > 0) {
      return typeof company === "string" && company.length > 0
        ? `${requesterName} · ${company}`
        : requesterName;
    }
    if (typeof company === "string" && company.length > 0) return company;
    return "Activity update";
  };
  const getNotificationSeverity = (item: (typeof notifications)[number]) => {
    const sev = item.data?.["severity"];
    if (typeof sev === "string" && sev.length > 0) return sev;
    return "unknown";
  };

  const getNotificationIssues = (item: (typeof notifications)[number]) => {
    const issues = item.data?.["issues"];
    if (typeof issues === "number") return issues;
    if (typeof issues === "string") {
      const n = parseInt(issues, 10);
      return Number.isFinite(n) ? n : 0;
    }
    return 0;
  };

  const markAllRead = async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    if (!accessToken) return;
    const response = await fetch("/api/notifications", {
      method: "POST",
      headers: buildAuthHeaders(accessToken, {
        "Content-Type": "application/json",
      }),
      body: JSON.stringify({ markAll: true }),
    });
    if (!response.ok) return;
    setNotifications((prev) =>
      prev.map((item) => ({
        ...item,
        read_at: item.read_at ?? new Date().toISOString(),
      })),
    );
  };

  useEffect(() => {
    if (loading || user || isPublicRoute || signingOut) return;
    router.replace("/auth");
  }, [isPublicRoute, loading, router, signingOut, user]);

  if (isMarketingRoute) {
    return (
      <div className="min-h-screen bg-background text-foreground transition-colors">
        <main>{children}</main>
      </div>
    );
  }

  if (loading && !isPublicRoute) {
    return (
      <div className="grid min-h-screen place-items-center bg-background" role="status" aria-label="Loading account">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-muted border-t-foreground" />
          Loading your workspace…
        </div>
      </div>
    );
  }

  if (!user && !isPublicRoute) {
    return <div className="min-h-screen bg-background" />;
  }

  return (
    <DesktopRequired enabled={!isPublicRoute}>
    <div className="min-h-screen bg-background text-foreground transition-colors">
      <a href="#main-content" className="sr-only z-[100] rounded-md bg-foreground px-4 py-2 text-background focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
        Skip to content
      </a>
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/90 backdrop-blur">
        <div className="mx-auto max-w-[1600px] px-4 py-3 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              {user ? <TeamSwitcher /> : null}
              <nav aria-label="Primary" className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto px-0.5 py-1 text-sm text-muted-foreground">

                {appLinks.map((link) => {
                  const active = pathname === link.href || pathname?.startsWith(`${link.href}/`);
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      aria-current={active ? "page" :
                        undefined}
                      className={`shrink-0 rounded-md px-2.5 py-1.5 transition-colors hover:bg-muted hover:text-foreground ${active ? "bg-muted font-medium text-foreground" : ""}`}
                    >
                      {link.label}
                    </Link>
                  );
                })}

              </nav>
            </div>

            {!loading && user ? (
              <div className="flex items-center gap-3">
                <DropdownMenu>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <DropdownMenuTrigger asChild>
                        <button aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`} className="relative flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-foreground transition hover:bg-muted">
                      <Bell size={16} />
                      {unreadCount > 0 ? (
                        <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] text-white">
                          {unreadCount}
                        </span>
                      ) : null}
                        </button>
                      </DropdownMenuTrigger>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      {unreadCount ? `${unreadCount} unread notifications` : "Notifications"}
                    </TooltipContent>
                  </Tooltip>
                  <DropdownMenuContent
                    align="end"
                    className="w-72 bg-card text-foreground"
                  >
                    <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {notifLoading ? (
                      <div className="px-3 py-2 text-xs text-muted-foreground">
                        Loading...
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="px-3 py-2 text-xs text-muted-foreground">
                        No notifications yet.
                      </div>
                    ) : (
                      <div className="max-h-64 overflow-auto">
                        {notifications.map((item) => (
                          <div
                            key={item.id}
                            className="px-3 py-2 text-xs text-foreground"
                          >
                            <div className="font-medium">
                              {formatNotificationTitle(item.type)}
                            </div>
                            <div className="text-muted-foreground">
                              {getNotificationLabel(item)}
                            </div>
                            {item.type === "scan.completed" ? (
                              <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                                {getNotificationSeverity(item)} severity ·{" "}
                                {getNotificationIssues(item)} issues
                              </div>
                            ) : null}
                            <div className="text-[10px] text-muted-foreground">
                              {new Date(item.created_at).toLocaleString()}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={markAllRead} disabled={unreadCount === 0}>
                      Mark all read
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <DropdownMenuTrigger asChild>
                        <button aria-label="Open account menu" className="flex items-center gap-3 rounded-full border border-border bg-card px-2 py-1.5 text-sm text-foreground transition hover:bg-muted">
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt={displayName}
                          className="h-7 w-7 rounded-full object-cover"
                        />
                      ) : (
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-[11px] font-semibold text-foreground">
                          {initials || "U"}
                        </span>
                      )}
                      <span className="hidden sm:inline text-xs font-medium text-muted-foreground">
                        {displayName}
                      </span>
                      <ChevronDown className="hidden sm:inline h-3 w-3 text-muted-foreground ml-1" />
                        </button>
                      </DropdownMenuTrigger>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">Account and billing</TooltipContent>
                  </Tooltip>
                  <DropdownMenuContent
                    align="end"
                    className="bg-card text-foreground"
                  >
                    <DropdownMenuLabel>{displayName}</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/billing" className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4" />
                        Billing
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={signOut}>
                      Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Button asChild size="sm" variant="outline">
                  <Link href="/auth">Sign in</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main id="main-content" className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6 sm:py-10">{children}</main>
    </div>
    </DesktopRequired>
  );
}
