export const notificationChannels = [
  { id: "in_app", label: "In-app", description: "Notification center inside Votrio", available: true },
  { id: "email", label: "Email", description: "Account email delivery", available: Boolean(process.env.RESEND_API_KEY) },
  { id: "webhook", label: "Webhook", description: "Signed HTTPS deliveries", available: true },
  { id: "slack", label: "Slack", description: "Selected Slack channel", available: false },
  { id: "discord", label: "Discord", description: "Selected Discord channel", available: false },
  { id: "browser_push", label: "Browser push", description: "Push notification in supported browsers", available: false },
] as const;

export const notificationEvents = [
  { id: "scan.completed", label: "Scan completed", defaultChannels: ["in_app"] },
  { id: "vulnerability.critical", label: "Critical vulnerability detected", defaultChannels: ["in_app", "email", "webhook"] },
  { id: "dependency.vulnerable", label: "New dependency vulnerability", defaultChannels: ["in_app", "email"] },
  { id: "repository.connection_failed", label: "Repository connection failed", defaultChannels: ["in_app"] },
  { id: "integration.error", label: "Integration error", defaultChannels: ["in_app", "email"] },
  { id: "scan.summary_ready", label: "AI scan summary ready", defaultChannels: ["in_app"] },
  { id: "report.weekly", label: "Weekly security report", defaultChannels: ["email"] },
  { id: "deployment.failed", label: "Failed deployment", defaultChannels: ["in_app"] },
] as const;

export type NotificationChannelId = (typeof notificationChannels)[number]["id"];
export type NotificationEventId = (typeof notificationEvents)[number]["id"];

export function isNotificationChannel(value: string): value is NotificationChannelId {
  return notificationChannels.some((channel) => channel.id === value);
}

export function isNotificationEvent(value: string): value is NotificationEventId {
  return notificationEvents.some((event) => event.id === value);
}
