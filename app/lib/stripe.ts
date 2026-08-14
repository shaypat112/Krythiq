import Stripe from "stripe";

const configuredSecretKey = process.env.STRIPE_SECRET_KEY?.trim() ?? "";
const configuredPublishableKey =
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim() ?? "";
const secretKey = configuredSecretKey.startsWith("sk_test_")
  ? configuredSecretKey
  : "";
const publishableKey = configuredPublishableKey.startsWith("pk_test_")
  ? configuredPublishableKey
  : "";

export const stripe = new Stripe(secretKey || "stripe_not_configured", {
  apiVersion: "2026-02-25.clover",
});

export function getStripeConfig() {
  return {
    secretKey,
    publishableKey,
    pricePro: process.env.STRIPE_PRICE_PRO?.trim() ?? "",
    priceTeam: process.env.STRIPE_PRICE_TEAM?.trim() ?? "",
    priceProYearly: process.env.STRIPE_PRICE_PRO_YEARLY?.trim() ?? "",
    priceTeamYearly: process.env.STRIPE_PRICE_TEAM_YEARLY?.trim() ?? "",
    testMode: Boolean(secretKey && publishableKey),
  };
}
