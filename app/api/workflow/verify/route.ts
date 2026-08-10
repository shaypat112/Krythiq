import { NextResponse } from "next/server";
import { runPaidAiAction } from "@/app/lib/server/tokenLedger";
import { loadOwnedWorkflowScans, readSuggestion, type WorkflowSuggestion } from "@/app/lib/server/workflow-scans";

export const runtime = "nodejs";

function signature(item: WorkflowSuggestion) {
  return [item.file ?? "", item.category ?? "", item.title.trim().toLowerCase()].join("|");
}

export async function POST(request: Request) {
  const body = await request.clone().json().catch(() => ({}));
  const repository = typeof body?.repository === "string" && /^[\w.-]+\/[\w.-]+$/.test(body.repository.trim()) ? body.repository.trim() : null;
  const suggestionIndex = Number(body?.suggestionIndex);
  const baselineCreatedAt = typeof body?.baselineCreatedAt === "string" && !Number.isNaN(Date.parse(body.baselineCreatedAt)) ? body.baselineCreatedAt : null;
  if (!repository || !Number.isSafeInteger(suggestionIndex) || !baselineCreatedAt) {
    return NextResponse.json({ error: "Choose a valid repository and fix." }, { status: 400 });
  }

  return runPaidAiAction(request, "verification_run", async () => {
    const scans = await loadOwnedWorkflowScans(request, repository);
    const baselineIndex = scans.findIndex((scan) => scan.created_at === baselineCreatedAt);
    const baseline = baselineIndex >= 0 ? [scans[baselineIndex]] : [];
    const original = readSuggestion(baseline, suggestionIndex);
    if (!original) throw new Error("The selected fix no longer exists.");
    if (baselineIndex <= 0) {
      return { outcome: "inconclusive", repository, title: original.title, checkedAt: new Date().toISOString(), explanation: "Run a new repository scan after making the change. One scan cannot prove that code changed." };
    }
    const latestSuggestions = scans[0]?.findings?.aiReview?.suggestions ?? [];
    const stillPresent = latestSuggestions.some((item) => signature(item) === signature(original));
    if (!stillPresent) {
      return { outcome: "verified", repository, title: original.title, baselineCreatedAt, latestCreatedAt: scans[0].created_at, checkedAt: new Date().toISOString(), explanation: "The latest scan no longer reports the same file, category, and fix title. This is verified for static scan evidence; runtime behavior was not executed." };
    }
    return { outcome: "still_present", repository, title: original.title, checkedAt: new Date().toISOString(), explanation: "The latest scan still reports the same file, category, and fix title. Review the change and scan again." };
  });
}
