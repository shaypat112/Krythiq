import { NextResponse } from "next/server";
import { adminSupabaseFetch } from "@/app/lib/server/admin";
import { extractSelectedTeamId, getSupabaseEnv, RequestAuthError, requireRequestAuth, supabaseFetch } from "@/app/lib/server/supabaseRest";
import { canManageTeam } from "@/app/lib/server/teams";

export const runtime = "nodejs";

type ScanRow = { repo: string; created_at: string; severity: string; issues: number; score: number; findings?: { team_id?: string | null; profile?: { metadata?: { visibility?: string }; metrics?: { repositoryFiles?: number; scannedLines?: number } } } | null };

export async function POST(request: Request) {
  try {
    const { accessToken, userId } = requireRequestAuth(request);
    const teamId = extractSelectedTeamId(request);
    const body = await request.json();
    const repository = typeof body?.repository === "string" && /^[\w.-]+\/[\w.-]+$/.test(body.repository.trim()) ? body.repository.trim() : null;
    if (!teamId || !repository) return NextResponse.json({ error: "Select a team and valid repository." }, { status: 400 });
    if (!await canManageTeam(accessToken, userId, teamId)) return NextResponse.json({ error: "Only team owners and admins can pin a verified project." }, { status: 403 });

    const [teamResponse, scansResponse] = await Promise.all([
      supabaseFetch(getSupabaseEnv(), `teams?id=eq.${encodeURIComponent(teamId)}&select=name&limit=1`, { accessToken }),
      adminSupabaseFetch(`scan_history?repo=eq.${encodeURIComponent(repository)}&select=repo,created_at,severity,issues,score,findings&order=created_at.desc&limit=50`),
    ]);
    const teams = teamResponse.ok ? await teamResponse.json() as Array<{ name: string }> : [];
    const scans = scansResponse.ok ? await scansResponse.json() as ScanRow[] : [];
    const scan = scans.find((item) => item.findings?.team_id === teamId);
    if (!teams[0] || !scan) return NextResponse.json({ error: "Run a team-scoped scan for this repository first." }, { status: 404 });

    const metadata = scan.findings?.profile;
    const reasons: string[] = [];
    if (metadata?.metadata?.visibility !== "public") reasons.push("The GitHub repository is not public.");
    if (["critical", "high"].includes(scan.severity)) reasons.push("The latest scan contains high or critical findings.");
    if ((metadata?.metrics?.repositoryFiles ?? 0) < 25 || (metadata?.metrics?.scannedLines ?? 0) < 1000) reasons.push("The project needs at least 25 files and 1,000 scanned lines.");
    if (Date.now() - new Date(scan.created_at).getTime() > 30 * 24 * 60 * 60 * 1000) reasons.push("The latest scan is older than 30 days.");
    const verified = reasons.length === 0;
    const env = getSupabaseEnv();
    await supabaseFetch(env, `social_projects?team_id=eq.${encodeURIComponent(teamId)}&pinned=eq.true`, { method: "PATCH", accessToken, body: JSON.stringify({ pinned: false, updated_at: new Date().toISOString() }) });
    const now = new Date();
    const expires = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const projectResponse = await supabaseFetch(env, "social_projects?on_conflict=team_id,repository", { method: "POST", accessToken, headers: { Prefer: "resolution=merge-duplicates,return=representation" }, body: JSON.stringify({ team_id: teamId, team_name: teams[0].name, created_by: userId, repository, name: repository.split("/")[1], pinned: true, verification_status: verified ? "verified" : "unverified", verified_at: verified ? now.toISOString() : null, verification_expires_at: verified ? expires : null, scan_created_at: scan.created_at, scan_score: scan.score, scan_issues: scan.issues, updated_at: now.toISOString() }) });
    if (!projectResponse.ok) return NextResponse.json({ error: "Unable to pin this team project." }, { status: 500 });
    return NextResponse.json({ project: (await projectResponse.json())?.[0] ?? null, verified, reasons });
  } catch (error) {
    if (error instanceof RequestAuthError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Unable to verify this project." }, { status: 500 });
  }
}
