import { NextResponse } from "next/server";
import { stripe, getStripeConfig } from "@/app/lib/stripe";
import { TOKEN_PACKS, getConfiguredTokenPack } from "@/app/lib/token-packs";
import {
  RequestAuthError,
  requireRequestAuth,
} from "@/app/lib/server/supabaseRest";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    requireRequestAuth(request);
    const { secretKey, publishableKey } = getStripeConfig();

    if (!secretKey || !publishableKey) {
      return NextResponse.json({ error: "Stripe test checkout is not configured." }, { status: 503 });
    }

    const packs = await Promise.all(
      Object.values(TOKEN_PACKS).map(async (catalogPack) => {
        const pack = getConfiguredTokenPack(catalogPack.id);
        if (!pack) return { ...catalogPack, available: false as const };

        const price = await stripe.prices.retrieve(pack.priceId);
        return {
          id: pack.id,
          name: pack.name,
          tokens: pack.tokens,
          description: pack.description,
          available: price.active && price.type === "one_time" && price.unit_amount !== null,
          unitAmount: price.unit_amount,
          currency: price.currency,
        };
      }),
    );

    return NextResponse.json({ packs });
  } catch (error) {
    if (error instanceof RequestAuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Unable to load token packs." }, { status: 500 });
  }
}
