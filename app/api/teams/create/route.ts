import { NextResponse } from "next/server";
import {
  RequestAuthError,
  getSupabaseEnv,
  requireVerifiedRequestAuth,
  supabaseFetch,
} from "@/app/lib/server/supabaseRest";
import { adminSupabaseFetch } from "@/app/lib/server/admin";
import { getUserEntitlements } from "@/app/lib/server/plan-entitlements";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { name, source } = await request.json();
    const { accessToken, userId } = await requireVerifiedRequestAuth(request);

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
    const entitlements = await getUserEntitlements(userId);
    if (entitlements.maxOwnedTeams !== null) {
      const ownedResponse = await supabaseFetch(env, `teams?owner_id=eq.${userId}&select=id`, { accessToken });
      if (!ownedResponse.ok) return NextResponse.json({ error: "Unable to verify your team allowance." }, { status: 500 });
      const owned = await ownedResponse.json() as Array<{ id: string }>;
      if (owned.length >= entitlements.maxOwnedTeams) {
        return NextResponse.json({ error: `The ${entitlements.label} plan supports up to ${entitlements.maxOwnedTeams} teams. Upgrade to create another team.`, code: "TEAM_LIMIT_REACHED", limit: entitlements.maxOwnedTeams }, { status: 403 });
      }
    }
    const slug = normalizedName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    const res = await adminSupabaseFetch("teams", {
      method: "POST",
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
      let message = "Unable to create team.";
      try {
        const payload = JSON.parse(text) as { message?: string };
        if (payload.message) message = payload.message;
      } catch {
        // Keep the stable user-facing fallback for non-JSON upstream errors.
      }
      return NextResponse.json({ error: message }, { status: 500 });
    }

    const rows = await res.json();
    const team = rows?.[0];

    if (!team?.id) {
      return NextResponse.json({ error: "Unable to create team." }, { status: 500 });
    }

    const membershipResponse = await adminSupabaseFetch("team_members", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        team_id: team.id,
        user_id: userId,
        role: "owner",
        created_at: new Date().toISOString(),
      }),
    });

    if (!membershipResponse.ok) {
      await adminSupabaseFetch(`teams?id=eq.${encodeURIComponent(team.id)}`, {
        method: "DELETE",
      }).catch(() => undefined);
      return NextResponse.json(
        { error: "Unable to establish team ownership." },
        { status: 500 },
      );
    }

    return NextResponse.json({ team });
  } catch (error) {
    if (error instanceof RequestAuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
  }
}
