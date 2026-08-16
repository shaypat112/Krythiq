import { NextResponse } from "next/server";
import { adminSupabaseFetch } from "@/app/lib/server/admin";
import { requireCliAuth } from "@/app/lib/server/cliAuth";
import { RequestAuthError } from "@/app/lib/server/supabaseRest";
import { createNotification } from "@/app/lib/server/notifications";
import { getSupabaseEnv } from "@/app/lib/server/supabaseRest";

export const runtime = "nodejs";
const severities = new Set(["low", "medium", "high", "critical"]);

export async function POST(request: Request) {
  try {
    const { userId, tokenId } = await requireCliAuth(request);
    const body = await request.json();
    const repository = typeof body?.repository === "string" ? body.repository.trim().slice(0, 300) : "";
    const severity = typeof body?.severity === "string" && severities.has(body.severity) ? body.severity : "low";
    const findings = Array.isArray(body?.findings) ? body.findings.slice(0, 500) : [];
    const score = Math.max(0, Math.min(100, Number(body?.score) || 0));
    if (!repository) return NextResponse.json({ error: "Repository name is required." }, { status: 400 });
    const response = await adminSupabaseFetch("scan_history", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({ user_id: userId, repo_id: null, repo: repository, severity, issues: findings.length, score, findings: { list: findings, source: "cli", cli_version: typeof body?.cliVersion === "string" ? body.cliVersion.slice(0, 30) : null }, created_at: new Date().toISOString() }) });
    if (!response.ok) return NextResponse.json({ error: "Unable to save the CLI scan." }, { status: 503 });
    const scan = (await response.json())?.[0] ?? null;
    await adminSupabaseFetch("cli_scan_events", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ user_id: userId, cli_token_id: tokenId, scan_history_id: scan?.id ?? null, repository, issues: findings.length, token_cost: 0 }) }).catch(() => undefined);
    await createNotification({ env: getSupabaseEnv(), accessToken: "", userId, type: "scan.completed", useServiceRole: true, data: { repo_name: repository, repo_url: repository, severity, issues: findings.length, score, source: "cli" } }).catch(() => undefined);
    return NextResponse.json({ scan, tokenCost: 0 }, { status: 201 });
  } catch (error) {
    if (error instanceof RequestAuthError) return NextResponse.json({ error: error.message }, { status: 401 });
    return NextResponse.json({ error: "Unable to publish the CLI scan." }, { status: 500 });
  }
}
