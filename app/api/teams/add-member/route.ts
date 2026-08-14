import { NextResponse } from "next/server";
import {
  RequestAuthError,
  getSupabaseEnv,
  requireRequestAuth,
  supabaseFetch,
} from "@/app/lib/server/supabaseRest";
import { adminSupabaseFetch } from "@/app/lib/server/admin";
import { canManageTeam } from "@/app/lib/server/teams";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { teamId, username, userId: targetUserId } = await request.json();
    const { accessToken, userId } = requireRequestAuth(request);

    if (!teamId || (!username && !targetUserId)) {
      return NextResponse.json(
        { error: "Missing teamId or selected user." },
        { status: 400 },
      );
    }

    const canManage = await canManageTeam(accessToken, userId, String(teamId));
    if (!canManage) {
      return NextResponse.json({ error: "Only team admins can add members." }, { status: 403 });
    }

    const env = getSupabaseEnv();

    if (targetUserId) {
      const rpcRes = await supabaseFetch(env, "rpc/add_team_member_by_user_id", {
        method: "POST",
        accessToken,
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({ target_team_id: teamId, target_user_id: targetUserId }),
      });
      if (rpcRes.ok) {
        const member = await rpcRes.json();
        return NextResponse.json({ member });
      }
      if (rpcRes.status !== 404) {
        const text = await rpcRes.text();
        return NextResponse.json({ error: text || "Unable to add member." }, { status: 400 });
      }
    }

    const profileLookup = targetUserId
      ? `profiles?id=eq.${encodeURIComponent(String(targetUserId))}&select=id,username,full_name,avatar_url`
      : `profiles?username=eq.${encodeURIComponent(String(username))}&select=id,username,full_name,avatar_url`;

    const profileRes = await adminSupabaseFetch(profileLookup);

    if (!profileRes.ok) {
      const text = await profileRes.text();
      return NextResponse.json({ error: text }, { status: 500 });
    }

    const profiles = await profileRes.json();
    const profile = profiles?.[0];
    if (!profile?.id) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    if (profile.id === userId) {
      return NextResponse.json({ error: "You are already on this team." }, { status: 400 });
    }

    const memberRes = await adminSupabaseFetch("team_members", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        team_id: teamId,
        user_id: profile.id,
        role: "member",
        created_at: new Date().toISOString(),
      }),
    });

    if (!memberRes.ok) {
      const text = await memberRes.text();
      return NextResponse.json({ error: text }, { status: 500 });
    }

    const rows = await memberRes.json();
    return NextResponse.json({ member: rows?.[0] ?? null });
  } catch (error) {
    if (error instanceof RequestAuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
  }
}
