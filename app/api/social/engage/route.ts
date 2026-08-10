import { NextResponse } from "next/server";
import { getSupabaseEnv, RequestAuthError, requireRequestAuth, supabaseFetch } from "@/app/lib/server/supabaseRest";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { accessToken, userId } = requireRequestAuth(request);
    const body = await request.json();
    const postId = typeof body?.postId === "string" && /^[a-f0-9-]{36}$/i.test(body.postId) ? body.postId : null;
    if (!postId) return NextResponse.json({ error: "Invalid post." }, { status: 400 });
    const env = getSupabaseEnv();
    if (body?.action === "react") {
      const reaction = ["like", "celebrate", "insightful"].includes(body?.reaction) ? body.reaction : "like";
      const response = await supabaseFetch(env, "social_reactions?on_conflict=post_id,user_id", { method: "POST", accessToken, headers: { Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify({ post_id: postId, user_id: userId, reaction }) });
      if (!response.ok) return NextResponse.json({ error: "Unable to save reaction." }, { status: 500 });
      return NextResponse.json({ ok: true });
    }
    if (body?.action === "unreact") {
      const response = await supabaseFetch(env, `social_reactions?post_id=eq.${postId}&user_id=eq.${encodeURIComponent(userId)}`, { method: "DELETE", accessToken });
      if (!response.ok) return NextResponse.json({ error: "Unable to remove reaction." }, { status: 500 });
      return NextResponse.json({ ok: true });
    }
    if (body?.action === "comment") {
      const text = typeof body?.body === "string" ? body.body.trim() : "";
      if (!text || text.length > 1000) return NextResponse.json({ error: "Comments must be between 1 and 1,000 characters." }, { status: 400 });
      const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const recent = await supabaseFetch(env, `social_comments?author_id=eq.${encodeURIComponent(userId)}&created_at=gte.${encodeURIComponent(since)}&select=id&limit=31`, { accessToken });
      if (recent.ok && (await recent.json() as unknown[]).length >= 30) return NextResponse.json({ error: "Comment limit reached. Try again later." }, { status: 429 });
      const profileResponse = await supabaseFetch(env, `profiles?id=eq.${encodeURIComponent(userId)}&select=full_name,username&limit=1`, { accessToken });
      const profiles = profileResponse.ok ? await profileResponse.json() as Array<{ full_name?: string | null; username?: string | null }> : [];
      const response = await supabaseFetch(env, "social_comments", { method: "POST", accessToken, headers: { Prefer: "return=representation" }, body: JSON.stringify({ post_id: postId, author_id: userId, author_name: profiles[0]?.full_name ?? profiles[0]?.username ?? "Krythiq member", body: text }) });
      if (!response.ok) return NextResponse.json({ error: "Unable to publish comment." }, { status: 500 });
      return NextResponse.json({ comment: (await response.json())?.[0] ?? null }, { status: 201 });
    }
    return NextResponse.json({ error: "Unknown social action." }, { status: 400 });
  } catch (error) {
    if (error instanceof RequestAuthError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Unable to update this post." }, { status: 500 });
  }
}
