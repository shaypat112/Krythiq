import { NextResponse } from "next/server";
import {
  RequestAuthError,
  getSupabaseEnv,
  requireRequestAuth,
  supabaseFetch,
} from "@/app/lib/server/supabaseRest";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { name, source } = await request.json();
    const { accessToken, userId } = requireRequestAuth(request);

    const normalizedName = typeof name === "string" ? name.trim() : "";
    if (normalizedName.length < 2 || normalizedName.length > 120) {
      return NextResponse.json({ error: "Missing name." }, { status: 400 });
    }

    const env = getSupabaseEnv();
    if (source === "onboarding") {
      const existingResponse = await supabaseFetch(env, `teams?owner_id=eq.${userId}&name=eq.${encodeURIComponent(normalizedName)}&select=id,name,slug,owner_id,created_at&limit=1`, { accessToken });
      const existing = existingResponse.ok ? await existingResponse.json() : [];
      if (existing?.[0]) return NextResponse.json({ team: existing[0], existing: true });
    }
    const slug = normalizedName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    const res = await supabaseFetch(env, "teams", {
      method: "POST",
      accessToken,
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        name: normalizedName,
        slug,
        owner_id: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: text }, { status: 500 });
    }

    const rows = await res.json();
    const team = rows?.[0];

    if (team?.id) {
      await supabaseFetch(env, "team_members", {
        method: "POST",
        accessToken,
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({
          team_id: team.id,
          user_id: userId,
          role: "owner",
          created_at: new Date().toISOString(),
        }),
      });
    }

    return NextResponse.json({ team });
  } catch (error) {
    if (error instanceof RequestAuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
  }
}
