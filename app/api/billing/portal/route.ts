import { NextResponse } from "next/server";
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
    const { accessToken, userId } = requireRequestAuth(request);

    const { secretKey } = getStripeConfig();
    if (!secretKey) {
      return NextResponse.json({ error: "Stripe is not configured." }, { status: 500 });
    }

    const env = getSupabaseEnv();
    const customerRes = await supabaseFetch(
      env,
      `billing_customers?user_id=eq.${userId}&select=stripe_customer_id`,
      { accessToken },
    );
    const customerRows = customerRes.ok ? await customerRes.json() : [];
    const customerId = customerRows?.[0]?.stripe_customer_id as string | undefined;

    if (!customerId) {
      return NextResponse.json({ error: "No Stripe customer found." }, { status: 404 });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: new URL("/billing", request.url).toString(),
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    if (error instanceof RequestAuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: getErrorMessage(error, "Portal failed.") },
      { status: 500 },
    );
  }
}
