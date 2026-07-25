import { NextResponse } from "next/server";
import { extractSelectedTeamId, getSupabaseEnv, RequestAuthError, requireRequestAuth, supabaseFetch } from "@/app/lib/server/supabaseRest";
import { getIntegrationProvider, integrationProviders } from "@/app/lib/integrations/registry";
import { encryptIntegrationCredential } from "@/app/lib/server/integrationCredentials";

export const runtime = "nodejs";

function serializeConnection(row: Record<string, unknown>) {
  const expiresAt = typeof row.expires_at === "string" ? row.expires_at : null;
  const expired = expiresAt ? new Date(expiresAt).getTime() <= Date.now() : false;
  return {
    id: row.id,
    providerId: row.provider_id,
    status: expired && row.status === "connected" ? "expired" : row.status,
    accountLabel: row.account_label,
    permissions: Array.isArray(row.permissions) ? row.permissions : [],
    lastSyncAt: row.last_sync_at,
    expiresAt,
    lastError: row.last_error,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function GET(request: Request) {
  try {
    const { accessToken, userId } = requireRequestAuth(request);
    const teamId = extractSelectedTeamId(request);
    const teamFilter = teamId ? `team_id=eq.${encodeURIComponent(teamId)}` : "team_id=is.null";
    const response = await supabaseFetch(
      getSupabaseEnv(),
      `integration_connections?user_id=eq.${userId}&${teamFilter}&select=id,provider_id,status,account_label,permissions,last_sync_at,expires_at,last_error,created_at,updated_at&order=provider_id.asc`,
      { accessToken },
    );
    if (!response.ok) {
      return NextResponse.json({ error: "Integration storage is unavailable. Apply the latest database migration." }, { status: 503 });
    }
    const connections = (await response.json()).map(serializeConnection);
    return NextResponse.json({ providers: integrationProviders, connections });
  } catch (error) {
    if (error instanceof RequestAuthError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Unable to load integrations." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { accessToken, userId } = requireRequestAuth(request);
    const teamId = extractSelectedTeamId(request);
    const body = await request.json();
    const providerId = typeof body?.providerId === "string" ? body.providerId : "";
    const credential = typeof body?.credential === "string" ? body.credential.trim() : "";
    const accountLabel = typeof body?.accountLabel === "string" ? body.accountLabel.trim().slice(0, 200) : null;
    const provider = getIntegrationProvider(providerId);

    if (!provider) return NextResponse.json({ error: "Unknown integration provider." }, { status: 400 });
    if (provider.availability !== "available") return NextResponse.json({ error: "This integration is not available in the current deployment." }, { status: 409 });
    if (!["api_key", "connection_string"].includes(provider.auth)) {
      return NextResponse.json({ error: "This provider must use its dedicated connection flow." }, { status: 400 });
    }
    if (credential.length < 8 || credential.length > 8192) {
      return NextResponse.json({ error: "Credential must be between 8 and 8192 characters." }, { status: 400 });
    }

    const payload = {
      user_id: userId,
      team_id: teamId,
      provider_id: provider.id,
      status: "connected",
      account_label: accountLabel || null,
      permissions: provider.permissions,
      credential_encrypted: encryptIntegrationCredential(credential),
      credential_hint: credential.slice(-4),
      last_error: null,
      updated_at: new Date().toISOString(),
    };
    const response = await supabaseFetch(getSupabaseEnv(), "integration_connections?on_conflict=user_id,team_id,provider_id", {
      method: "POST",
      accessToken,
      headers: { Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) return NextResponse.json({ error: "Unable to save integration connection." }, { status: 500 });
    const [connection] = await response.json();
    return NextResponse.json({ connection: serializeConnection(connection) }, { status: 201 });
  } catch (error) {
    if (error instanceof RequestAuthError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const message = error instanceof Error ? error.message : "Unable to connect integration.";
    return NextResponse.json({ error: message }, { status: message.includes("not configured") ? 503 : 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { accessToken, userId } = requireRequestAuth(request);
    const teamId = extractSelectedTeamId(request);
    const providerId = new URL(request.url).searchParams.get("providerId") ?? "";
    if (!getIntegrationProvider(providerId)) return NextResponse.json({ error: "Unknown integration provider." }, { status: 400 });
    const teamFilter = teamId ? `team_id=eq.${encodeURIComponent(teamId)}` : "team_id=is.null";
    const response = await supabaseFetch(
      getSupabaseEnv(),
      `integration_connections?user_id=eq.${userId}&${teamFilter}&provider_id=eq.${encodeURIComponent(providerId)}`,
      { method: "DELETE", accessToken, headers: { Prefer: "return=minimal" } },
    );
    if (!response.ok) return NextResponse.json({ error: "Unable to disconnect integration." }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof RequestAuthError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Unable to disconnect integration." }, { status: 500 });
  }
}
