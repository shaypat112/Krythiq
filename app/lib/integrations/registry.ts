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
  provider({ id: "github", name: "GitHub", description: "Connect repositories for scans, draft changes, branches, and pull requests.", category: "source", auth: "oauth", permissions: ["Read repository metadata and source", "Create reviewed branches and pull requests"], implemented: true, pricingLabel: "Free plan", documentationUrl: "https://docs.github.com/en/get-started/learning-about-github/githubs-plans", requiredEnv: ["NEXT_PUBLIC_SUPABASE_URL"], requiredAnyEnv: ["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY"] }),
  provider({ id: "local-cli", name: "Local CLI", description: "Scan a project from your own computer without connecting another service.", category: "source", auth: "local", permissions: ["Read files you select locally"], implemented: true, documentationUrl: "/documentation/installation" }),
  provider({ id: "webhook", name: "Generic webhooks", description: "Send signed Krythiq security events to any public HTTPS endpoint you control.", category: "notifications", auth: "webhook", permissions: ["Send only the events you select"], implemented: true, documentationUrl: "/settings?section=webhooks" }),
];

export function getIntegrationProvider(providerId: string) {
  return integrationProviders.find((item) => item.id === providerId) ?? null;
}
