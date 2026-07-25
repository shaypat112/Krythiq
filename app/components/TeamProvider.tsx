"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createClient } from "@/app/lib/supabase";
import { buildAuthHeaders } from "@/app/lib/http";

type Team = { id: string; name: string; slug?: string; role?: string };

type TeamContextValue = {
  teams: Team[];
  selectedTeamId: string | null;
  selectedTeam?: Team | null;
  setSelectedTeamId: (id: string | null) => void;
  loading: boolean;
};

const TeamContext = createContext<TeamContextValue | undefined>(undefined);
const SELECTED_TEAM_STORAGE_KEY = "votrio-selected-team";
const PERSONAL_WORKSPACE_VALUE = "__personal__";

export function TeamProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const storedSelection = useRef<string | null | undefined>(undefined);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamIdState] = useState<string | null>(
    null,
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    try {
      const stored = window.localStorage.getItem(SELECTED_TEAM_STORAGE_KEY);
      storedSelection.current =
        stored === PERSONAL_WORKSPACE_VALUE ? null : stored ?? undefined;
      if (stored && stored !== PERSONAL_WORKSPACE_VALUE) {
        setSelectedTeamIdState(stored);
      }
    } catch {
      storedSelection.current = undefined;
    }

    const load = async () => {
      setLoading(true);
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData.session?.access_token;
        if (!accessToken) {
          if (mounted) {
            setTeams([]);
            setLoading(false);
          }
          return;
        }

        const res = await fetch("/api/teams/list", {
          headers: buildAuthHeaders(accessToken),
        });
        if (!mounted) return;
        if (!res.ok) {
          setTeams([]);
          setLoading(false);
          return;
        }
        const json = await res.json();
        const items = json?.teams ?? [];
        if (mounted) {
          setTeams(items as Team[]);
          setSelectedTeamIdState((current) => {
            const preferred = storedSelection.current;
            if (preferred === null) return null;
            const candidate = preferred ?? current;
            if (
              candidate &&
              items.some((item: Team) => item.id === candidate)
            ) {
              return candidate;
            }
            return items[0]?.id ?? null;
          });
        }
      } catch {
        if (mounted) setTeams([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    window.addEventListener("votrio:teams-changed", load);
    return () => {
      mounted = false;
      window.removeEventListener("votrio:teams-changed", load);
    };
  }, [supabase]);

  const setSelectedTeamId = (id: string | null) => {
    storedSelection.current = id;
    setSelectedTeamIdState(id);
    try {
      window.localStorage.setItem(
        SELECTED_TEAM_STORAGE_KEY,
        id ?? PERSONAL_WORKSPACE_VALUE,
      );
    } catch {}
  };

  const selectedTeam = teams.find((t) => t.id === selectedTeamId) ?? null;

  const value = useMemo(
    () => ({ teams, selectedTeamId, selectedTeam, setSelectedTeamId, loading }),
    [teams, selectedTeamId, selectedTeam, loading],
  );

  return <TeamContext.Provider value={value}>{children}</TeamContext.Provider>;
}

export function useTeam() {
  const ctx = useContext(TeamContext);
  if (!ctx) throw new Error("useTeam must be used within TeamProvider");
  return ctx;
}

export default TeamProvider;
