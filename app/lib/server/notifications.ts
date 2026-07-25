import { supabaseFetch, type SupabaseEnv } from "@/app/lib/server/supabaseRest";

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
  const preferenceResponse = await supabaseFetch(
    env,
    `notification_preferences?user_id=eq.${userId}&${teamFilter}&channel=eq.in_app&event=eq.${encodeURIComponent(type)}&select=enabled&limit=1`,
    { accessToken },
  );
  if (preferenceResponse.ok) {
    const preferences = await preferenceResponse.json() as Array<{ enabled: boolean }>;
    if (preferences[0]?.enabled === false) return;
  }
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
