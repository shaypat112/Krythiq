import type { IntegrationProvider } from "./types";

const provider = (
  definition: Omit<IntegrationProvider, "availability" | "pricingLabel"> & {
    implemented?: boolean;
    requiredEnv?: string[];
    requiredAnyEnv?: string[];
    pricingLabel?: IntegrationProvider["pricingLabel"];
  },
): IntegrationProvider => {
  const configured =
    (definition.requiredEnv?.every((name) => Boolean(process.env[name])) ?? true) &&
    (definition.requiredAnyEnv?.some((name) => Boolean(process.env[name])) ?? true);
  return {
    id: definition.id,
    name: definition.name,
    description: definition.description,
    category: definition.category,
    auth: definition.auth,
    permissions: definition.permissions,
    documentationUrl: definition.documentationUrl,
    pricingLabel: definition.pricingLabel ?? "Free",
    availability: !definition.implemented
      ? "coming_soon"
      : configured ? "available" : "configuration_required",
  };
};

export const integrationProviders: IntegrationProvider[] = [
  provider({ id: "github", name: "GitHub", description: "Connect repositories for scans, history, and future draft pull requests.", category: "source", auth: "oauth", permissions: ["Read repository metadata", "Read source code"], implemented: true, pricingLabel: "Free plan", documentationUrl: "https://docs.github.com/en/get-started/learning-about-github/githubs-plans", requiredEnv: ["NEXT_PUBLIC_SUPABASE_URL"], requiredAnyEnv: ["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY"] }),
  provider({ id: "local-cli", name: "Local CLI", description: "Scan a project from your own computer without connecting another service.", category: "source", auth: "local", permissions: ["Read files you select locally"], implemented: true, documentationUrl: "/documentation/installation" }),
  provider({ id: "webhook", name: "Generic webhooks", description: "Send signed Krythiq security events to any public HTTPS endpoint you control.", category: "notifications", auth: "webhook", permissions: ["Send only the events you select"], implemented: true, documentationUrl: "/settings?section=webhooks" }),
  provider({ id: "slack", name: "Slack", description: "Post scan alerts and fix updates to a selected Slack channel using an incoming webhook.", category: "notifications", auth: "oauth", permissions: ["Post to one selected channel"], pricingLabel: "Free plan", documentationUrl: "https://api.slack.com/messaging/webhooks" }),
  provider({ id: "discord", name: "Discord", description: "Post security alerts to a Discord channel using a lightweight incoming webhook.", category: "notifications", auth: "webhook", permissions: ["Post to one configured channel"], documentationUrl: "https://docs.discord.com/developers/platform/webhooks" }),
  provider({ id: "telegram", name: "Telegram", description: "Send scan alerts and status updates through a Telegram bot.", category: "notifications", auth: "api_key", permissions: ["Send messages to one configured chat"], documentationUrl: "https://core.telegram.org/bots" }),
];

export function getIntegrationProvider(providerId: string) {
  return integrationProviders.find((item) => item.id === providerId) ?? null;
}
