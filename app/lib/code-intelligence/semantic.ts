export type SemanticSimilarityAssessment = {
  candidateFingerprint: string;
  status: "unverified";
  relationship: "same-purpose" | "related-but-distinct" | "unrelated" | "uncertain";
  similarityBand: "strong" | "possible" | "weak" | "unknown";
  rationale: string;
  behavioralRisks: string[];
  refactorRecommendation: "consider-consolidation" | "keep-separate" | "human-review";
  autoFixSafe: false;
};

export function parseSemanticAssessments(value: unknown, allowedFingerprints: Set<string>) {
  const rows = value && typeof value === "object" && Array.isArray((value as { assessments?: unknown }).assessments)
    ? (value as { assessments: unknown[] }).assessments
    : [];
  return rows.flatMap((row): SemanticSimilarityAssessment[] => {
    if (!row || typeof row !== "object") return [];
    const item = row as Record<string, unknown>;
    const candidateFingerprint = typeof item.candidateFingerprint === "string" ? item.candidateFingerprint : "";
    if (!allowedFingerprints.has(candidateFingerprint)) return [];
    const relationship = ["same-purpose", "related-but-distinct", "unrelated", "uncertain"].includes(String(item.relationship))
      ? item.relationship as SemanticSimilarityAssessment["relationship"] : "uncertain";
    const similarityBand = ["strong", "possible", "weak", "unknown"].includes(String(item.similarityBand))
      ? item.similarityBand as SemanticSimilarityAssessment["similarityBand"] : "unknown";
    const refactorRecommendation = ["consider-consolidation", "keep-separate", "human-review"].includes(String(item.refactorRecommendation))
      ? item.refactorRecommendation as SemanticSimilarityAssessment["refactorRecommendation"] : "human-review";
    return [{
      candidateFingerprint,
      status: "unverified",
      relationship,
      similarityBand,
      rationale: typeof item.rationale === "string" ? item.rationale.slice(0, 600) : "The model did not provide a rationale.",
      behavioralRisks: Array.isArray(item.behavioralRisks)
        ? item.behavioralRisks.filter((risk): risk is string => typeof risk === "string").slice(0, 5).map((risk) => risk.slice(0, 240))
        : [],
      refactorRecommendation,
      autoFixSafe: false,
    }];
  });
}
