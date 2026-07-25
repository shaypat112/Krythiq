import { NextResponse } from "next/server";

import {
  RequestAuthError,
  requireRequestAuth,
} from "@/app/lib/server/supabaseRest";
import { getServiceRoleHeaders } from "@/app/lib/server/admin";

export const runtime = "nodejs";

async function adminFetch(path: string, init: RequestInit = {}) {
  const { env, headers } = getServiceRoleHeaders();
  return fetch(`${env.url}${path}`, {
    ...init,
    headers: {
      ...headers,
      ...(init.headers ?? {}),
    },
  });
}

export async function POST(request: Request) {
  try {
    const { userId } = requireRequestAuth(request);

    const cleanupPaths = [
      `/rest/v1/notifications?user_id=eq.${userId}`,
      `/rest/v1/scan_history?user_id=eq.${userId}`,
      `/rest/v1/connected_repos?user_id=eq.${userId}`,
      `/rest/v1/team_members?user_id=eq.${userId}`,
      `/rest/v1/teams?owner_id=eq.${userId}`,
      `/rest/v1/webhook_endpoints?user_id=eq.${userId}`,
      `/rest/v1/user_settings?user_id=eq.${userId}`,
      `/rest/v1/billing_customers?user_id=eq.${userId}`,
      `/rest/v1/profiles?id=eq.${userId}`,
    ];

    for (const path of cleanupPaths) {
      const res = await adminFetch(path, { method: "DELETE" });
      if (!res.ok && res.status !== 404) {
        return NextResponse.json(
          { error: `Failed to delete account data for path ${path}.` },
          { status: 500 },
        );
      }
    }

    const deleteUserRes = await adminFetch(`/auth/v1/admin/users/${userId}`, {
      method: "DELETE",
    });

    if (!deleteUserRes.ok) {
      const text = await deleteUserRes.text();
      return NextResponse.json(
        { error: `Failed to delete auth user: ${text}` },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof RequestAuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected server error." },
      { status: 500 },
    );
  }
}
