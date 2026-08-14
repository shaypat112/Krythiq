import { NextResponse } from "next/server";
import {
  RequestAuthError,
  requireRequestAuth,
} from "@/app/lib/server/supabaseRest";
import { adminSupabaseFetch, isAdminAccess } from "@/app/lib/server/admin";
import { canManageTeam } from "@/app/lib/server/teams";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { accessToken, userId } = requireRequestAuth(request);
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get("teamId");
    const query = searchParams.get("q")?.trim().slice(0, 64) ?? "";
    const searchableQuery = query.replace(/[,%_*()]/g, "").trim();

    if (!teamId || searchableQuery.length < 2) {
      return NextResponse.json({ error: "Enter at least two characters to search." }, { status: 400 });
    }

    const [adminAccess, managerAccess] = await Promise.all([
      isAdminAccess(accessToken, userId).catch(() => false),
      canManageTeam(accessToken, userId, teamId).catch(() => false),
    ]);

    if (!adminAccess && !managerAccess) {
      return NextResponse.json(
        { error: "Only team admins can view platform members." },
        { status: 403 },
      );
    }

    const searchTerm = encodeURIComponent(`*${searchableQuery}*`);
    const profilesRes = await adminSupabaseFetch(
      `profiles?or=(username.ilike.${searchTerm},full_name.ilike.${searchTerm})&select=id,username,full_name,avatar_url&order=username.asc.nullslast&limit=10`,
    );

    if (!profilesRes.ok) {
      const text = await profilesRes.text();
      return NextResponse.json(
        { error: text || "Unable to load platform members." },
        { status: 500 },
      );
    }

    const profiles = ((await profilesRes.json()) as Array<{
      id: string;
      username?: string | null;
      full_name?: string | null;
      avatar_url?: string | null;
    }>) ?? [];

    return NextResponse.json({
      members: profiles.filter(
        (profile) => profile.id && (profile.username || profile.full_name),
      ),
    });
  } catch (error) {
    if (error instanceof RequestAuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Unexpected server error." },
      { status: 500 },
    );
  }
}
