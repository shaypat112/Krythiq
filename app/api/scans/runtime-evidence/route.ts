import { NextResponse } from "next/server";

import { mergeRuntimeEvidence, type FindingWithRuntime, type RuntimeEvidenceReport, type RuntimeFileEvidence } from "@/app/lib/code-intelligence";
import { getSupabaseEnv, RequestAuthError, requireRequestAuth, supabaseFetch } from "@/app/lib/server/supabaseRest";

export const runtime = "nodejs";

type StoredScan = {
  id: string;
  repo: string;
  findings?: {
    list?: StoredFinding[];
    revision?: { headSha?: string };
    runtime_evidence?: RuntimeEvidenceReport;
    [key: string]: unknown;
  } | null;
};

type StoredFinding = FindingWithRuntime & Record<string, unknown>;

export async function POST(request: Request) {
  try {
    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (contentLength > 2 * 1024 * 1024) return NextResponse.json({ error: "Runtime evidence payload is too large." }, { status: 413 });
    const { accessToken, userId } = requireRequestAuth(request);
    const body = await request.json() as Record<string, unknown>;
    const scanId = typeof body.scanId === "string" ? body.scanId : "";
    const revision = typeof body.revision === "string" ? body.revision : "";
    if (!/^[0-9a-f]{7,64}$/i.test(revision) || !/^[0-9a-f-]{20,64}$/i.test(scanId)) {
      return NextResponse.json({ error: "A valid scan ID and Git revision are required." }, { status: 400 });
    }
    const files = normalizeRuntimeFiles(body.files);
    if (!files) return NextResponse.json({ error: "Runtime files must be a bounded coverage summary." }, { status: 400 });
    const env = getSupabaseEnv();
    const readResponse = await supabaseFetch(env, `scan_history?id=eq.${encodeURIComponent(scanId)}&user_id=eq.${userId}&select=id,repo,findings&limit=1`, { accessToken });
    if (!readResponse.ok) return NextResponse.json({ error: await readResponse.text() }, { status: 500 });
    const scan = ((await readResponse.json()) as StoredScan[])[0];
    if (!scan) return NextResponse.json({ error: "Scan not found." }, { status: 404 });
    const expectedRevision = scan.findings?.revision?.headSha;
    if (!expectedRevision || expectedRevision !== revision) {
      return NextResponse.json({ error: "Runtime evidence revision does not match the analyzed repository revision." }, { status: 409 });
    }
    const report: RuntimeEvidenceReport = {
      schemaVersion: 1,
      revision,
      source: "coverage-upload",
      collectedAt: new Date().toISOString(),
      files,
    };
    const findings = mergeRuntimeEvidence(scan.findings?.list ?? [], report);
    const updatedFindings = { ...(scan.findings ?? {}), list: findings, all_findings: findings, runtime_evidence: report };
    const updateResponse = await supabaseFetch(env, `scan_history?id=eq.${encodeURIComponent(scanId)}&user_id=eq.${userId}`, {
      method: "PATCH",
      accessToken,
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ findings: updatedFindings }),
    });
    if (!updateResponse.ok) return NextResponse.json({ error: await updateResponse.text() }, { status: 500 });
    return NextResponse.json({ scanId, revision, matchedFindings: findings.filter((finding) => finding.runtimeEvidence?.status !== "no-data").length, runtimeEvidence: report });
  } catch (error) {
    if (error instanceof RequestAuthError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Unable to attach runtime evidence." }, { status: 500 });
  }
}

function normalizeRuntimeFiles(value: unknown): RuntimeFileEvidence[] | null {
  if (!Array.isArray(value) || value.length > 5000) return null;
  const files: RuntimeFileEvidence[] = [];
  for (const row of value) {
    if (!row || typeof row !== "object") return null;
    const item = row as Record<string, unknown>;
    const file = typeof item.file === "string" ? item.file.replaceAll("\\", "/").replace(/^\.\//, "") : "";
    const executedLines = Number(item.executedLines);
    const totalLines = Number(item.totalLines);
    const invocations = item.invocations === undefined ? undefined : Number(item.invocations);
    if (!file || file.startsWith("/") || file.includes("../") || !Number.isInteger(executedLines) || !Number.isInteger(totalLines) || executedLines < 0 || totalLines < executedLines || (invocations !== undefined && (!Number.isInteger(invocations) || invocations < 0))) return null;
    files.push({ file, executedLines, totalLines, ...(invocations === undefined ? {} : { invocations }) });
  }
  return files.sort((a, b) => a.file.localeCompare(b.file));
}
