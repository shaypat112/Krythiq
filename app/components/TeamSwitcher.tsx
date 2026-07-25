"use client";

import Link from "next/link";
import { Building2, ChevronsUpDown, Plus, UserRound, Users } from "lucide-react";

import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarLabel,
  MenubarMenu,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarSeparator,
  MenubarTrigger,
} from "@/components/ui/menubar";
import { useTeam } from "./TeamProvider";

const PERSONAL_WORKSPACE = "__personal__";

export function TeamSwitcher() {
  const {
    teams,
    selectedTeam,
    selectedTeamId,
    setSelectedTeamId,
    loading,
  } = useTeam();

  const label = loading
    ? "Loading workspace…"
    : selectedTeam?.name ?? "Personal workspace";

  return (
    <Menubar className="h-9 min-w-0 max-w-56 shrink-0 bg-card p-0 shadow-sm">
      <MenubarMenu>
        <MenubarTrigger
          className="group flex h-full min-w-0 flex-1 gap-2 rounded-lg px-2.5 text-left hover:bg-muted data-[state=open]:bg-muted"
          aria-label={`Current workspace: ${label}. Switch workspace`}
          disabled={loading}
        >
          <span className="grid h-5 w-5 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground">
            {selectedTeam ? (
              <Building2 className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <UserRound className="h-3.5 w-3.5" aria-hidden="true" />
            )}
          </span>
          <span className="min-w-0 flex-1 truncate font-medium">{label}</span>
          <ChevronsUpDown
            className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
        </MenubarTrigger>

        <MenubarContent
          align="start"
          sideOffset={6}
          collisionPadding={12}
          className="w-[min(20rem,calc(100vw-1.5rem))]"
        >
          <MenubarLabel className="px-2 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Workspaces
          </MenubarLabel>
          <MenubarRadioGroup
            value={selectedTeamId ?? PERSONAL_WORKSPACE}
            onValueChange={(value) =>
              setSelectedTeamId(value === PERSONAL_WORKSPACE ? null : value)
            }
          >
            <MenubarRadioItem
              value={PERSONAL_WORKSPACE}
              className="min-h-10 cursor-pointer"
            >
              <UserRound className="text-muted-foreground" />
              <span className="truncate">Personal workspace</span>
            </MenubarRadioItem>

            {teams.length > 0 ? <MenubarSeparator /> : null}

            <div className="max-h-64 overflow-y-auto">
              {teams.map((team) => (
                <MenubarRadioItem
                  key={team.id}
                  value={team.id}
                  className="min-h-10 cursor-pointer"
                >
                  <Building2 className="text-muted-foreground" />
                  <span className="min-w-0">
                    <span className="block truncate">{team.name}</span>
                    {team.role ? (
                      <span className="block text-[11px] capitalize text-muted-foreground">
                        {team.role}
                      </span>
                    ) : null}
                  </span>
                </MenubarRadioItem>
              ))}
            </div>
          </MenubarRadioGroup>

          {teams.length === 0 ? (
            <Empty className="gap-3 border-0 px-3 py-5">
              <EmptyHeader>
                <EmptyMedia variant="icon"><Users /></EmptyMedia>
                <EmptyTitle>No team workspaces</EmptyTitle>
                <EmptyDescription>
                  Create a team to share repositories and scan history.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <MenubarItem asChild className="cursor-pointer">
                  <Link href="/settings?section=teams">
                    <Plus /> Create a team
                  </Link>
                </MenubarItem>
              </EmptyContent>
            </Empty>
          ) : (
            <>
              <MenubarSeparator />
              <MenubarItem asChild className="min-h-10 cursor-pointer">
                <Link href="/settings?section=teams">
                  <Plus />
                  Manage teams
                </Link>
              </MenubarItem>
            </>
          )}
        </MenubarContent>
      </MenubarMenu>
    </Menubar>
  );
}
