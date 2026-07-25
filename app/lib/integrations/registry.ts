import type { IntegrationProvider } from "./types";

const provider = (
  definition: Omit<IntegrationProvider, "availability"> & { implemented?: boolean; requiredEnv?: string[] },
): IntegrationProvider => {
  const configured = definition.requiredEnv?.every((name) => Boolean(process.env[name])) ?? true;
  return {
    id: definition.id,
    name: definition.name,
    description: definition.description,
    category: definition.category,
    auth: definition.auth,
    permissions: definition.permissions,
    documentationUrl: definition.documentationUrl,
    availability: !definition.implemented
      ? "coming_soon"
      : configured ? "available" : "configuration_required",
  };
};

export const integrationProviders: IntegrationProvider[] = [
  provider({ id: "github", name: "GitHub", description: "Repositories, pull requests, and push-triggered scans.", category: "source", auth: "oauth", permissions: ["Read repository metadata", "Read source code"], implemented: true, requiredEnv: ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"] }),
  provider({ id: "local-cli", name: "Local CLI", description: "Scan local repositories without uploading an entire working tree.", category: "source", auth: "local", permissions: ["Read selected local project files"], implemented: true, documentationUrl: "/documentation/installation" }),
  provider({ id: "webhook", name: "Webhooks", description: "Deliver signed security events to your own HTTPS endpoint.", category: "notifications", auth: "webhook", permissions: ["Send selected Votrio events"], implemented: true, documentationUrl: "/settings?section=webhooks" }),
  provider({ id: "gitlab", name: "GitLab", description: "Projects, merge requests, and pipelines.", category: "source", auth: "oauth", permissions: ["Read repositories", "Read project metadata"] }),
  provider({ id: "bitbucket", name: "Bitbucket", description: "Cloud repositories and pull requests.", category: "source", auth: "oauth", permissions: ["Read repositories", "Read workspace metadata"] }),
  provider({ id: "azure-devops", name: "Azure DevOps", description: "Azure Repos and pipeline context.", category: "source", auth: "oauth", permissions: ["Read code", "Read project metadata"] }),
  provider({ id: "docker", name: "Docker images", description: "Inspect image manifests, layers, and packages.", category: "runtime", auth: "api_key", permissions: ["Pull selected image metadata"] }),
  provider({ id: "vercel", name: "Vercel", description: "Deployment status and environment context.", category: "runtime", auth: "oauth", permissions: ["Read projects", "Read deployments"] }),
  provider({ id: "railway", name: "Railway", description: "Deployment and service health context.", category: "runtime", auth: "api_key", permissions: ["Read projects", "Read deployments"] }),
  provider({ id: "netlify", name: "Netlify", description: "Site deployments and build failures.", category: "runtime", auth: "oauth", permissions: ["Read sites", "Read deploys"] }),
  provider({ id: "supabase", name: "Supabase", description: "Project configuration and database posture.", category: "data", auth: "api_key", permissions: ["Read project metadata"] }),
  provider({ id: "postgresql", name: "PostgreSQL", description: "Schema, index, and query-plan analysis.", category: "data", auth: "connection_string", permissions: ["Read schema metadata"] }),
  provider({ id: "slack", name: "Slack", description: "Security alerts and weekly reports.", category: "notifications", auth: "oauth", permissions: ["Post to selected channels"] }),
  provider({ id: "discord", name: "Discord", description: "Security alerts through a server webhook.", category: "notifications", auth: "webhook", permissions: ["Post to one configured channel"] }),
  provider({ id: "linear", name: "Linear", description: "Create and update remediation issues.", category: "work", auth: "oauth", permissions: ["Create issues", "Read teams"] }),
  provider({ id: "jira", name: "Jira", description: "Create remediation tickets and sync status.", category: "work", auth: "oauth", permissions: ["Create issues", "Read projects"] }),
  provider({ id: "sentry", name: "Sentry", description: "Correlate findings with production errors.", category: "observability", auth: "oauth", permissions: ["Read projects", "Read issues"] }),
  provider({ id: "cloudflare", name: "Cloudflare", description: "Edge, DNS, and worker security context.", category: "cloud", auth: "api_key", permissions: ["Read selected account resources"] }),
  provider({ id: "aws", name: "AWS", description: "Cloud configuration and deployment posture.", category: "cloud", auth: "api_key", permissions: ["Read explicitly scoped resources"] }),
  provider({ id: "google-cloud", name: "Google Cloud", description: "Project and deployment security context.", category: "cloud", auth: "oauth", permissions: ["Read selected project metadata"] }),
  provider({ id: "entra", name: "Microsoft Entra", description: "Enterprise identity and single sign-on.", category: "identity", auth: "oauth", permissions: ["Basic profile", "Organization identity"] }),
];

export function getIntegrationProvider(providerId: string) {
  return integrationProviders.find((item) => item.id === providerId) ?? null;
}
