import "server-only";

import { extractSelectedTeamId, getSupabaseEnv, requireRequestAuth, supabaseFetch } from "./supabaseRest";

export type WorkflowSuggestion = {
  title: string;
  reason?: string;
  file?: string | null;
  line?: number | null;
  category?: string;
  evidence?: string | null;
  currentCode?: string | null;
  replacementCode?: string | null;
  replacement?: string | null;
};

export type WorkflowScan = {
  repo: string;
  created_at: string;
  findings?: { team_id?: string | null; aiReview?: { suggestions?: WorkflowSuggestion[] } } | null;
};

export async function loadOwnedWorkflowScans(request: Request, repository: string) {
  const { accessToken, userId } = requireRequestAuth(request);
  const teamId = extractSelectedTeamId(request);
  const response = await supabaseFetch(
    getSupabaseEnv(),
    `scan_history?user_id=eq.${encodeURIComponent(userId)}&repo=eq.${encodeURIComponent(repository)}&select=repo,created_at,findings&order=created_at.desc&limit=20`,
    { accessToken },
  );
  if (!response.ok) throw new Error("Unable to load repository scans.");
  const rows = (await response.json()) as WorkflowScan[];
  return rows.filter((row) => (teamId ? row.findings?.team_id === teamId : !row.findings?.team_id));
}

export function readSuggestion(scans: WorkflowScan[], index: number) {
  if (!Number.isSafeInteger(index) || index < 0 || index > 500) return null;
  return scans[0]?.findings?.aiReview?.suggestions?.[index] ?? null;
}
