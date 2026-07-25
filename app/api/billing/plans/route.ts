import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripeConfig, stripe } from "@/app/lib/stripe";
import { RequestAuthError, requireRequestAuth } from "@/app/lib/server/supabaseRest";

export const runtime = "nodejs";

type ProductMetadata = { plan_id?: string; features?: string };

export async function GET(request: Request) {
  try {
    requireRequestAuth(request);
    const { secretKey, pricePro, priceTeam } = getStripeConfig();
    if (!secretKey || !pricePro || !priceTeam) {
      return NextResponse.json({ configured: false, plans: [] });
    }

    const prices = await Promise.all([pricePro, priceTeam].map((id) => stripe.prices.retrieve(id, { expand: ["product"] })));
    const plans = prices.map((price) => {
      const product = price.product as Stripe.Product;
      const metadata = product.metadata as ProductMetadata;
      let features: string[] = [];
      try { features = JSON.parse(metadata.features ?? "[]") as string[]; } catch { features = []; }
      return {
        id: metadata.plan_id ?? price.id,
        name: product.name,
        description: product.description ?? "Recurring security scanning subscription.",
        priceId: price.id,
        amount: price.unit_amount ?? 0,
        currency: price.currency,
        interval: price.recurring?.interval ?? "month",
        features,
      };
    });
    return NextResponse.json({ configured: true, plans });
  } catch (error) {
    if (error instanceof RequestAuthError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load plans." }, { status: 500 });
  }
}
