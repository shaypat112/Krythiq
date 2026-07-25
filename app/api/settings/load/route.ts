import { NextResponse } from "next/server";
import { getAdminIdentityConfig, isAdminAccess } from "@/app/lib/server/admin";
import {
  RequestAuthError,
  getSupabaseEnv,
  requireRequestAuth,
  supabaseFetch,
} from "@/app/lib/server/supabaseRest";
import { purgeUserData } from "@/app/lib/server/retention";
import { normalizeApiLimits, planFromPriceId } from "@/app/lib/api-rate-limits";

export const runtime = "nodejs";

type SettingsRow = {
  data?: Record<string, unknown>;
};

type WebhookRow = {
  url?: string | null;
  enabled?: boolean | null;
  events?: string[] | null;
  secret?: string | null;
};

const DEFAULT_SETTINGS = {
  webhookEnabled: false,
  webhookUrl: "",
  webhookEvents: ["scan.completed"],
  retentionDays: 30,
};

export async function POST(request: Request) {
  try {
    const { accessToken, userId } = requireRequestAuth(request);

    const env = getSupabaseEnv();

    const [profileRes, settingsRes, webhookRes, billingRes] = await Promise.all([
      supabaseFetch(env, `profiles?id=eq.${userId}&select=full_name,username,avatar_url`, {
        accessToken,
      }),
      supabaseFetch(env, `user_settings?user_id=eq.${userId}&select=data`, {
        accessToken,
      }),
      supabaseFetch(env, `webhook_endpoints?user_id=eq.${userId}&select=url,enabled,events,secret`, {
        accessToken,
      }),
      supabaseFetch(env, `billing_customers?user_id=eq.${userId}&select=price_id,status&limit=1`, {
        accessToken,
      }),
    ]);

    if (!profileRes.ok) {
      const details = {
        profile: await profileRes.text(),
      };
      return NextResponse.json({ error: "Database request failed", details }, { status: 500 });
    }

    const profileRows = await profileRes.json();
    let settingsRows: SettingsRow[] = [];
    let webhookRows: WebhookRow[] = [];

    if (settingsRes.ok) {
      settingsRows = await settingsRes.json();
    } else {
      const legacyRes = await supabaseFetch(
        env,
        `user_settings?user_id=eq.${userId}&select=email_alerts,scan_depth,ignored_paths`,
        { accessToken },
      );
      if (legacyRes.ok) {
        const legacyRows = await legacyRes.json();
        settingsRows = [
          {
            data: {
              emailNotifications: legacyRows?.[0]?.email_alerts ?? true,
              ignoredPaths: legacyRows?.[0]?.ignored_paths ?? "",
              scanDepth: legacyRows?.[0]?.scan_depth ?? 3,
            },
          },
        ];
      } else {
        const details = { settings: await settingsRes.text() };
        return NextResponse.json({ error: "Database request failed", details }, { status: 500 });
      }
    }

    if (webhookRes.ok) {
      webhookRows = await webhookRes.json();
    }

    const profile = profileRows?.[0] ?? {};
    const storedSettings = settingsRows?.[0]?.data ?? {};
    const webhook = webhookRows?.[0] ?? {};
    const billingRows = billingRes.ok ? await billingRes.json() : [];
    const billing = billingRows?.[0] as { price_id?: string | null; status?: string | null } | undefined;
    const apiPlan = billing?.status === "active" || billing?.status === "trialing"
      ? planFromPriceId(billing?.price_id)
      : "free";
    const apiLimits = normalizeApiLimits(storedSettings, apiPlan);

    const settings = {
      ...DEFAULT_SETTINGS,
      ...storedSettings,
      fullName: profile.full_name ?? "",
      username: profile.username ?? "",
      avatarUrl: profile.avatar_url ?? "",
      webhookEnabled: webhook.enabled ?? storedSettings.webhookEnabled ?? DEFAULT_SETTINGS.webhookEnabled,
      webhookUrl: webhook.url ?? storedSettings.webhookUrl ?? DEFAULT_SETTINGS.webhookUrl,
      webhookSecret: webhook.secret ?? "",
      webhookEvents: webhook.events ?? storedSettings.webhookEvents ?? DEFAULT_SETTINGS.webhookEvents,
      retentionDays: 30,
      ...apiLimits,
    };

    await purgeUserData({ env, accessToken, userId, days: 30 });

    const adminConfig = getAdminIdentityConfig();
    const isAdmin = await isAdminAccess(accessToken, userId).catch(() => false);

    return NextResponse.json({
      settings,
      apiPlan,
      admin: {
        isAdmin,
        profileUsername: adminConfig.profileUsername,
        githubLogin: adminConfig.githubLogin,
      },
    });
  } catch (error) {
    if (error instanceof RequestAuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
  }
}
