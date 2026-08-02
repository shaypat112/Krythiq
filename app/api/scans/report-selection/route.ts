import { NextResponse } from "next/server";
import {
  extractSelectedTeamId,
  getSupabaseEnv,
  RequestAuthError,
  requireRequestAuth,
  supabaseFetch,
} from "@/app/lib/server/supabaseRest";

type StoredFinding = { file?: string; line?: number; type?: string; severity?: string; score?: number };
type StoredFindings = Record<string, unknown> & {
  list?: StoredFinding[];
  all_findings?: StoredFinding[];
  team_id?: string | null;
};

const findingKey = (finding: StoredFinding) => `${finding.file ?? ""}:${finding.line ?? 0}:${finding.type ?? ""}`;

export async function PATCH(request: Request) {
  try {
    const { accessToken, userId } = requireRequestAuth(request);
    const selectedTeamId = extractSelectedTeamId(request);
    const body = await request.json();
    const scanId = typeof body?.scanId === "string" ? body.scanId.trim() : "";
    const selectedKeys = Array.isArray(body?.selectedKeys)
      ? body.selectedKeys.filter((key: unknown): key is string => typeof key === "string")
      : null;
    if (!scanId || !/^[a-zA-Z0-9-]+$/.test(scanId) || !selectedKeys || selectedKeys.length > 1000) {
      return NextResponse.json({ error: "Invalid report selection." }, { status: 400 });
    }

    const env = getSupabaseEnv();
    const readResponse = await supabaseFetch(env, `scan_history?id=eq.${encodeURIComponent(scanId)}&user_id=eq.${userId}&select=id,findings&limit=1`, { accessToken });
    if (!readResponse.ok) return NextResponse.json({ error: await readResponse.text() }, { status: 500 });
    const rows = await readResponse.json() as Array<{ id: string; findings?: StoredFindings | null }>;
    const row = rows[0];
    if (!row) return NextResponse.json({ error: "Scan not found." }, { status: 404 });
    const stored = row.findings ?? {};
    const teamId = stored.team_id ?? null;
    if (selectedTeamId ? teamId !== selectedTeamId : teamId !== null) {
      return NextResponse.json({ error: "Scan not found." }, { status: 404 });
    }

    const allFindings = stored.all_findings ?? stored.list ?? [];
    const selected = new Set(selectedKeys);
    const list = allFindings.filter((finding) => selected.has(findingKey(finding)));
    const highest = list.reduce((current, finding) => Math.max(current, Number(finding.score ?? 0)), 0);
    const severity = list.find((finding) => Number(finding.score ?? 0) === highest)?.severity ?? "low";
    const score = list.length ? Math.round(list.reduce((sum, finding) => sum + Number(finding.score ?? 0), 0) / list.length) : 0;
    const findings = { ...stored, all_findings: allFindings, list, report_selected_keys: list.map(findingKey) };

    const updateResponse = await supabaseFetch(env, `scan_history?id=eq.${encodeURIComponent(scanId)}&user_id=eq.${userId}`, {
      method: "PATCH",
      accessToken,
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ findings, issues: list.length, severity, score }),
    });
    if (!updateResponse.ok) return NextResponse.json({ error: await updateResponse.text() }, { status: 500 });
    return NextResponse.json({ saved: list.length });
  } catch (error) {
    if (error instanceof RequestAuthError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
  }
}
