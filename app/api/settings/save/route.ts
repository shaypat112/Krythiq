import { NextResponse } from "next/server";
import {
  RequestAuthError,
  getSupabaseEnv,
  requireRequestAuth,
  supabaseFetch,
} from "@/app/lib/server/supabaseRest";
import { validatePublicHttpsUrl } from "@/app/lib/server/outboundRequests";
import { apiPlanCatalog, normalizeApiLimits, planFromPriceId } from "@/app/lib/api-rate-limits";

export const runtime = "nodejs";

type SettingsPayload = Record<string, unknown> & {
  fullName?: string | null;
  username?: string | null;
  avatarUrl?: string | null;
  webhookEnabled?: boolean;
  webhookUrl?: string | null;
  webhookSecret?: string | null;
  webhookEvents?: string[];
  emailNotifications?: boolean;
  scanDepth?: number;
  ignoredPaths?: string;
  apiRequestsPerMinute?: number;
  expensiveRequestsPerMinute?: number;
};

type SettingsRow = {
  data?: Record<string, unknown>;
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const settings = body?.settings as SettingsPayload | undefined;
    const { accessToken, userId } = requireRequestAuth(request);

    if (!settings) {
      return NextResponse.json({ error: "Missing settings." }, { status: 400 });
    }

    const env = getSupabaseEnv();
    const billingRes = await supabaseFetch(
      env,
      `billing_customers?user_id=eq.${userId}&select=price_id,status&limit=1`,
      { accessToken },
    );
    const billingRows = billingRes.ok ? await billingRes.json() : [];
    const billing = billingRows?.[0] as { price_id?: string | null; status?: string | null } | undefined;
    const apiPlan = billing?.status === "active" || billing?.status === "trialing"
      ? planFromPriceId(billing?.price_id)
      : "free";
    const planMaximum = apiPlanCatalog[apiPlan].limits;
    if (
      Number(settings.apiRequestsPerMinute) > planMaximum.apiRequestsPerMinute ||
      Number(settings.expensiveRequestsPerMinute) > planMaximum.expensiveRequestsPerMinute
    ) {
      return NextResponse.json({ error: `Requested limits exceed the ${apiPlanCatalog[apiPlan].name} plan.` }, { status: 400 });
    }
    const apiLimits = normalizeApiLimits(settings, apiPlan);

    const profilePayload = {
      id: userId,
      updated_at: new Date().toISOString(),
      full_name: settings.fullName ?? null,
      username: settings.username ?? null,
      avatar_url: settings.avatarUrl ?? null,
    };

    const profileUpsertRes = await supabaseFetch(env, "profiles", {
      method: "POST",
      accessToken,
      headers: {
        Prefer: "resolution=merge-duplicates",
      },
      body: JSON.stringify(profilePayload),
    });

    if (!profileUpsertRes.ok) {
      const text = await profileUpsertRes.text();
      return NextResponse.json({ error: text }, { status: 500 });
    }

    const {
      fullName,
      username,
      avatarUrl,
      webhookEnabled,
      webhookUrl,
      webhookEvents,
      webhookSecret,
      ...rest
    } = settings ?? {};

    void fullName;
    void username;
    void avatarUrl;

    const validatedWebhookUrl = webhookEnabled
      ? await validatePublicHttpsUrl(webhookUrl)
      : null;

    const allowedEvents = new Set(["scan.completed", "scan.failed"]);
    const events = Array.isArray(webhookEvents)
      ? webhookEvents.filter((event): event is string => allowedEvents.has(event))
      : [];

    const normalized = {
      ...rest,
      retentionDays: 30,
      ...apiLimits,
    };

    const settingsPayload = {
      user_id: userId,
      data: normalized ?? {},
      updated_at: new Date().toISOString(),
    };

    const settingsRes = await supabaseFetch(env, "user_settings", {
      method: "POST",
      accessToken,
      headers: {
        Prefer: "resolution=merge-duplicates,return=representation",
      },
      body: JSON.stringify(settingsPayload),
    });

    let savedData: SettingsRow | Record<string, unknown> | null = null;

    if (!settingsRes.ok) {
      const text = await settingsRes.text();
      const legacyRes = await supabaseFetch(env, "user_settings", {
        method: "POST",
        accessToken,
        headers: {
          Prefer: "resolution=merge-duplicates,return=representation",
        },
        body: JSON.stringify({
          user_id: userId,
          email_alerts: settings.emailNotifications ?? true,
          scan_depth: settings.scanDepth ?? 3,
          ignored_paths: settings.ignoredPaths ?? "",
          updated_at: new Date().toISOString(),
        }),
      });

      if (!legacyRes.ok) {
        return NextResponse.json({ error: text }, { status: 500 });
      }
      const legacyRows = await legacyRes.json();
      savedData = legacyRows?.[0] ?? null;
    } else {
      const savedRows = await settingsRes.json();
      savedData = savedRows?.[0] ?? null;
    }

    const webhookPayload = {
      user_id: userId,
      url: validatedWebhookUrl ?? "https://invalid.local/disabled",
      enabled: Boolean(webhookEnabled) && Boolean(validatedWebhookUrl),
      events: events.length > 0 ? events : ["scan.completed"],
      secret: webhookSecret?.trim() || null,
      updated_at: new Date().toISOString(),
    };

    const webhookRes = await supabaseFetch(env, "webhook_endpoints?on_conflict=user_id", {
      method: "POST",
      accessToken,
      headers: {
        Prefer: "resolution=merge-duplicates,return=representation",
      },
      body: JSON.stringify(webhookPayload),
    });

    if (!webhookRes.ok) {
      const text = await webhookRes.text();
      return NextResponse.json({ error: text }, { status: 500 });
    }

    return NextResponse.json({ settings: savedData?.data ?? normalized });
  } catch (error) {
    if (error instanceof RequestAuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof Error && error.message.includes("Webhook URL")) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
  }
}
