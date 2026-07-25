import { NextResponse } from "next/server";
import { getAdminIdentityConfig, isAdminAccess } from "@/app/lib/server/admin";
import {
  RequestAuthError,
  getSupabaseEnv,
  requireRequestAuth,
  supabaseFetch,
} from "@/app/lib/server/supabaseRest";
import { purgeUserData } from "@/app/lib/server/retention";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { accessToken, userId } = requireRequestAuth(request);

    const env = getSupabaseEnv();

    const profileRes = await supabaseFetch(
      env,
      `profiles?id=eq.${userId}&select=full_name,username,avatar_url`,
      { accessToken },
    );

    if (!profileRes.ok) {
      const details = {
        profile: await profileRes.text(),
      };
      return NextResponse.json({ error: "Database request failed", details }, { status: 500 });
    }

    const profileRows = await profileRes.json();
    const profile = profileRows?.[0] ?? {};

    const settings = {
      fullName: profile.full_name ?? "",
      username: profile.username ?? "",
      avatarUrl: profile.avatar_url ?? "",
    };

    await purgeUserData({ env, accessToken, userId, days: 30 });

    const adminConfig = getAdminIdentityConfig();
    const isAdmin = await isAdminAccess(accessToken, userId).catch(() => false);

    return NextResponse.json({
      settings,
      admin: {
        isAdmin,
        profileUsername: adminConfig.profileUsername,
        githubLogin: adminConfig.githubLogin,
      },
    });
  } catch (error) {
    if (error instanceof RequestAuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
  }
}
