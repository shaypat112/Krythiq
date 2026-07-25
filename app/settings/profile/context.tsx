"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { createClient } from "@/app/lib/supabase";
import { buildAuthHeaders } from "@/app/lib/http";
import { apiPlanCatalog, type ApiPlanId } from "@/app/lib/api-rate-limits";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

export type SettingsState = {
  fullName: string;
  username: string;
  avatarUrl: string;
  webhookEnabled: boolean;
  webhookUrl: string;
  webhookSecret: string;
  webhookEvents: string[];
  retentionDays: number;
  apiRequestsPerMinute: number;
  expensiveRequestsPerMinute: number;
};

export type AdminState = {
  isAdmin: boolean;
  profileUsername: string | null;
  githubLogin: string | null;
};

const defaultSettings: SettingsState = {
  fullName: "",
  username: "",
  avatarUrl: "",
  webhookEnabled: false,
  webhookUrl: "",
  webhookSecret: "",
  webhookEvents: ["scan.completed"],
  retentionDays: 30,
  apiRequestsPerMinute: apiPlanCatalog.free.limits.apiRequestsPerMinute,
  expensiveRequestsPerMinute: apiPlanCatalog.free.limits.expensiveRequestsPerMinute,
};

// ─── Context shape ─────────────────────────────────────────────────────────────

type SettingsContextValue = {
  settings: SettingsState;
  update: <K extends keyof SettingsState>(
    key: K,
    value: SettingsState[K],
  ) => void;
  save: () => Promise<boolean>;
  saving: boolean;
  loading: boolean;
  error: string | null;
  status: string | null;
  setError: (msg: string | null) => void;
  setStatus: (msg: string | null) => void;
  accessToken: string | null;
  admin: AdminState;
  apiPlan: ApiPlanId;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx)
    throw new Error("useSettings must be used inside <SettingsProvider>");
  return ctx;
}

// ─── Provider ──────────────────────────────────────────────────────────────────

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const [settings, setSettings] = useState<SettingsState>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setErrorState] = useState<string | null>(null);
  const [status, setStatusState] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [admin, setAdmin] = useState<AdminState>({
    isAdmin: false,
    profileUsername: null,
    githubLogin: null,
  });
  const [apiPlan, setApiPlan] = useState<ApiPlanId>("free");

  const setStatus = useCallback((message: string | null) => {
    setStatusState(message);
    if (message) toast.success(message);
  }, []);

  const setError = useCallback((message: string | null) => {
    setErrorState(message);
    if (message) toast.error(message);
  }, []);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      if (!supabase) {
        setError("Supabase not configured.");
        setLoading(false);
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token ?? null;

      if (!token) {
        setError("Please sign in to manage settings.");
        setLoading(false);
        return;
      }

      setAccessToken(token);

      const res = await fetch("/api/settings/load", {
        method: "POST",
        headers: buildAuthHeaders(token, { "Content-Type": "application/json" }),
      });

      if (!mounted) return;

      if (res.ok) {
        const data = await res.json();
        setSettings((prev) => ({ ...prev, ...(data?.settings ?? {}) }));
        setAdmin({
          isAdmin: Boolean(data?.admin?.isAdmin),
          profileUsername:
            typeof data?.admin?.profileUsername === "string"
              ? data.admin.profileUsername
              : null,
          githubLogin:
            typeof data?.admin?.githubLogin === "string"
              ? data.admin.githubLogin
              : null,
        });
        setApiPlan(data?.apiPlan === "pro" || data?.apiPlan === "team" ? data.apiPlan : "free");
      }

      setLoading(false);
    };

    load();
    return () => {
      mounted = false;
    };
  }, [setError, supabase]);

  const update = <K extends keyof SettingsState>(
    key: K,
    value: SettingsState[K],
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const save = async () => {
    if (!supabase) return false;
    setSaving(true);
    setStatus(null);
    setError(null);

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;

    if (!token) {
      setError("Please sign in to save settings.");
      setSaving(false);
      return false;
    }

    const res = await fetch("/api/settings/save", {
      method: "POST",
      headers: buildAuthHeaders(token, { "Content-Type": "application/json" }),
      body: JSON.stringify({ settings }),
    });

    if (res.ok) {
      setStatus("Changes saved.");
      setSaving(false);
      return true;
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data?.error ?? "Unable to save settings.");
    }

    setSaving(false);
    return false;
  };

  return (
    <SettingsContext.Provider
      value={{
        settings,
        update,
        save,
        saving,
        loading,
        error,
        status,
        setError,
        setStatus,
        accessToken,
        admin,
        apiPlan,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}
