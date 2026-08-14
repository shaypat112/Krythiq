import "server-only";

import { planFromPriceId, type ApiPlanId } from "@/app/lib/api-rate-limits";
import { adminSupabaseFetch } from "./admin";

export const planEntitlements: Record<ApiPlanId, {
  label: string;
  maxOwnedTeams: number | null;
  weeklyTokens: number;
  unlimitedTokens: boolean;
  expensiveActionsPerMinute: number;
}> = {
  free: { label: "Free", maxOwnedTeams: 2, weeklyTokens: 0, unlimitedTokens: false, expensiveActionsPerMinute: 5 },
  pro: { label: "Pro", maxOwnedTeams: null, weeklyTokens: 2_000, unlimitedTokens: false, expensiveActionsPerMinute: 20 },
  team: { label: "Plus", maxOwnedTeams: null, weeklyTokens: 0, unlimitedTokens: true, expensiveActionsPerMinute: 60 },
};

export async function getUserPlan(userId: string): Promise<ApiPlanId> {
  const response = await adminSupabaseFetch(`billing_customers?user_id=eq.${encodeURIComponent(userId)}&select=price_id,status&limit=1`);
  if (!response.ok) return "free";
  const row = (await response.json() as Array<{ price_id?: string | null; status?: string | null }>)[0];
  return row && (row.status === "active" || row.status === "trialing") ? planFromPriceId(row.price_id) : "free";
}

export async function getUserEntitlements(userId: string) {
  const plan = await getUserPlan(userId);
  return { plan, ...planEntitlements[plan] };
}
