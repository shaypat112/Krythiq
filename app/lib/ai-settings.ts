export type AiUsageLevel = "minimal" | "balanced" | "maximum";
export type ScanScope = "frontend" | "backend" | "all";

export type AiSettings = {
  aiUsageLevel: AiUsageLevel;
  defaultScanScope: ScanScope;
  aiSuggestionsEnabled: boolean;
  vibeDetectionEnabled: boolean;
  maxAiSuggestions: number;
};

export const defaultAiSettings: AiSettings = {
  aiUsageLevel: "balanced",
  defaultScanScope: "frontend",
  aiSuggestionsEnabled: true,
  vibeDetectionEnabled: true,
  maxAiSuggestions: 5,
};

export function readScanScope(value: unknown): ScanScope | null {
  return value === "frontend" || value === "backend" || value === "all"
    ? value
    : null;
}

export function normalizeAiSettings(value: unknown): AiSettings {
  const input =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};
  const aiUsageLevel: AiUsageLevel =
    input.aiUsageLevel === "minimal" ||
    input.aiUsageLevel === "balanced" ||
    input.aiUsageLevel === "maximum"
      ? input.aiUsageLevel
      : defaultAiSettings.aiUsageLevel;

  return {
    aiUsageLevel,
    defaultScanScope:
      readScanScope(input.defaultScanScope) ?? defaultAiSettings.defaultScanScope,
    aiSuggestionsEnabled:
      typeof input.aiSuggestionsEnabled === "boolean"
        ? input.aiSuggestionsEnabled
        : defaultAiSettings.aiSuggestionsEnabled,
    vibeDetectionEnabled:
      typeof input.vibeDetectionEnabled === "boolean"
        ? input.vibeDetectionEnabled
        : defaultAiSettings.vibeDetectionEnabled,
    maxAiSuggestions: Math.max(
      1,
      Math.min(
        8,
        Number.isFinite(Number(input.maxAiSuggestions))
          ? Math.round(Number(input.maxAiSuggestions))
          : defaultAiSettings.maxAiSuggestions,
      ),
    ),
  };
}
