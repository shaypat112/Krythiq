import { runGitHubScanWithToken, type ScanOptions, type Finding, type ScanProgress } from "@/app/services/githubScanner";
import { decodeUserId, getSupabaseEnv, supabaseFetch } from "@/app/lib/server/supabaseRest";
import { deliverWebhooks } from "@/app/lib/server/webhooks";
import { createNotification } from "@/app/lib/server/notifications";
import { purgeUserData } from "@/app/lib/server/retention";
import { logActivity } from "@/app/lib/server/activity";
import { generateScanIntelligence } from "@/app/lib/server/mistral-scan";

function summarizeFindings(findings: Finding[]) {
  const total = findings.length;
  const maxScore = findings.reduce((max, item) => Math.max(max, item.score), 0);
  const severity = findings.find((item) => item.score === maxScore)?.severity ?? "low";
  const avgScore = total > 0
    ? Math.round(findings.reduce((sum, item) => sum + item.score, 0) / total)
    : 0;
  return { total, severity, avgScore };
}

export async function handleGitHubScan(input: {
  repoUrl: string;
  options?: ScanOptions;
  accessToken?: string;
  teamId?: string | null;
  providerToken?: string;
  onProgress?: ScanProgress;
}) {
  const env = getSupabaseEnv();
  const accessToken = input.accessToken;
  if (!accessToken) throw new Error("Unauthorized");
  const userId = accessToken ? decodeUserId(accessToken) : null;

  const result = await runGitHubScanWithToken(input.repoUrl, input.options ?? {}, input.providerToken, input.onProgress);
  const { total, severity, avgScore } = summarizeFindings(result.findings);
  input.onProgress?.("recommendations", "Generating bounded repository intelligence with Mistral.");
  const intelligence = await generateScanIntelligence({
    repoName: result.repoName,
    profile: result.profile,
    findings: result.findings,
    model: input.options?.aiModel,
  });

  const scanPayload: Record<string, unknown> = {
    repo: result.repoName,
    created_at: new Date().toISOString(),
    severity,
    issues: total,
    score: avgScore,
    findings: { list: result.findings, profile: result.profile, systemDesign: result.systemDesign, intelligence, team_id: input.teamId ?? null },
  };

  if (userId && accessToken) scanPayload.user_id = userId;

  let scanInsertRes = await supabaseFetch(env, "scan_history", {
    method: "POST",
    accessToken,
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(scanPayload),
  });

  if (!scanInsertRes.ok) {
    const fallbackPayload = {
      repo: result.repoName,
      created_at: new Date().toISOString(),
      severity,
      issues: total,
      score: avgScore,
      findings: { list: result.findings, profile: result.profile, systemDesign: result.systemDesign, intelligence, team_id: input.teamId ?? null },
    };
    scanInsertRes = await supabaseFetch(env, "scan_history", {
      method: "POST",
      accessToken,
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(fallbackPayload),
    });
  }

  const scanRows = scanInsertRes.ok ? await scanInsertRes.json() : [];

  if (userId) {
    await logActivity(env, accessToken, {
      actor_id: userId,
      action: "scan.completed",
      target_type: "repository",
      target_id: null,
      meta: { repo_url: result.repoUrl },
    });

    await deliverWebhooks(env, accessToken, {
      userId,
      event: "scan.completed",
      payload: {
        scan_id: scanRows?.[0]?.id ?? null,
        repo_url: result.repoUrl,
        repo_name: result.repoName,
        total_findings: total,
        severity,
        score: avgScore,
        findings: result.findings,
      },
    });

    await createNotification({
      env,
      accessToken,
      userId,
      type: "scan.completed",
      teamId: input.teamId ?? null,
      data: {
        repo_name: result.repoName,
        repo_url: result.repoUrl,
        severity,
        issues: total,
        score: avgScore,
      },
    });

    await purgeUserData({
      env,
      accessToken,
      userId,
      days: 30,
    });
  }

  return {
    repoUrl: result.repoUrl,
    totalFindings: total,
    findings: result.findings,
    profile: result.profile,
    systemDesign: result.systemDesign,
    intelligence,
    scan: scanRows?.[0] ?? null,
  };
}
