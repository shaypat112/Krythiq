import { NextResponse } from "next/server";
import { adminSupabaseFetch } from "@/app/lib/server/admin";
import { createNotification } from "@/app/lib/server/notifications";
import { getSupabaseEnv, RequestAuthError, requireVerifiedRequestAuth } from "@/app/lib/server/supabaseRest";

export const runtime = "nodejs";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type Connection = { id: string; requester_id: string; addressee_id: string; status: string; created_at: string };

async function profilesFor(ids: string[]) {
  if (!ids.length) return new Map<string, Record<string, unknown>>();
  const response = await adminSupabaseFetch(`profiles?id=in.(${ids.join(",")})&select=id,username,full_name,avatar_url`);
  const rows = response.ok ? await response.json() as Array<Record<string, unknown> & { id: string }> : [];
  return new Map(rows.map((profile) => [profile.id, profile]));
}

export async function GET(request: Request) {
  try {
    const { userId } = await requireVerifiedRequestAuth(request);
    const [requestsResponse, acceptedResponse] = await Promise.all([
      adminSupabaseFetch(`social_connections?addressee_id=eq.${userId}&status=eq.pending&select=id,requester_id,addressee_id,status,created_at&order=created_at.desc&limit=50`),
      adminSupabaseFetch(`social_connections?or=(requester_id.eq.${userId},addressee_id.eq.${userId})&status=eq.accepted&select=id,requester_id,addressee_id,status,created_at&order=updated_at.desc&limit=100`),
    ]);
    if (!requestsResponse.ok || !acceptedResponse.ok) return NextResponse.json({ error: "Social connections are unavailable. Apply the latest migration." }, { status: 503 });
    const requests = await requestsResponse.json() as Connection[];
    const accepted = await acceptedResponse.json() as Connection[];
    const peerId = (item: Connection) => item.requester_id === userId ? item.addressee_id : item.requester_id;
    const profiles = await profilesFor([...requests.map((item) => item.requester_id), ...accepted.map(peerId)]);
    const connectionIds = accepted.map((item) => item.id);
    const unreadResponse = connectionIds.length ? await adminSupabaseFetch(`social_messages?connection_id=in.(${connectionIds.join(",")})&sender_id=neq.${userId}&read_at=is.null&select=connection_id`) : null;
    const unreadRows = unreadResponse?.ok ? await unreadResponse.json() as Array<{ connection_id: string }> : [];
    const unread = unreadRows.reduce<Record<string, number>>((counts, message) => ({ ...counts, [message.connection_id]: (counts[message.connection_id] ?? 0) + 1 }), {});
    return NextResponse.json({
      requests: requests.map((item) => ({ ...item, profile: profiles.get(item.requester_id) ?? null })),
      friends: accepted.map((item) => ({ ...item, userId: peerId(item), profile: profiles.get(peerId(item)) ?? null, unreadCount: unread[item.id] ?? 0 })),
    });
  } catch (error) {
    if (error instanceof RequestAuthError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Unable to load follow requests." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { userId } = await requireVerifiedRequestAuth(request);
    const body = await request.json();
    const targetUserId = typeof body?.targetUserId === "string" && UUID.test(body.targetUserId) ? body.targetUserId : "";
    if (!targetUserId || targetUserId === userId) return NextResponse.json({ error: "Choose another user." }, { status: 400 });

    const [targetResponse, requesterResponse, existingResponse] = await Promise.all([
      adminSupabaseFetch(`profiles?id=eq.${targetUserId}&select=id,full_name,username&limit=1`),
      adminSupabaseFetch(`profiles?id=eq.${userId}&select=id,full_name,username&limit=1`),
      adminSupabaseFetch(`social_connections?requester_id=in.(${userId},${targetUserId})&addressee_id=in.(${userId},${targetUserId})&select=id,requester_id,addressee_id,status&limit=1`),
    ]);
    const target = targetResponse.ok ? (await targetResponse.json())?.[0] : null;
    const requester = requesterResponse.ok ? (await requesterResponse.json())?.[0] : null;
    if (!target?.id) return NextResponse.json({ error: "User not found." }, { status: 404 });
    const existing = existingResponse.ok ? (await existingResponse.json() as Connection[])?.[0] : null;
    if (existing?.status === "accepted") return NextResponse.json({ error: "You already follow each other." }, { status: 409 });
    if (existing?.status === "pending") return NextResponse.json({ error: existing.requester_id === userId ? "Follow request already sent." : "This person already requested to follow you." }, { status: 409 });
    if (existing?.id) await adminSupabaseFetch(`social_connections?id=eq.${existing.id}`, { method: "DELETE" });

    const insert = await adminSupabaseFetch("social_connections", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({ requester_id: userId, addressee_id: targetUserId, status: "pending" }) });
    if (!insert.ok) return NextResponse.json({ error: "Unable to send follow request." }, { status: 500 });
    const connection = (await insert.json())?.[0];
    const requesterName = requester?.full_name ?? requester?.username ?? "A Krythiq user";
    await createNotification({ env: getSupabaseEnv(), accessToken: "", userId: targetUserId, type: "social.follow_requested", useServiceRole: true, data: { requester_id: userId, requesterName, href: "/discover/requests", message: `${requesterName} requested to follow you.` } }).catch(() => undefined);
    return NextResponse.json({ connection }, { status: 201 });
  } catch (error) {
    if (error instanceof RequestAuthError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Unable to send follow request." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { userId } = await requireVerifiedRequestAuth(request);
    const body = await request.json();
    const connectionId = typeof body?.connectionId === "string" && UUID.test(body.connectionId) ? body.connectionId : "";
    const action = body?.action === "accept" ? "accepted" : body?.action === "decline" ? "declined" : null;
    if (!connectionId || !action) return NextResponse.json({ error: "Invalid follow request action." }, { status: 400 });
    const lookup = await adminSupabaseFetch(`social_connections?id=eq.${connectionId}&addressee_id=eq.${userId}&status=eq.pending&select=id,requester_id&limit=1`);
    const connection = lookup.ok ? (await lookup.json())?.[0] : null;
    if (!connection) return NextResponse.json({ error: "Follow request not found." }, { status: 404 });
    const update = await adminSupabaseFetch(`social_connections?id=eq.${connectionId}`, { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify({ status: action, responded_at: new Date().toISOString(), updated_at: new Date().toISOString() }) });
    if (!update.ok) return NextResponse.json({ error: "Unable to update follow request." }, { status: 500 });
    if (action === "accepted") {
      const profileResponse = await adminSupabaseFetch(`profiles?id=eq.${userId}&select=full_name,username&limit=1`);
      const profile = profileResponse.ok ? (await profileResponse.json())?.[0] : null;
      const accepterName = profile?.full_name ?? profile?.username ?? "A Krythiq user";
      await createNotification({ env: getSupabaseEnv(), accessToken: "", userId: connection.requester_id, type: "social.follow_accepted", useServiceRole: true, data: { user_id: userId, requesterName: accepterName, href: `/discover/people/${userId}`, message: `${accepterName} accepted your follow request.` } }).catch(() => undefined);
    }
    return NextResponse.json({ connection: (await update.json())?.[0] ?? null });
  } catch (error) {
    if (error instanceof RequestAuthError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Unable to update follow request." }, { status: 500 });
  }
}
