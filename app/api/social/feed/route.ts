import { NextResponse } from "next/server";
import { extractSelectedTeamId, getSupabaseEnv, RequestAuthError, requireRequestAuth, supabaseFetch } from "@/app/lib/server/supabaseRest";
import { getAccessibleTeamIds } from "@/app/lib/server/teams";

export const runtime = "nodejs";

type ScanRow = { repo: string; created_at: string; severity: string; issues: number; score: number; findings?: { team_id?: string | null; profile?: { metadata?: { visibility?: string } } } | null };

function validRepository(value: unknown) {
  const repository = typeof value === "string" ? value.trim() : "";
  return /^[\w.-]+\/[\w.-]+$/.test(repository) ? repository : null;
}

function validMediaUrl(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string" || value.length > 2000) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password ? url.toString() : undefined;
  } catch { return undefined; }
}

function validMediaPath(value: unknown, userId: string) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string" || value.length > 500) return undefined;
  return new RegExp(`^${userId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/[0-9a-f-]{36}\\.(?:jpe?g|png|webp|gif)$`, "i").test(value) ? value : undefined;
}

async function ownProfile(accessToken: string, userId: string) {
  const response = await supabaseFetch(getSupabaseEnv(), `profiles?id=eq.${encodeURIComponent(userId)}&select=full_name,username,avatar_url&limit=1`, { accessToken });
  const rows = response.ok ? await response.json() as Array<{ full_name?: string | null; username?: string | null; avatar_url?: string | null }> : [];
  return rows[0] ?? {};
}

export async function GET(request: Request) {
  try {
    const { accessToken, userId } = requireRequestAuth(request);
    const teamId = extractSelectedTeamId(request);
    const { searchParams } = new URL(request.url);
    const beforeValue = searchParams.get("before");
    const before = beforeValue && !Number.isNaN(Date.parse(beforeValue)) ? `&created_at=lt.${encodeURIComponent(beforeValue)}` : "";
    const teamOnly = searchParams.get("scope") === "team" && teamId;
    const filter = teamOnly ? `team_id=eq.${encodeURIComponent(teamId)}` : "visibility=eq.public";
    const env = getSupabaseEnv();
    const [postsResponse, scansResponse, projectsResponse, profile] = await Promise.all([
      supabaseFetch(env, `social_posts?${filter}${before}&select=id,author_id,author_name,author_username,author_avatar_url,team_id,team_name,project_id,body,visibility,post_type,media_url,media_path,scan_repository,scan_severity,scan_score,scan_issues,scan_created_at,created_at,social_reactions(user_id,reaction),social_comments(id,author_id,author_name,body,created_at),social_projects(id,name,verification_status,verified_at,verification_expires_at)&order=created_at.desc&limit=20`, { accessToken }),
      supabaseFetch(env, `scan_history?user_id=eq.${encodeURIComponent(userId)}&select=repo,created_at,severity,issues,score,findings&order=created_at.desc&limit=30`, { accessToken }),
      supabaseFetch(env, "social_projects?pinned=eq.true&select=id,team_id,team_name,repository,name,description,verification_status,verified_at,verification_expires_at,scan_score,scan_issues&order=verified_at.desc.nullslast&limit=20", { accessToken }),
      ownProfile(accessToken, userId),
    ]);
    if (!postsResponse.ok || !scansResponse.ok || !projectsResponse.ok) return NextResponse.json({ error: "Social discovery storage is unavailable. Apply the latest database migration." }, { status: 503 });
    const scans = (await scansResponse.json() as ScanRow[]).filter((scan) => teamId ? scan.findings?.team_id === teamId : !scan.findings?.team_id);
    const posts = await postsResponse.json() as Array<Record<string, unknown> & { social_projects?: { verification_status?: string; verification_expires_at?: string | null } | null }>;
    const projects = await projectsResponse.json() as Array<Record<string, unknown> & { verification_status?: string; verification_expires_at?: string | null }>;
    const currentTime = Date.now();
    const activeStatus = (status: unknown, expiresAt: unknown) => status === "verified" && typeof expiresAt === "string" && new Date(expiresAt).getTime() > currentTime ? "verified" : status === "verified" ? "expired" : status;
    return NextResponse.json({
      posts: posts.map((post) => ({ ...post, social_projects: post.social_projects ? { ...post.social_projects, verification_status: activeStatus(post.social_projects.verification_status, post.social_projects.verification_expires_at) } : null })),
      projects: projects.map((project) => ({ ...project, verification_status: activeStatus(project.verification_status, project.verification_expires_at) })),
      shareableScans: Array.from(new Map(scans.map((scan) => [scan.repo, { repository: scan.repo, createdAt: scan.created_at, severity: scan.severity, issues: scan.issues, score: scan.score, publicRepository: scan.findings?.profile?.metadata?.visibility === "public" }])).values()),
      viewer: { userId, name: profile.full_name ?? profile.username ?? "Krythiq member", username: profile.username ?? null, avatarUrl: profile.avatar_url ?? null },
      nextCursor: posts.length === 20 ? posts.at(-1)?.created_at ?? null : null,
    });
  } catch (error) {
    if (error instanceof RequestAuthError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Unable to load Discover." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { accessToken, userId } = requireRequestAuth(request);
    const selectedTeamId = extractSelectedTeamId(request);
    const body = await request.json();
    const text = typeof body?.body === "string" ? body.body.trim() : "";
    const visibility = body?.visibility === "team" ? "team" : "public";
    const repository = validRepository(body?.repository);
    const mediaUrl = validMediaUrl(body?.mediaUrl);
    const mediaPath = validMediaPath(body?.mediaPath, userId);
    if (!text || text.length > 3000) return NextResponse.json({ error: "Post text must be between 1 and 3,000 characters." }, { status: 400 });
    if (mediaUrl === undefined) return NextResponse.json({ error: "Image attachments must use a valid HTTPS URL." }, { status: 400 });
    if (mediaPath === undefined) return NextResponse.json({ error: "Invalid uploaded image path." }, { status: 400 });
    if (visibility === "team" && !selectedTeamId) return NextResponse.json({ error: "Select a team for a team-only post." }, { status: 400 });

    const env = getSupabaseEnv();
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const recentResponse = await supabaseFetch(env, `social_posts?author_id=eq.${encodeURIComponent(userId)}&created_at=gte.${encodeURIComponent(since)}&select=id&limit=11`, { accessToken });
    if (recentResponse.ok && (await recentResponse.json() as unknown[]).length >= 10) return NextResponse.json({ error: "Posting limit reached. Try again in an hour." }, { status: 429 });

    let teamName: string | null = null;
    if (selectedTeamId) {
      const accessible = await getAccessibleTeamIds(accessToken, userId);
      if (!accessible.includes(selectedTeamId)) return NextResponse.json({ error: "Team access required." }, { status: 403 });
      const teamResponse = await supabaseFetch(env, `teams?id=eq.${encodeURIComponent(selectedTeamId)}&select=name&limit=1`, { accessToken });
      const teams = teamResponse.ok ? await teamResponse.json() as Array<{ name: string }> : [];
      teamName = teams[0]?.name ?? null;
    }

    let scanSnapshot: Record<string, unknown> = {};
    let projectId: string | null = null;
    if (repository) {
      const scanResponse = await supabaseFetch(env, `scan_history?user_id=eq.${encodeURIComponent(userId)}&repo=eq.${encodeURIComponent(repository)}&select=repo,created_at,severity,issues,score,findings&order=created_at.desc&limit=10`, { accessToken });
      const scans = scanResponse.ok ? await scanResponse.json() as ScanRow[] : [];
      const scan = scans.find((item) => selectedTeamId ? item.findings?.team_id === selectedTeamId : !item.findings?.team_id);
      if (!scan) return NextResponse.json({ error: "A matching scan was not found in this workspace." }, { status: 404 });
      if (visibility === "public" && scan.findings?.profile?.metadata?.visibility !== "public") return NextResponse.json({ error: "Private repository scans can only be shared with the selected team." }, { status: 400 });
      scanSnapshot = { post_type: "scan", scan_repository: scan.repo, scan_severity: scan.severity, scan_score: scan.score, scan_issues: scan.issues, scan_created_at: scan.created_at };
      if (selectedTeamId) {
        const projectResponse = await supabaseFetch(env, `social_projects?team_id=eq.${encodeURIComponent(selectedTeamId)}&repository=eq.${encodeURIComponent(repository)}&pinned=eq.true&select=id&limit=1`, { accessToken });
        const projects = projectResponse.ok ? await projectResponse.json() as Array<{ id: string }> : [];
        projectId = projects[0]?.id ?? null;
      }
    }

    const profile = await ownProfile(accessToken, userId);
    const insertResponse = await supabaseFetch(env, "social_posts", { method: "POST", accessToken, headers: { Prefer: "return=representation" }, body: JSON.stringify({ author_id: userId, author_name: profile.full_name ?? profile.username ?? "Krythiq member", author_username: profile.username ?? null, author_avatar_url: profile.avatar_url ?? null, team_id: visibility === "team" ? selectedTeamId : null, team_name: visibility === "team" ? teamName : null, project_id: projectId, body: text, media_url: mediaUrl, media_path: mediaPath, visibility, post_type: repository ? "scan" : "update", ...scanSnapshot }) });
    if (!insertResponse.ok) return NextResponse.json({ error: "Unable to publish this post." }, { status: 500 });
    return NextResponse.json({ post: (await insertResponse.json())?.[0] ?? null }, { status: 201 });
  } catch (error) {
    if (error instanceof RequestAuthError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Unable to publish this post." }, { status: 500 });
  }
}
