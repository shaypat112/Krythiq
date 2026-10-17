import { recentScansQuery, type ScanHistoryRow } from "@/app/lib/scan-history";
import { NextResponse } from "next/server";
import {
  RequestAuthError,
  extractSelectedTeamId,
  getSupabaseEnv,
  requireRequestAuth,
  supabaseFetch,
} from "@/app/lib/server/supabaseRest";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { accessToken, userId } = requireRequestAuth(request);
    const selectedTeamId = extractSelectedTeamId(request);
    const env = getSupabaseEnv();

    // Scope before limiting, and leave code/snippets in the detail endpoint.
    const query = recentScansQuery(userId, selectedTeamId);
    const res = await supabaseFetch(env, `scan_history?${query}`, { accessToken });

    if (!res.ok) {
      return NextResponse.json({ error: await res.text() }, { status: 500 });
    }

    const rows = (await res.json()) as ScanHistoryRow[];
    return NextResponse.json({ scans: rows });
  } catch (error) {
    if (error instanceof RequestAuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
  }
}
