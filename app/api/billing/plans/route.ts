import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripeConfig, stripe } from "@/app/lib/stripe";
import { RequestAuthError, requireRequestAuth } from "@/app/lib/server/supabaseRest";

export const runtime = "nodejs";

type ProductMetadata = { plan_id?: string; features?: string };

export async function GET(request: Request) {
  try {
    requireRequestAuth(request);
    const {
      secretKey,
      pricePro,
      priceTeam,
      priceProYearly,
      priceTeamYearly,
    } = getStripeConfig();
    if (!secretKey || !pricePro || !priceTeam) {
      return NextResponse.json({ configured: false, plans: [] });
    }

    const planPrices = [
      { monthlyId: pricePro, yearlyId: priceProYearly },
      { monthlyId: priceTeam, yearlyId: priceTeamYearly },
    ];
    const plans = await Promise.all(planPrices.map(async ({ monthlyId, yearlyId }) => {
      const [price, yearlyPrice] = await Promise.all([
        stripe.prices.retrieve(monthlyId, { expand: ["product"] }),
        yearlyId ? stripe.prices.retrieve(yearlyId) : Promise.resolve(null),
      ]);
      const product = price.product as Stripe.Product;
      const metadata = product.metadata as ProductMetadata;
      let features: string[] = [];
      try { features = JSON.parse(metadata.features ?? "[]") as string[]; } catch { features = []; }
      const planId = metadata.plan_id ?? price.id;
      const entitlementFeatures = planId === "pro"
        ? ["2,000 Tokens refreshed every week", "Unlimited teams"]
        : planId === "team"
          ? ["Fair-use unlimited Tokens", "Unlimited teams", "Rate limits protect platform availability"]
          : [];
      return {
        id: planId,
        name: planId === "team" ? "Plus" : planId === "pro" ? "Pro" : product.name,
        description: product.description ?? "Recurring security scanning subscription.",
        priceId: price.id,
        amount: price.unit_amount ?? 0,
        currency: price.currency,
        interval: price.recurring?.interval ?? "month",
        yearlyAmount: yearlyPrice?.unit_amount ?? null,
        yearlyPriceId: yearlyPrice?.id ?? null,
        features: [...entitlementFeatures, ...features.filter((feature) => !entitlementFeatures.includes(feature))],
      };
    }));
    return NextResponse.json({ configured: true, plans });
  } catch (error) {
    if (error instanceof RequestAuthError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load plans." }, { status: 500 });
  }
}
