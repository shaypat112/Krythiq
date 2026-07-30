import { supabaseFetch, type SupabaseEnv } from "@/app/lib/server/supabaseRest";
import { fetchAuthUser } from "@/app/lib/server/admin";
import { sendScanCompletedEmail } from "@/app/lib/server/email";
import { logServerError } from "@/app/lib/server/logger";
import { notificationEvents } from "@/app/lib/notifications/catalog";

export async function createNotification(options: {
  env: SupabaseEnv;
  accessToken: string;
  userId: string;
  type: string;
  data: Record<string, unknown>;
  teamId?: string | null;
}) {
  const { env, accessToken, userId, type, data, teamId = null } = options;
  const teamFilter = teamId ? `team_id=eq.${encodeURIComponent(teamId)}` : "team_id=is.null";
  const defaults: readonly string[] =
    notificationEvents.find((event) => event.id === type)?.defaultChannels ?? ["in_app"];
  const preferenceResponses = await Promise.all(
    ["in_app", "email"].map((channel) => supabaseFetch(
      env,
      `notification_preferences?user_id=eq.${userId}&${teamFilter}&channel=eq.${channel}&event=eq.${encodeURIComponent(type)}&select=enabled&limit=1`,
      { accessToken },
    )),
  );
  const enabled = await Promise.all(preferenceResponses.map(async (response, index) => {
    const channel = index === 0 ? "in_app" : "email";
    if (!response.ok) return defaults.includes(channel);
    const preferences = await response.json() as Array<{ enabled: boolean }>;
    return preferences[0]?.enabled ?? defaults.includes(channel);
  }));

  if (enabled[0]) {
    await supabaseFetch(env, "notifications", {
      method: "POST",
      accessToken,
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        user_id: userId,
        type,
        data,
        created_at: new Date().toISOString(),
      }),
    });
  }

  if (enabled[1] && type === "scan.completed") {
    try {
      const user = await fetchAuthUser(accessToken);
      const repoName = typeof data.repo_name === "string" ? data.repo_name : "Repository";
      if (user.email) {
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://krythiq.dev";
        await sendScanCompletedEmail({
          to: user.email,
          repoName,
          severity: typeof data.severity === "string" ? data.severity : "unknown",
          issues: Number(data.issues) || 0,
          score: Number(data.score) || 0,
          reportUrl: new URL(`/reports/${encodeURIComponent(repoName)}`, siteUrl).toString(),
        });
      }
    } catch (error) {
      // Notification delivery must not turn a successful scan into a failed scan.
      logServerError("notification.scan_email_failed", error, { userId, type });
    }
  }
}
