import { supabaseFetch, type SupabaseEnv } from "@/app/lib/server/supabaseRest";
import { adminSupabaseFetch, fetchAuthUser, fetchAuthUserById } from "@/app/lib/server/admin";
import { sendNotificationEmail, sendScanCompletedEmail } from "@/app/lib/server/email";
import { logServerError } from "@/app/lib/server/logger";
import { notificationEvents } from "@/app/lib/notifications/catalog";

export async function createNotification(options: {
  env: SupabaseEnv;
  accessToken: string;
  userId: string;
  type: string;
  data: Record<string, unknown>;
  teamId?: string | null;
  useServiceRole?: boolean;
}) {
  const { env, accessToken, userId, type, data, teamId = null, useServiceRole = false } = options;
  const dataFetch = (path: string, init: RequestInit = {}) => useServiceRole
    ? adminSupabaseFetch(path, init)
    : supabaseFetch(env, path, { ...init, accessToken });
  const teamFilter = teamId ? `team_id=eq.${encodeURIComponent(teamId)}` : "team_id=is.null";
  const defaults: readonly string[] =
    notificationEvents.find((event) => event.id === type)?.defaultChannels ?? ["in_app"];
  const preferenceResponses = await Promise.all(
    ["in_app", "email"].map((channel) => dataFetch(
      `notification_preferences?user_id=eq.${userId}&${teamFilter}&channel=eq.${channel}&event=eq.${encodeURIComponent(type)}&select=enabled&limit=1`,
    )),
  );
  const enabled = await Promise.all(preferenceResponses.map(async (response, index) => {
    const channel = index === 0 ? "in_app" : "email";
    if (!response.ok) return defaults.includes(channel);
    const preferences = await response.json() as Array<{ enabled: boolean }>;
    return preferences[0]?.enabled ?? defaults.includes(channel);
  }));

  if (enabled[0]) {
    await dataFetch("notifications", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        user_id: userId,
        type,
        data,
        created_at: new Date().toISOString(),
      }),
    });
  }

  if (enabled[1]) {
    try {
      const user = useServiceRole ? await fetchAuthUserById(userId) : await fetchAuthUser(accessToken);
      const repoName = typeof data.repo_name === "string" ? data.repo_name : "Repository";
      if (user.email) {
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://krythiq.dev";
        if (type === "scan.completed") {
          await sendScanCompletedEmail({ to: user.email, repoName, severity: typeof data.severity === "string" ? data.severity : "unknown", issues: Number(data.issues) || 0, score: Number(data.score) || 0, reportUrl: new URL(`/reports/${encodeURIComponent(repoName)}`, siteUrl).toString() });
        } else {
          const catalogEvent = notificationEvents.find((event) => event.id === type);
          const message = typeof data.message === "string" ? data.message : `${catalogEvent?.label ?? "Account update"} in your Krythiq workspace.`;
          const requestedHref = typeof data.href === "string" ? data.href : "";
          const safeHref = requestedHref.startsWith("/") && !requestedHref.startsWith("//") ? requestedHref : "/settings?section=notifications";
          await sendNotificationEmail({ to: user.email, title: catalogEvent?.label ?? "Krythiq account update", message, actionUrl: new URL(safeHref, siteUrl).toString() });
        }
      }
    } catch (error) {
      // Notification delivery must not turn a successful scan into a failed scan.
      logServerError("notification.email_failed", error, { userId, type });
    }
  }
}
