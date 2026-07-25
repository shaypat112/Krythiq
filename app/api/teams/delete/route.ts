import { NextResponse } from "next/server";

import {
  getSupabaseEnv,
  RequestAuthError,
  requireRequestAuth,
  supabaseFetch,
} from "@/app/lib/server/supabaseRest";

export const runtime = "nodejs";

type DeletedTeam = {
  deleted_id: string;
  deleted_name: string;
};

export async function POST(request: Request) {
  try {
    const { accessToken } = requireRequestAuth(request);
    const body = await request.json().catch(() => ({}));
    const teamId = typeof body?.teamId === "string" ? body.teamId.trim() : "";

    if (!teamId) {
      return NextResponse.json({ error: "Missing teamId." }, { status: 400 });
    }

    const result = await supabaseFetch(
      getSupabaseEnv(),
      "rpc/delete_owned_team",
      {
        method: "POST",
        accessToken,
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({ target_team_id: teamId }),
      },
    );

    if (!result.ok) {
      const text = await result.text();
      if (/42501|only the team owner/i.test(text)) {
        return NextResponse.json(
          { error: "Only the team owner can delete this team." },
          { status: 403 },
        );
      }
      if (/PGRST202|delete_owned_team/i.test(text)) {
        return NextResponse.json(
          { error: "Team deletion is not configured. Apply the latest Supabase migration." },
          { status: 503 },
        );
      }
      return NextResponse.json(
        { error: "Unable to delete the team. No data was removed." },
        { status: 500 },
      );
    }

    const deleted = ((await result.json()) as DeletedTeam[])[0];
    if (!deleted) {
      return NextResponse.json({ error: "Team not found." }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      deletedTeam: { id: deleted.deleted_id, name: deleted.deleted_name },
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
