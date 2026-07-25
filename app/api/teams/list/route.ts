import { NextResponse } from "next/server";
import {
  RequestAuthError,
  getSupabaseEnv,
  requireRequestAuth,
  supabaseFetch,
} from "@/app/lib/server/supabaseRest";
import { adminSupabaseFetch, isAdminAccess } from "@/app/lib/server/admin";

export const runtime = "nodejs";

type TeamRow = {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  created_at: string;
};

type TeamMemberRow = {
  role?: string;
  teams?: TeamRow;
};

type CountRow = {
  team_id: string;
};

export async function GET(request: Request) {
  try {
    const { accessToken, userId } = requireRequestAuth(request);
    const env = getSupabaseEnv();
    const isAdmin = await isAdminAccess(accessToken, userId).catch(() => false);

    const [ownedRes, memberRes, environmentRes] = isAdmin
      ? await Promise.all([
          adminSupabaseFetch("teams?select=id,name,slug,owner_id,created_at"),
          adminSupabaseFetch(
            "team_members?select=team_id,role,teams(id,name,slug,owner_id,created_at)",
          ),
          adminSupabaseFetch("team_environments?select=team_id"),
        ])
      : await Promise.all([
          supabaseFetch(env, `teams?owner_id=eq.${userId}&select=id,name,slug,owner_id,created_at`, {
            accessToken,
          }),
          supabaseFetch(
            env,
            `team_members?user_id=eq.${userId}&select=team_id,role,teams(id,name,slug,owner_id,created_at)`,
            { accessToken },
          ),
          supabaseFetch(env, "team_environments?select=team_id", {
            accessToken,
          }),
        ]);

    // Owned teams must succeed
    if (!ownedRes.ok) {
      const text = await ownedRes.text();
      return NextResponse.json({ error: text }, { status: 500 });
    }

    const owned = (await ownedRes.json()) as TeamRow[];

    // memberRes and environmentRes are optional depending on DB schema.
    // If the underlying column/table is missing (e.g. during incremental migrations),
    // fall back to empty results instead of failing the whole endpoint.
    let memberRows: TeamMemberRow[] = [];
    try {
      if (memberRes.ok) {
        memberRows = (await memberRes.json()) as TeamMemberRow[];
      } else {
        const text = await memberRes.text();
        // If it's a schema error from PostgREST, ignore and continue with no members.
        if (!/PGRST|could not find table|column .* does not exist/i.test(text)) {
          return NextResponse.json({ error: text }, { status: 500 });
        }
      }
    } catch {
      memberRows = [];
    }

    let environmentRows: CountRow[] = [];
    try {
      if (environmentRes.ok) {
        environmentRows = (await environmentRes.json()) as CountRow[];
      } else {
        const text = await environmentRes.text();
        if (!/PGRST|could not find table|column .* does not exist/i.test(text)) {
          return NextResponse.json({ error: text }, { status: 500 });
        }
      }
    } catch {
      environmentRows = [];
    }

    const environmentCounts = environmentRows.reduce<Record<string, number>>(
      (acc, row) => {
        acc[row.team_id] = (acc[row.team_id] ?? 0) + 1;
        return acc;
      },
      {},
    );

    const teams = new Map<
      string,
      TeamRow & {
        role: string;
        repo_count: number;
        environment_count: number;
        can_manage: boolean;
      }
    >();
    for (const row of owned) {
      teams.set(row.id, {
        ...row,
        role: "owner",
        repo_count: 0,
        environment_count: environmentCounts[row.id] ?? 0,
        can_manage: true,
      });
    }
    for (const row of memberRows) {
      if (row.teams?.id && !teams.has(row.teams.id)) {
        teams.set(row.teams.id, {
          ...row.teams,
          role: isAdmin ? "admin" : row.role ?? "member",
          repo_count: 0,
          environment_count: environmentCounts[row.teams.id] ?? 0,
          can_manage: isAdmin || row.role === "owner" || row.role === "admin",
        });
      }
    }

    return NextResponse.json({ teams: Array.from(teams.values()) });
  } catch (error) {
    if (error instanceof RequestAuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
  }
}
