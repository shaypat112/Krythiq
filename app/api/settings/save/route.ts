import { NextResponse } from "next/server";
import {
  RequestAuthError,
  getSupabaseEnv,
  requireRequestAuth,
  supabaseFetch,
} from "@/app/lib/server/supabaseRest";

export const runtime = "nodejs";

type SettingsPayload = Record<string, unknown> & {
  fullName?: string | null;
  username?: string | null;
  avatarUrl?: string | null;
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const settings = body?.settings as SettingsPayload | undefined;
    const { accessToken, userId } = requireRequestAuth(request);

    if (!settings) {
      return NextResponse.json({ error: "Missing settings." }, { status: 400 });
    }

    const env = getSupabaseEnv();
    const profilePayload = {
      id: userId,
      updated_at: new Date().toISOString(),
      full_name: settings.fullName ?? null,
      username: settings.username ?? null,
      avatar_url: settings.avatarUrl ?? null,
    };

    const profileUpsertRes = await supabaseFetch(env, "profiles", {
      method: "POST",
      accessToken,
      headers: {
        Prefer: "resolution=merge-duplicates",
      },
      body: JSON.stringify(profilePayload),
    });

    if (!profileUpsertRes.ok) {
      const text = await profileUpsertRes.text();
      return NextResponse.json({ error: text }, { status: 500 });
    }

    return NextResponse.json({
      settings: {
        fullName: settings.fullName ?? "",
        username: settings.username ?? "",
        avatarUrl: settings.avatarUrl ?? "",
      },
    });
  } catch (error) {
    if (error instanceof RequestAuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
  }
}
