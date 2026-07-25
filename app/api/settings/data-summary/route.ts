import { NextResponse } from "next/server";

import {
  getSupabaseEnv,
  RequestAuthError,
  requireRequestAuth,
  supabaseFetch,
} from "@/app/lib/server/supabaseRest";
import { logServerError } from "@/app/lib/server/logger";

export const runtime = "nodejs";

type ScanRow = {
  repo: string;
  created_at: string;
  severity: "low" | "medium" | "high" | "critical";
  issues: number;
  score: number;
};

async function readRows<T>(response: Response): Promise<T[]> {
  if (!response.ok) throw new Error(`Supabase summary query failed (${response.status}).`);
  return response.json() as Promise<T[]>;
}

export async function GET(request: Request) {
  try {
    const { accessToken, userId } = requireRequestAuth(request);
    const env = getSupabaseEnv();
    const encodedUserId = encodeURIComponent(userId);

    const [scanRows, notificationRows, reviewRows, repositoryRows] = await Promise.all([
      supabaseFetch(
        env,
        `scan_history?user_id=eq.${encodedUserId}&select=repo,created_at,severity,issues,score&order=created_at.desc&limit=500`,
        { accessToken },
      ).then(readRows<ScanRow>),
      supabaseFetch(
        env,
        `notifications?user_id=eq.${encodedUserId}&select=read_at&limit=500`,
        { accessToken },
      ).then(readRows<{ read_at: string | null }>),
      supabaseFetch(
        env,
        `finding_reviews?user_id=eq.${encodedUserId}&select=status&limit=500`,
        { accessToken },
      ).then(readRows<{ status: string }>).catch(() => []),
      supabaseFetch(
        env,
        `connected_repos?user_id=eq.${encodedUserId}&select=full_name&limit=500`,
        { accessToken },
      ).then(readRows<{ full_name: string }>).catch(() => []),
    ]);

    const activityMap = new Map<string, { scans: number; findings: number }>();
    const severity = { critical: 0, high: 0, medium: 0, low: 0 };
    const repositoryMap = new Map<string, { scans: number; findings: number }>();

    for (let daysAgo = 29; daysAgo >= 0; daysAgo -= 1) {
      const date = new Date();
      date.setUTCHours(0, 0, 0, 0);
      date.setUTCDate(date.getUTCDate() - daysAgo);
      activityMap.set(date.toISOString().slice(0, 10), { scans: 0, findings: 0 });
    }

    for (const scan of scanRows) {
      const issues = Number.isFinite(scan.issues) ? scan.issues : 0;
      const day = scan.created_at.slice(0, 10);
      const activity = activityMap.get(day);
      if (activity) {
        activity.scans += 1;
        activity.findings += issues;
      }
      if (scan.severity in severity) severity[scan.severity] += 1;
      const repository = repositoryMap.get(scan.repo) ?? { scans: 0, findings: 0 };
      repository.scans += 1;
      repository.findings += issues;
      repositoryMap.set(scan.repo, repository);
    }

    const totalFindings = scanRows.reduce((total, scan) => total + (Number(scan.issues) || 0), 0);
    const averageScore = scanRows.length
      ? Math.round(scanRows.reduce((total, scan) => total + (Number(scan.score) || 0), 0) / scanRows.length)
      : 0;

    return NextResponse.json({
      totals: {
        scans: scanRows.length,
        findings: totalFindings,
        averageScore,
        repositories: new Set([...repositoryRows.map((row) => row.full_name), ...scanRows.map((scan) => scan.repo)]).size,
        unreadNotifications: notificationRows.filter((row) => !row.read_at).length,
        reviewedFindings: reviewRows.filter((row) => row.status !== "open").length,
      },
      activity: [...activityMap].map(([date, value]) => ({ date, ...value })),
      severity: Object.entries(severity).map(([name, value]) => ({ name, value })),
      repositories: [...repositoryMap]
        .map(([name, value]) => ({ name, ...value }))
        .sort((a, b) => b.scans - a.scans || b.findings - a.findings)
        .slice(0, 6),
      recentScans: scanRows.slice(0, 8),
    });
  } catch (error) {
    if (error instanceof RequestAuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    logServerError("settings.data_summary_failed", error);
    return NextResponse.json({ error: "Unable to load your data summary." }, { status: 500 });
  }
}
