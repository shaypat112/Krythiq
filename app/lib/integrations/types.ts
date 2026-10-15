type IntegrationCategory =
  | "source"
  | "runtime"
  | "data"
  | "notifications"
  | "work"
  | "observability"
  | "cloud"
  | "identity";

type IntegrationAuth = "oauth" | "api_key" | "connection_string" | "local" | "webhook";
type IntegrationAvailability = "available" | "configuration_required" | "coming_soon";
type IntegrationConnectionStatus = "connected" | "expired" | "error" | "disconnected";

export type IntegrationProvider = {
  id: string;
  name: string;
  description: string;
  category: IntegrationCategory;
  auth: IntegrationAuth;
  availability: IntegrationAvailability;
  permissions: string[];
  documentationUrl?: string;
  pricingLabel: "Free" | "Free plan";
};

export type IntegrationConnection = {
  id: string;
  providerId: string;
  status: IntegrationConnectionStatus;
  accountLabel: string | null;
  permissions: string[];
  lastSyncAt: string | null;
  expiresAt: string | null;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
};
