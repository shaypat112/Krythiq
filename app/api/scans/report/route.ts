import { NextResponse } from "next/server";
import {
  RequestAuthError,
  extractSelectedTeamId,
  getSupabaseEnv,
  requireRequestAuth,
  supabaseFetch,
} from "@/app/lib/server/supabaseRest";

export const runtime = "nodejs";

type ScanFinding = {
  title?: string;
  severity?: string;
  description?: string;
  file?: string;
  path?: string;
  fix?: string;
  recommendation?: string;
  score?: number;
  line?: number;
  message?: string;
  snippet?: string;
  suggestion?: string;
  type?: string;
  technicalDetails?: string;
};

type ScanRow = {
  repo: string;
  created_at: string;
  severity: string;
  issues: number;
  score: number;
  findings?: {
    ai_summary?: string;
    list?: ScanFinding[] | null;
    team_id?: string | null;
  } | null;
};

export async function GET(request: Request) {
  try {
    const { accessToken, userId } = requireRequestAuth(request);
    const selectedTeamId = extractSelectedTeamId(request);
    const env = getSupabaseEnv();
    const { searchParams } = new URL(request.url);
    const repo = searchParams.get("repo")?.trim();

    if (!repo) {
      return NextResponse.json({ error: "Missing repo." }, { status: 400 });
    }

    const res = await supabaseFetch(
      env,
      `scan_history?user_id=eq.${userId}&repo=eq.${encodeURIComponent(repo)}&select=repo,created_at,severity,issues,score,findings&order=created_at.desc&limit=20`,
      { accessToken },
    );

    if (!res.ok) {
      return NextResponse.json({ error: await res.text() }, { status: 500 });
    }

    const rows = (await res.json()) as ScanRow[];
    const scans = rows.filter((row) => {
      const teamId = row.findings?.team_id ?? null;
      return selectedTeamId ? teamId === selectedTeamId : teamId === null;
    });

    return NextResponse.json({
      repo,
      latest: scans[0] ?? null,
      scans,
    });
  } catch (error) {
    if (error instanceof RequestAuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
  }
}
