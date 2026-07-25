import Stripe from "stripe";

const secretKey = process.env.STRIPE_SECRET_KEY?.trim() ?? "";

export const stripe = new Stripe(secretKey || "sk_test_placeholder", {
  apiVersion: "2026-02-25.clover",
});

export function getStripeConfig() {
  return {
    secretKey,
    publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim() ?? "",
    pricePro: process.env.STRIPE_PRICE_PRO?.trim() ?? "",
    priceTeam: process.env.STRIPE_PRICE_TEAM?.trim() ?? "",
  };
}
