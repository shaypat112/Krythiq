import { NextResponse } from "next/server";
import { notificationChannels, notificationEvents, isNotificationChannel, isNotificationEvent } from "@/app/lib/notifications/catalog";
import { extractSelectedTeamId, getSupabaseEnv, RequestAuthError, requireRequestAuth, supabaseFetch } from "@/app/lib/server/supabaseRest";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { accessToken, userId } = requireRequestAuth(request);
    const teamId = extractSelectedTeamId(request);
    const teamFilter = teamId ? `team_id=eq.${encodeURIComponent(teamId)}` : "team_id=is.null";
    const response = await supabaseFetch(
      getSupabaseEnv(),
      `notification_preferences?user_id=eq.${userId}&${teamFilter}&select=channel,event,enabled`,
      { accessToken },
    );
    if (!response.ok) {
      return NextResponse.json({ error: "Notification preference storage is unavailable. Apply the latest database migration." }, { status: 503 });
    }
    const preferences = await response.json();
    return NextResponse.json({ channels: notificationChannels, events: notificationEvents, preferences });
  } catch (error) {
    if (error instanceof RequestAuthError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Unable to load notification preferences." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { accessToken, userId } = requireRequestAuth(request);
    const teamId = extractSelectedTeamId(request);
    const body = await request.json();
    const preferences = Array.isArray(body?.preferences) ? body.preferences : [];
    if (preferences.length > notificationChannels.length * notificationEvents.length) {
      return NextResponse.json({ error: "Too many notification preferences." }, { status: 400 });
    }
    const normalized = preferences.flatMap((item: unknown) => {
      if (!item || typeof item !== "object") return [];
      const value = item as Record<string, unknown>;
      const channel = typeof value.channel === "string" ? value.channel : "";
      const event = typeof value.event === "string" ? value.event : "";
      if (!isNotificationChannel(channel) || !isNotificationEvent(event) || typeof value.enabled !== "boolean") return [];
      return [{ user_id: userId, team_id: teamId, channel, event, enabled: value.enabled, updated_at: new Date().toISOString() }];
    });
    if (normalized.length !== preferences.length) return NextResponse.json({ error: "Invalid notification preference." }, { status: 400 });

    const response = await supabaseFetch(getSupabaseEnv(), "notification_preferences?on_conflict=user_id,team_id,channel,event", {
      method: "POST",
      accessToken,
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify(normalized),
    });
    if (!response.ok) return NextResponse.json({ error: "Unable to save notification preferences." }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof RequestAuthError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Unable to save notification preferences." }, { status: 500 });
  }
}
