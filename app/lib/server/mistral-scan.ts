import type { Finding, RepositoryProfile } from "@/app/services/githubScanner";
import { logServerError } from "@/app/lib/server/logger";

export type ScanIntelligence = {
  summary: string;
  architecture: string;
  securityPosture: string;
  strengths: string[];
  priorities: Array<{ title: string; reason: string; effort: "low" | "medium" | "high" }>;
  observations: string[];
};

function parseJson(content: string): ScanIntelligence | null {
  try {
    const normalized = content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    const value = JSON.parse(normalized) as Partial<ScanIntelligence>;
    if (typeof value.summary !== "string" || typeof value.architecture !== "string" || typeof value.securityPosture !== "string") return null;
    return {
      summary: value.summary,
      architecture: value.architecture,
      securityPosture: value.securityPosture,
      strengths: Array.isArray(value.strengths) ? value.strengths.filter((item): item is string => typeof item === "string").slice(0, 5) : [],
      priorities: Array.isArray(value.priorities) ? value.priorities.filter((item) => item && typeof item.title === "string" && typeof item.reason === "string").slice(0, 5).map((item) => ({ title: item.title, reason: item.reason, effort: ["low", "medium", "high"].includes(item.effort) ? item.effort : "medium" })) : [],
      observations: Array.isArray(value.observations) ? value.observations.filter((item): item is string => typeof item === "string").slice(0, 6) : [],
    };
  } catch {
    return null;
  }
}

export async function generateScanIntelligence(input: {
  repoName: string;
  profile: RepositoryProfile;
  findings: Finding[];
  model?: string;
}): Promise<ScanIntelligence | null> {
  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) return null;
  const safeFindings = input.findings.slice(0, 40).map((finding) => ({
    file: finding.file,
    severity: finding.severity,
    type: finding.type,
    category: finding.category,
    message: finding.message,
  }));
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  try {
    const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: input.model ?? process.env.MISTRAL_MODEL ?? "mistral-large-latest",
        temperature: 0.15,
        response_format: { type: "json_object" },
        max_tokens: 1800,
        messages: [
          { role: "system", content: "You are a senior application security architect. Analyze only the supplied repository metrics and static findings. Do not invent frameworks, vulnerabilities, or dependencies. Return valid JSON only." },
          { role: "user", content: `Analyze this bounded scan context:\n${JSON.stringify({ repository: input.repoName, profile: input.profile, findings: safeFindings })}\n\nReturn: {\"summary\":string,\"architecture\":string,\"securityPosture\":string,\"strengths\":string[],\"priorities\":[{\"title\":string,\"reason\":string,\"effort\":\"low\"|\"medium\"|\"high\"}],\"observations\":string[]}.` },
        ],
      }),
    });
    if (!response.ok) throw new Error(`Mistral request failed (${response.status}).`);
    const body = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    const content = body.choices?.[0]?.message?.content;
    return content ? parseJson(content) : null;
  } catch (error) {
    logServerError("scan.ai_analysis_failed", error);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
