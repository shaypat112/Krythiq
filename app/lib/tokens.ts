import { scanLevelConfig, type ScanTier } from "./scanner/scan-levels";

export const tokenActionCatalog = {
  chat: { label: "AI chat response", cost: 5 },
  ask_codebase: { label: "Ask the codebase", cost: 10 },
  security_analysis: { label: "Security analysis", cost: 15 },
  repository_intelligence: { label: "Repository intelligence", cost: 20 },
  scan_low: { label: "Low repository scan", cost: 30 },
  scan_mid: { label: "Mid repository scan", cost: 50 },
  scan_high: { label: "High repository scan", cost: 70 },
  architecture_health: { label: "Architecture health", cost: 15 },
  attack_path: { label: "Attack-path simulation", cost: 20 },
  remediation_plan: { label: "Remediation plan", cost: 25 },
  agent_prompt: { label: "Guided-fix agent prompts", cost: 5 },
} as const;

export type TokenAction = keyof typeof tokenActionCatalog;
export { scanLevelConfig as scanTierCatalog, type ScanTier };
export { readScanTier } from "./scanner/scan-levels";

export const STARTER_TOKEN_AMOUNT = 100;
export const REFERRAL_REWARD_AMOUNT = 100;

export function formatTokens(value: number | bigint) {
  return `${Number(value).toLocaleString()} Tokens`;
}

export function isTokenAction(value: string): value is TokenAction {
  return Object.hasOwn(tokenActionCatalog, value);
}
