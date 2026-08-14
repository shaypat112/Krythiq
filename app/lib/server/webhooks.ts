import { getSupabaseEnv, supabaseFetch, type SupabaseEnv } from "./supabaseRest";
import { createHmac } from "node:crypto";
import { fetchWithTimeout, validatePublicHttpsUrl } from "./outboundRequests";
import { notificationEvents } from "@/app/lib/notifications/catalog";

const RETRY_MINUTES = 5;

export const workspaceWebhookEvents = [
  "workspace.created",
  "workspace.conflict",
  "workspace.zip_exported",
  "workspace.branch_published",
  "workspace.pull_request_created",
  "workspace.main_pushed",
] as const;

type WorkspaceWebhookEvent = (typeof workspaceWebhookEvents)[number];

type RetryDelivery = {
  id: string;
  payload: Record<string, unknown>;
  attempt_count: number;
  webhook_endpoints: { url: string; enabled: boolean; secret?: string | null } | null;
};

function messageFromError(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function getRetryAt() {
  const date = new Date();
  date.setMinutes(date.getMinutes() + RETRY_MINUTES);
  return date.toISOString();
}

export async function deliverWorkspaceWebhook(accessToken: string, options: {
  userId: string;
  teamId?: string | null;
  event: WorkspaceWebhookEvent;
  workspace: { id: string; repository: string; base_branch: string; base_commit_sha: string };
  details?: Record<string, string | number | boolean | null>;
}) {
  return deliverWebhooks(getSupabaseEnv(), accessToken, {
    userId: options.userId,
    teamId: options.teamId,
    event: options.event,
    payload: {
      workspace_id: options.workspace.id,
      repository: options.workspace.repository,
      base_branch: options.workspace.base_branch,
      base_commit_sha: options.workspace.base_commit_sha,
      ...(options.details ?? {}),
    },
  });
}

export async function deliverWebhooks(
  env: SupabaseEnv,
  accessToken: string | undefined,
  options: {
    userId: string;
    event: string;
    payload: Record<string, unknown>;
    teamId?: string | null;
  },
) {
  if (!accessToken) return;

  const teamFilter = options.teamId ? `team_id=eq.${encodeURIComponent(options.teamId)}` : "team_id=is.null";
  const preferenceRes = await supabaseFetch(env, `notification_preferences?user_id=eq.${options.userId}&${teamFilter}&channel=eq.webhook&event=eq.${encodeURIComponent(options.event)}&select=enabled&limit=1`, { accessToken });
  const storedPreference = preferenceRes.ok ? (await preferenceRes.json() as Array<{ enabled: boolean }>)[0]?.enabled : undefined;
  const webhookDefault = (notificationEvents.find((event) => event.id === options.event)?.defaultChannels as readonly string[] | undefined)?.includes("webhook") ?? true;
  if (!(storedPreference ?? webhookDefault)) return;

  const endpointsRes = await supabaseFetch(
    env,
    `webhook_endpoints?user_id=eq.${options.userId}&enabled=eq.true&select=id,url,events,secret`,
    { accessToken },
  );

  if (!endpointsRes.ok) return;
  const endpoints = (await endpointsRes.json()) as Array<{
    id: string;
    url: string;
    events: string[];
    secret?: string | null;
  }>;

  const targets = endpoints.filter((endpoint) =>
    Array.isArray(endpoint.events) ? endpoint.events.includes(options.event) : true,
  );

  for (const endpoint of targets) {
    const deliveryPayload = {
      event: options.event,
      user_id: options.userId,
      payload: options.payload,
      created_at: new Date().toISOString(),
    };

    const deliveryRes = await supabaseFetch(env, "webhook_deliveries", {
      method: "POST",
      accessToken,
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        webhook_id: endpoint.id,
        event: options.event,
        payload: deliveryPayload,
        status: "pending",
        attempt_count: 0,
        created_at: new Date().toISOString(),
      }),
    });

    const deliveryRows = deliveryRes.ok ? await deliveryRes.json() : null;
    const deliveryId = deliveryRows?.[0]?.id as string | undefined;

    try {
      const serializedPayload = JSON.stringify({ ...deliveryPayload, delivery_id: deliveryId });
      const targetUrl = await validatePublicHttpsUrl(endpoint.url);
      const res = await fetchWithTimeout(targetUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "krythiq-webhooks",
          ...(endpoint.secret ? { "x-krythiq-signature": createHmac("sha256", endpoint.secret).update(serializedPayload).digest("hex") } : {}),
        },
        body: serializedPayload,
      });

      if (!res.ok) {
        const errorText = await res.text();
        if (deliveryId) {
          await supabaseFetch(env, `webhook_deliveries?id=eq.${deliveryId}`, {
            method: "PATCH",
            accessToken,
            headers: { Prefer: "return=minimal" },
            body: JSON.stringify({
              status: "failed",
              attempt_count: 1,
              last_error: errorText,
              next_retry_at: getRetryAt(),
              updated_at: new Date().toISOString(),
            }),
          });
        }
      } else if (deliveryId) {
        await supabaseFetch(env, `webhook_deliveries?id=eq.${deliveryId}`, {
          method: "PATCH",
          accessToken,
          headers: { Prefer: "return=minimal" },
          body: JSON.stringify({
            status: "delivered",
            attempt_count: 1,
            updated_at: new Date().toISOString(),
          }),
        });
      }
    } catch (error) {
      if (deliveryId) {
        await supabaseFetch(env, `webhook_deliveries?id=eq.${deliveryId}`, {
          method: "PATCH",
          accessToken,
          headers: { Prefer: "return=minimal" },
          body: JSON.stringify({
            status: "failed",
            attempt_count: 1,
            last_error: messageFromError(error, "Webhook delivery failed"),
            next_retry_at: getRetryAt(),
            updated_at: new Date().toISOString(),
          }),
        });
      }
    }
  }
}

export async function retryDeliveries(
  env: SupabaseEnv,
  accessToken: string | undefined,
  userId: string,
) {
  if (!accessToken) return { retried: 0 };

  const now = new Date().toISOString();
  const deliveriesRes = await supabaseFetch(
    env,
    `webhook_deliveries?status=eq.failed&attempt_count=lt.10&next_retry_at=lte.${now}&webhook_endpoints!inner.user_id=eq.${userId}&select=id,payload,attempt_count,webhook_endpoints!inner(url,enabled,secret)&order=next_retry_at.asc&limit=10`,
    { accessToken },
  );

  if (!deliveriesRes.ok) return { retried: 0 };
  const deliveries = (await deliveriesRes.json()) as RetryDelivery[];

  let retried = 0;
  for (const delivery of deliveries) {
    const endpoint = delivery.webhook_endpoints;
    if (!endpoint?.enabled) continue;

    try {
      const serializedPayload = JSON.stringify({ ...delivery.payload, retry: true });
      const targetUrl = await validatePublicHttpsUrl(endpoint.url);
      const res = await fetchWithTimeout(targetUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "krythiq-webhooks",
          ...(endpoint.secret ? { "x-krythiq-signature": createHmac("sha256", endpoint.secret).update(serializedPayload).digest("hex") } : {}),
        },
        body: serializedPayload,
      });

      if (res.ok) {
        await supabaseFetch(env, `webhook_deliveries?id=eq.${delivery.id}`, {
          method: "PATCH",
          accessToken,
          headers: { Prefer: "return=minimal" },
          body: JSON.stringify({
            status: "delivered",
            attempt_count: delivery.attempt_count + 1,
            updated_at: new Date().toISOString(),
          }),
        });
        retried += 1;
      } else {
        await supabaseFetch(env, `webhook_deliveries?id=eq.${delivery.id}`, {
          method: "PATCH",
          accessToken,
          headers: { Prefer: "return=minimal" },
          body: JSON.stringify({
            status: "failed",
            attempt_count: delivery.attempt_count + 1,
            last_error: await res.text(),
            next_retry_at: getRetryAt(),
            updated_at: new Date().toISOString(),
          }),
        });
      }
    } catch (error) {
      await supabaseFetch(env, `webhook_deliveries?id=eq.${delivery.id}`, {
        method: "PATCH",
        accessToken,
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({
          status: "failed",
          attempt_count: delivery.attempt_count + 1,
          last_error: messageFromError(error, "Webhook retry failed"),
          next_retry_at: getRetryAt(),
          updated_at: new Date().toISOString(),
        }),
      });
    }
  }

  return { retried };
}
