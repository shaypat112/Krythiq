export type ApiPlanId = "free" | "pro" | "team";

export type ApiLimitSettings = {
  apiRequestsPerMinute: number;
  expensiveRequestsPerMinute: number;
};

export const apiPlanCatalog: Record<ApiPlanId, {
  name: string;
  audience: string;
  pricePosition: string;
  included: string;
  limits: ApiLimitSettings;
}> = {
  free: {
    name: "Free",
    audience: "Trying Votrio on personal projects",
    pricePosition: "$0 while validating the workflow",
    included: "Core repository scans and in-app results",
    limits: { apiRequestsPerMinute: 60, expensiveRequestsPerMinute: 5 },
  },
  pro: {
    name: "Pro",
    audience: "Developers shipping production applications",
    pricePosition: "Paid individual plan",
    included: "Higher limits, integrations, and longer history",
    limits: { apiRequestsPerMinute: 300, expensiveRequestsPerMinute: 20 },
  },
  team: {
    name: "Team",
    audience: "Engineering teams sharing repositories and policy",
    pricePosition: "Per-team subscription",
    included: "Shared workflows, team controls, and highest standard limits",
    limits: { apiRequestsPerMinute: 1200, expensiveRequestsPerMinute: 60 },
  },
};

export function planFromPriceId(priceId: string | null | undefined): ApiPlanId {
  if (priceId && priceId === process.env.STRIPE_PRICE_TEAM) return "team";
  if (priceId && priceId === process.env.STRIPE_PRICE_PRO) return "pro";
  return "free";
}

function boundedInteger(value: unknown, fallback: number, min: number, max: number) {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isSafeInteger(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

export function normalizeApiLimits(value: Partial<ApiLimitSettings> | null | undefined, planId: ApiPlanId): ApiLimitSettings {
  const maximum = apiPlanCatalog[planId].limits;
  return {
    apiRequestsPerMinute: boundedInteger(value?.apiRequestsPerMinute, maximum.apiRequestsPerMinute, 10, maximum.apiRequestsPerMinute),
    expensiveRequestsPerMinute: boundedInteger(value?.expensiveRequestsPerMinute, maximum.expensiveRequestsPerMinute, 1, maximum.expensiveRequestsPerMinute),
  };
}
