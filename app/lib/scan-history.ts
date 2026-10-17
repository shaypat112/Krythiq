export interface ScanHistoryRow {
  repo: string;
  created_at: string;
  severity: string;
  issues: number;
  score: number;
  source?: string | null;
}

export interface RepositoryScanSummary {
  repo: string;
  latest: ScanHistoryRow;
  totalScans: number;
}

export function recentScansQuery(userId: string, teamId: string | null) {
  return new URLSearchParams({
    user_id: `eq.${userId}`,
    select: "repo,created_at,severity,issues,score,source:findings->>source",
    "findings->>team_id": teamId ? `eq.${teamId}` : "is.null",
    order: "created_at.desc",
    limit: "50",
  }).toString();
}

export function summarizeScanHistory(scans: ScanHistoryRow[]): RepositoryScanSummary[] {
  const summaries = new Map<string, RepositoryScanSummary>();
  for (const scan of scans) {
    const existing = summaries.get(scan.repo);
    if (!existing) summaries.set(scan.repo, { repo: scan.repo, latest: scan, totalScans: 1 });
    else {
      existing.totalScans++;
      if (new Date(scan.created_at).getTime() > new Date(existing.latest.created_at).getTime()) existing.latest = scan;
    }
  }
  return [...summaries.values()];
}

export function filterScanHistory(repositories: RepositoryScanSummary[], filters: { query: string; severity: string; sort: string }) {
  const query = filters.query.trim().toLowerCase();
  return repositories.filter(repo => repo.repo.toLowerCase().includes(query) && (filters.severity === "all" || repo.latest.severity === filters.severity))
    .sort((a, b) => {
      if (filters.sort === "risk") return b.latest.score - a.latest.score || b.latest.issues - a.latest.issues;
      if (filters.sort === "issues") return b.latest.issues - a.latest.issues;
      if (filters.sort === "name") return a.repo.localeCompare(b.repo);
      return new Date(b.latest.created_at).getTime() - new Date(a.latest.created_at).getTime();
    });
}
