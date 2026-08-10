import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { runPaidAiAction } from "@/app/lib/server/tokenLedger";
import { loadOwnedWorkflowScans, readSuggestion } from "@/app/lib/server/workflow-scans";

export const runtime = "nodejs";

const protectedPath = /(^|\/)(\.env|\.github\/workflows|auth|billing|migrations?|package-lock\.json|pnpm-lock\.yaml|yarn\.lock)(\/|$)/i;
const secretLike = /(-----BEGIN [A-Z ]+PRIVATE KEY-----|(?:api[_-]?key|secret|token|password)\s*[:=]\s*["'][^"']{8,})/i;

function cleanRepository(value: unknown) {
  const repository = typeof value === "string" ? value.trim() : "";
  return /^[\w.-]+\/[\w.-]+$/.test(repository) ? repository : null;
}

function line(value: string, prefix: "-" | "+") {
  return value.split("\n").map((part) => `${prefix}${part}`).join("\n");
}

export async function POST(request: Request) {
  const body = await request.clone().json().catch(() => ({}));
  const repository = cleanRepository(body?.repository);
  const suggestionIndex = Number(body?.suggestionIndex);
  if (!repository || !Number.isSafeInteger(suggestionIndex)) {
    return NextResponse.json({ error: "Choose a valid repository and fix." }, { status: 400 });
  }

  return runPaidAiAction(request, "draft_patch", async () => {
    const scans = await loadOwnedWorkflowScans(request, repository);
    const suggestion = readSuggestion(scans, suggestionIndex);
    if (!suggestion?.file || !suggestion.currentCode || !suggestion.replacementCode) {
      throw new Error("This fix does not contain enough exact code to build a safe patch.");
    }
    const file = suggestion.file.replaceAll("\\", "/").replace(/^\.\//, "");
    if (!file || file.startsWith("/") || file.includes("../") || protectedPath.test(file)) {
      throw new Error("This file requires a manual security review and cannot be drafted automatically.");
    }
    if (suggestion.currentCode.length > 20_000 || suggestion.replacementCode.length > 20_000) {
      throw new Error("The proposed change is too large for automatic drafting.");
    }
    if (secretLike.test(suggestion.replacementCode)) {
      throw new Error("The proposed change resembles a credential and was blocked.");
    }
    const oldLines = suggestion.currentCode.split("\n").length;
    const newLines = suggestion.replacementCode.split("\n").length;
    const startLine = Math.max(1, Number(suggestion.line) || 1);
    const patch = `--- a/${file}\n+++ b/${file}\n@@ -${startLine},${oldLines} +${startLine},${newLines} @@\n${line(suggestion.currentCode, "-")}\n${line(suggestion.replacementCode, "+")}\n`;
    return {
      repository,
      file,
      title: suggestion.title,
      patch,
      patchSha256: createHash("sha256").update(patch).digest("hex"),
      expiresInSeconds: 900,
      publishSupported: false,
      safetyNotice: "Review every line. This preview is not applied or published automatically.",
    };
  });
}
