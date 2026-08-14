import { NextResponse } from "next/server";
import {
  RequestAuthError,
  getSupabaseEnv,
  requireRequestAuth,
  supabaseFetch,
} from "@/app/lib/server/supabaseRest";
import { getStripeConfig, stripe } from "@/app/lib/stripe";

export const runtime = "nodejs";

function formatPlanName(priceId: string | null) {
  const { pricePro, priceTeam, priceProYearly, priceTeamYearly } = getStripeConfig();
  if (!priceId) return "No active plan";
  if (priceId === priceTeam || priceId === priceTeamYearly) return "Plus";
  if (priceId === pricePro || priceId === priceProYearly) return "Pro";
  return "Custom";
}

export async function GET(request: Request) {
  try {
    const { accessToken, userId } = requireRequestAuth(request);
    const { secretKey } = getStripeConfig();

    if (!secretKey) {
      return NextResponse.json({
        configured: false,
        customer: null,
        subscription: null,
        invoices: [],
      });
    }

    const env = getSupabaseEnv();
    const customerRes = await supabaseFetch(
      env,
      `billing_customers?user_id=eq.${userId}&select=stripe_customer_id,stripe_subscription_id,status,price_id,current_period_end&limit=1`,
      { accessToken },
    );

    if (!customerRes.ok) {
      return NextResponse.json({ error: await customerRes.text() }, { status: 500 });
    }

    const customerRows = await customerRes.json();
    const customer = customerRows?.[0] as
      | {
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          status?: string | null;
          price_id?: string | null;
          current_period_end?: string | null;
        }
      | undefined;

    const customerId = customer?.stripe_customer_id ?? null;
    if (!customerId) {
      return NextResponse.json({
        configured: true,
        customer: null,
        subscription: null,
        invoices: [],
      });
    }

    const invoiceList = await stripe.invoices.list({
      customer: customerId,
      limit: 6,
    });

    const invoices = invoiceList.data
      .slice()
      .reverse()
      .map((invoice) => ({
        id: invoice.id,
        month: new Date(invoice.created * 1000).toLocaleString("en-US", {
          month: "short",
        }),
        amount: (invoice.amount_paid || invoice.amount_due || 0) / 100,
        status: invoice.status ?? "draft",
      }));

    return NextResponse.json({
      configured: true,
      customer: {
        stripeCustomerId: customerId,
      },
      subscription: {
        status: customer?.status ?? "inactive",
        priceId: customer?.price_id ?? null,
        planName: formatPlanName(customer?.price_id ?? null),
        currentPeriodEnd: customer?.current_period_end ?? null,
      },
      invoices,
    });
  } catch (error) {
    if (error instanceof RequestAuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load billing summary." },
      { status: 500 },
    );
  }
}
