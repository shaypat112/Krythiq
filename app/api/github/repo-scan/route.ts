import { NextResponse } from "next/server";
import {
  extractSelectedTeamId,
  RequestAuthError,
  getSupabaseEnv,
  requireRequestAuth,
  supabaseFetch,
} from "@/app/lib/server/supabaseRest";
import { deliverWebhooks } from "@/app/lib/server/webhooks";
import { logActivity } from "@/app/lib/server/activity";
import { createNotification } from "@/app/lib/server/notifications";
import { purgeUserData } from "@/app/lib/server/retention";
import { aiScanner } from "@/app/services/aiScanner";

export const runtime = "nodejs";

type ErrorWithStatus = Error & { status?: number };
export async function POST(request: Request) {
  const body = await request.json();
  const providerToken =
    (body?.providerToken as string | null | undefined) ?? undefined;
  const repoFullName = body?.repo as string | undefined;
  const { accessToken, userId } = requireRequestAuth(request);
  const repoForFailure = repoFullName;
  const authForFailure = { accessToken, userId };
  const selectedTeamId = extractSelectedTeamId(request);

  if (!repoFullName) {
    return NextResponse.json({ error: "Missing repo" }, { status: 400 });
  }

  const mistralKey = process.env.MISTRAL_API_KEY;

  if (!mistralKey) {
    return NextResponse.json(
      { error: "MISTRAL_API_KEY is missing" },
      { status: 500 },
    );
  }

  try {
    const supabaseEnv = getSupabaseEnv();

    // Use AI-enhanced scanner
    const scanResult = await aiScanner.scanRepository(
      `https://github.com/${repoFullName}`,
      providerToken,
      { useAI: true, model: "mistral-large-latest" },
    );

    const findings = scanResult.findings;
    const aiAnalysis = scanResult.aiAnalysis;
    const summary = scanResult.summary;
    const systemDesign = scanResult.systemDesign;

    const highestSeverity =
      findings.find((item) => item.severity === "critical")?.severity ??
      findings.find((item) => item.severity === "high")?.severity ??
      findings.find((item) => item.severity === "medium")?.severity ??
      findings.find((item) => item.severity === "low")?.severity ??
      "low";
    const score =
      findings.length > 0
        ? Math.round(
            findings.reduce((sum, item) => sum + item.score, 0) /
              findings.length,
          )
        : 0;

    // Generate AI summary using the enhanced scanner
    const aiSummary = await aiScanner.generateAISummary(
      findings,
      `Repository: ${repoFullName}\nTotal Files: ${summary.totalFiles}\nLanguages: TypeScript, JavaScript`,
      "mistral-large-latest",
    );

    const severity = highestSeverity;
    const issues = findings.length;

    const now = new Date().toISOString();

    const payload = {
      user_id: userId,
      repo_id: null,
      repo: repoFullName,
      severity,
      issues,
      score,
      findings: {
        ai_summary: aiSummary || "AI scan completed.",
        list: findings,
        ai_analysis: aiAnalysis,
        scan_summary: summary,
        profile: scanResult.profile,
        systemDesign,
        team_id: selectedTeamId,
      },
      created_at: now,
    };

    const insertRes = await supabaseFetch(supabaseEnv, "scan_history", {
      method: "POST",
      accessToken,
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(payload),
    });

    if (!insertRes.ok) {
      const text = await insertRes.text();
      return NextResponse.json({ error: text }, { status: 500 });
    }

    const inserted = await insertRes.json();

    const updateRepoRes = await supabaseFetch(
      supabaseEnv,
      `connected_repos?user_id=eq.${userId}&full_name=eq.${encodeURIComponent(repoFullName)}`,
      {
        method: "PATCH",
        accessToken,
        body: JSON.stringify({ last_scanned_at: now }),
      },
    );

    if (!updateRepoRes.ok) {
      const text = await updateRepoRes.text();
      return NextResponse.json(
        { error: `Failed to update repo: ${text}` },
        { status: 500 },
      );
    }

    await logActivity(supabaseEnv, accessToken, {
      actor_id: userId,
      action: "scan.completed",
      target_type: "repository",
      target_id: null,
      meta: { repo_url: repoFullName },
    });

    await deliverWebhooks(supabaseEnv, accessToken, {
      userId,
      event: "scan.completed",
      payload: {
        scan_id: inserted?.[0]?.id ?? null,
        repo_url: repoFullName,
        severity,
        score,
        total_findings: issues,
        findings,
      },
    });

    await createNotification({
      env: supabaseEnv,
      accessToken,
      userId,
      type: "scan.completed",
      teamId: selectedTeamId,
      data: {
        repo_name: repoFullName,
        repo_url: repoFullName,
        severity,
        issues,
        score,
      },
    });

    await purgeUserData({
      env: supabaseEnv,
      accessToken,
      userId,
      days: 30,
    });

    return NextResponse.json({
      summary: aiSummary || "AI scan completed.",
      severity,
      score,
      issues,
      aiAnalysis,
      scanSummary: summary,
      systemDesign,
      scan: inserted?.[0] ?? null,
      findings,
    });
  } catch (err: unknown) {
    if (err instanceof RequestAuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const error = err as ErrorWithStatus;
    const status = Number(error?.status ?? 0);
    const message = String(error?.message ?? "Scan failed.");
    if (repoForFailure && authForFailure) {
      try {
        await deliverWebhooks(getSupabaseEnv(), authForFailure.accessToken, {
          userId: authForFailure.userId,
          event: "scan.failed",
          payload: { repo_url: repoForFailure, error: message },
        });
      } catch {
        // Preserve the original scan error when webhook delivery fails.
      }
    }
    if (status === 409 && message.includes("Repository is empty")) {
      return NextResponse.json(
        {
          error: "GitHub repository is empty. Add at least one commit to scan.",
        },
        { status: 409 },
      );
    }
    if (
      message.toLowerCase().includes("not found") ||
      message.toLowerCase().includes("requires authentication")
    ) {
      return NextResponse.json(
        { error: "GitHub authorization required for private repositories." },
        { status: 403 },
      );
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
