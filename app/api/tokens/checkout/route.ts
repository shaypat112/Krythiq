import { NextResponse } from "next/server";
import { stripe, getStripeConfig } from "@/app/lib/stripe";
import { adminSupabaseFetch } from "@/app/lib/server/admin";
import {
  RequestAuthError,
  getSupabaseEnv,
  requireRequestAuth,
  supabaseFetch,
} from "@/app/lib/server/supabaseRest";
import { getConfiguredTokenPack, isTokenPackId } from "@/app/lib/token-packs";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { accessToken, userId } = requireRequestAuth(request);
    const body = await request.json().catch(() => ({}));
    if (!isTokenPackId(body?.packId)) {
      return NextResponse.json({ error: "Invalid token pack." }, { status: 400 });
    }

    const pack = getConfiguredTokenPack(body.packId);
    const { secretKey, publishableKey } = getStripeConfig();
    if (!pack || !secretKey || !publishableKey) {
      return NextResponse.json({ error: "This token pack is not configured in Stripe test mode." }, { status: 503 });
    }

    const price = await stripe.prices.retrieve(pack.priceId);
    if (!price.active || price.type !== "one_time" || price.unit_amount === null) {
      return NextResponse.json({ error: "This token pack is unavailable." }, { status: 409 });
    }

    const env = getSupabaseEnv();
    const customerResponse = await supabaseFetch(
      env,
      `billing_customers?user_id=eq.${userId}&select=stripe_customer_id&limit=1`,
      { accessToken },
    );
    if (!customerResponse.ok) {
      return NextResponse.json({ error: "Unable to load billing customer." }, { status: 500 });
    }

    const customers = await customerResponse.json();
    let customerId = customers?.[0]?.stripe_customer_id as string | undefined;
    if (!customerId) {
      const customer = await stripe.customers.create({ metadata: { user_id: userId } });
      customerId = customer.id;
      const saved = await adminSupabaseFetch("billing_customers?on_conflict=user_id", {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates" },
        body: JSON.stringify({
          user_id: userId,
          stripe_customer_id: customerId,
          updated_at: new Date().toISOString(),
        }),
      });
      if (!saved.ok) {
        return NextResponse.json({ error: "Unable to save billing customer." }, { status: 500 });
      }
    }

    const idempotencyKey = request.headers.get("idempotency-key")?.trim();
    if (!idempotencyKey || !/^[A-Za-z0-9_-]{16,100}$/.test(idempotencyKey)) {
      return NextResponse.json({ error: "A valid idempotency key is required." }, { status: 400 });
    }

    const metadata = {
      kind: "token_purchase",
      user_id: userId,
      pack_id: pack.id,
    };
    const session = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        ui_mode: "embedded",
        customer: customerId,
        line_items: [{ price: pack.priceId, quantity: 1 }],
        return_url: new URL(
          "/buy-tokens?checkout=complete&session_id={CHECKOUT_SESSION_ID}",
          request.url,
        ).toString(),
        redirect_on_completion: "if_required",
        metadata,
        payment_intent_data: { metadata },
      },
      { idempotencyKey: `token:${userId}:${pack.id}:${idempotencyKey}` },
    );

    if (!session.client_secret) {
      return NextResponse.json({ error: "Checkout could not be initialized." }, { status: 500 });
    }
    return NextResponse.json({ clientSecret: session.client_secret, publishableKey });
  } catch (error) {
    if (error instanceof RequestAuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Unable to start token checkout." }, { status: 500 });
  }
}
