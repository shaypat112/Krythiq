import { NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe, getStripeConfig } from "@/app/lib/stripe";
import {
  RequestAuthError,
  getSupabaseEnv,
  requireRequestAuth,
  supabaseFetch,
} from "@/app/lib/server/supabaseRest";

export const runtime = "nodejs";

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const planId = (body?.planId as string) || "pro";
    const billingCycle = (body?.billingCycle as string) || "monthly";
    const { accessToken, userId } = requireRequestAuth(request);

    const { secretKey, publishableKey, pricePro, priceTeam } = getStripeConfig();
    if (!secretKey || !publishableKey) {
      return NextResponse.json(
        { error: "Stripe is not configured." },
        { status: 500 },
      );
    }

    // Map plan IDs to Stripe price IDs
    const priceMap: Record<string, string> = {
      pro: pricePro,
      team: priceTeam,
    };

    const priceId = priceMap[planId];
    if (!priceId) {
      return NextResponse.json({ error: "Invalid plan ID or Stripe not configured" }, { status: 400 });
    }

    const env = getSupabaseEnv();

    const customerRes = await supabaseFetch(
      env,
      `billing_customers?user_id=eq.${userId}&select=stripe_customer_id`,
      { accessToken },
    );
    if (!customerRes.ok) {
      return NextResponse.json({ error: "Unable to load billing customer." }, { status: 500 });
    }

    const customerRows = await customerRes.json();
    let customerId = customerRows?.[0]?.stripe_customer_id as
      string | undefined;

    if (!customerId) {
      const customer = await stripe.customers.create({
        metadata: { user_id: userId },
      });
      customerId = customer.id;

      const customerInsert = await supabaseFetch(env, "billing_customers", {
        method: "POST",
        accessToken,
        headers: { Prefer: "resolution=merge-duplicates" },
        body: JSON.stringify({
          user_id: userId,
          stripe_customer_id: customerId,
          updated_at: new Date().toISOString(),
        }),
      });
      if (!customerInsert.ok) {
        return NextResponse.json({ error: "Unable to save billing customer." }, { status: 500 });
      }
    }

    const returnUrl = new URL("/billing?checkout=complete&session_id={CHECKOUT_SESSION_ID}", request.url).toString();
    const subscriptionData: Stripe.Checkout.SessionCreateParams = {
      mode: "subscription",
      ui_mode: "embedded",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      return_url: returnUrl,
      redirect_on_completion: "if_required",
      metadata: { user_id: userId, price_id: priceId, billing_cycle: billingCycle },
      subscription_data: { metadata: { user_id: userId, price_id: priceId } },
    };

    const session = await stripe.checkout.sessions.create(subscriptionData);

    if (!session.client_secret) {
      return NextResponse.json({ error: "Checkout session could not be initialized." }, { status: 500 });
    }
    return NextResponse.json({ clientSecret: session.client_secret, publishableKey });
  } catch (error) {
    if (error instanceof RequestAuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: getErrorMessage(error, "Checkout failed.") },
      { status: 500 },
    );
  }
}
