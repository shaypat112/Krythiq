import { NextResponse } from "next/server";
import { adminSupabaseFetch } from "@/app/lib/server/admin";
import { RequestAuthError, requireVerifiedRequestAuth } from "@/app/lib/server/supabaseRest";

export const runtime = "nodejs";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const { userId: viewerId } = await requireVerifiedRequestAuth(request);
    const { userId } = await params;
    if (!UUID.test(userId)) return NextResponse.json({ error: "Profile not found." }, { status: 404 });
    const [profileResponse, settingsResponse, postsResponse, projectsResponse, connectionResponse] = await Promise.all([
      adminSupabaseFetch(`profiles?id=eq.${userId}&select=id,username,full_name,avatar_url,updated_at&limit=1`),
      adminSupabaseFetch(`user_settings?user_id=eq.${userId}&select=data&limit=1`),
      adminSupabaseFetch(`social_posts?author_id=eq.${userId}&visibility=eq.public&select=id,body,post_type,scan_repository,scan_severity,scan_score,scan_issues,created_at&order=created_at.desc&limit=12`),
      adminSupabaseFetch(`social_projects?created_by=eq.${userId}&select=id,name,repository,team_name,verification_status,scan_score,scan_issues&order=updated_at.desc&limit=12`),
      adminSupabaseFetch(`social_connections?requester_id=in.(${viewerId},${userId})&addressee_id=in.(${viewerId},${userId})&select=id,requester_id,addressee_id,status&limit=1`),
    ]);
    const profile = profileResponse.ok ? (await profileResponse.json())?.[0] : null;
    if (!profile) return NextResponse.json({ error: "Profile not found." }, { status: 404 });
    const storedData = settingsResponse.ok ? (await settingsResponse.json())?.[0]?.data ?? {} : {};
    const text = (value: unknown, max: number) => typeof value === "string" ? value.trim().slice(0, max) : "";
    const professional = {
      headline: text(storedData.professionalHeadline, 160),
      role: text(storedData.roleTitle, 120),
      organization: text(storedData.companyName, 200),
      companySize: ["solo", "2-10", "11-50", "51-200", "201+"].includes(storedData.companySize) ? storedData.companySize : "",
      community: text(storedData.communityServerName, 200),
    };
    const posts = postsResponse.ok ? await postsResponse.json() : [];
    const projects = projectsResponse.ok ? await projectsResponse.json() : [];
    const connection = connectionResponse.ok ? (await connectionResponse.json())?.[0] ?? null : null;
    let unreadCount = 0;
    if (connection?.status === "accepted") {
      const unreadResponse = await adminSupabaseFetch(`social_messages?connection_id=eq.${connection.id}&sender_id=eq.${userId}&read_at=is.null&select=id`);
      unreadCount = unreadResponse.ok ? (await unreadResponse.json() as unknown[]).length : 0;
    }
    return NextResponse.json({ profile, professional, posts, projects, connection, unreadCount, viewerId, isSelf: viewerId === userId });
  } catch (error) {
    if (error instanceof RequestAuthError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Unable to load profile." }, { status: 500 });
  }
}
