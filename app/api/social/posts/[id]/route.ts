import { NextResponse } from "next/server";
import { getSupabaseEnv, RequestAuthError, requireRequestAuth, supabaseFetch } from "@/app/lib/server/supabaseRest";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { accessToken, userId } = requireRequestAuth(request);
    const { id } = await params;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) return NextResponse.json({ error: "Post not found." }, { status: 404 });
    const select = "id,author_id,author_name,author_username,author_avatar_url,team_id,team_name,project_id,body,visibility,post_type,media_url,media_path,scan_repository,scan_severity,scan_score,scan_issues,scan_created_at,created_at,social_reactions(user_id,reaction),social_comments(id,author_id,author_name,body,created_at),social_projects(id,name,verification_status,verified_at,verification_expires_at)";
    const response = await supabaseFetch(getSupabaseEnv(), `social_posts?id=eq.${id}&select=${select}&limit=1`, { accessToken });
    if (!response.ok) return NextResponse.json({ error: "Unable to load this post." }, { status: 500 });
    const post = (await response.json() as Array<Record<string, unknown>>)[0];
    if (!post) return NextResponse.json({ error: "Post not found or you do not have access." }, { status: 404 });
    return NextResponse.json({ post, viewerId: userId });
  } catch (error) {
    if (error instanceof RequestAuthError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Unable to load this post." }, { status: 500 });
  }
}
