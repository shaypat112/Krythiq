import { NextResponse } from "next/server";
import { adminSupabaseFetch } from "@/app/lib/server/admin";
import { createNotification } from "@/app/lib/server/notifications";
import { getSupabaseEnv, RequestAuthError, requireVerifiedRequestAuth } from "@/app/lib/server/supabaseRest";

export const runtime = "nodejs";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function acceptedConnection(userId: string, peerId: string) {
  const response = await adminSupabaseFetch(`social_connections?requester_id=in.(${userId},${peerId})&addressee_id=in.(${userId},${peerId})&status=eq.accepted&select=id,requester_id,addressee_id&limit=1`);
  return response.ok ? (await response.json())?.[0] ?? null : null;
}

export async function GET(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const { userId } = await requireVerifiedRequestAuth(request);
    const { userId: peerId } = await params;
    if (!UUID.test(peerId) || peerId === userId) return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
    const connection = await acceptedConnection(userId, peerId);
    if (!connection) return NextResponse.json({ error: "Direct messages unlock after a follow request is accepted." }, { status: 403 });
    const [messagesResponse, profileResponse] = await Promise.all([
      adminSupabaseFetch(`social_messages?connection_id=eq.${connection.id}&select=id,connection_id,sender_id,body,read_at,created_at&order=created_at.asc&limit=200`),
      adminSupabaseFetch(`profiles?id=eq.${peerId}&select=id,username,full_name,avatar_url&limit=1`),
    ]);
    if (!messagesResponse.ok) return NextResponse.json({ error: "Messages are unavailable. Apply the latest migration." }, { status: 503 });
    await adminSupabaseFetch(`social_messages?connection_id=eq.${connection.id}&sender_id=eq.${peerId}&read_at=is.null`, { method: "PATCH", body: JSON.stringify({ read_at: new Date().toISOString() }) });
    return NextResponse.json({ connectionId: connection.id, messages: await messagesResponse.json(), peer: profileResponse.ok ? (await profileResponse.json())?.[0] ?? null : null, viewerId: userId });
  } catch (error) {
    if (error instanceof RequestAuthError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Unable to load messages." }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const { userId } = await requireVerifiedRequestAuth(request);
    const { userId: peerId } = await params;
    const payload = await request.json();
    const body = typeof payload?.body === "string" ? payload.body.trim() : "";
    if (!UUID.test(peerId) || peerId === userId || !body || body.length > 2000) return NextResponse.json({ error: "Message must be between 1 and 2,000 characters." }, { status: 400 });
    const connection = await acceptedConnection(userId, peerId);
    if (!connection) return NextResponse.json({ error: "Direct messages unlock after a follow request is accepted." }, { status: 403 });
    const recentSince = new Date(Date.now() - 60_000).toISOString();
    const recentResponse = await adminSupabaseFetch(`social_messages?connection_id=eq.${connection.id}&sender_id=eq.${userId}&created_at=gte.${encodeURIComponent(recentSince)}&select=id&limit=31`);
    if (recentResponse.ok && (await recentResponse.json() as unknown[]).length >= 30) return NextResponse.json({ error: "You’re sending messages too quickly." }, { status: 429 });
    const insert = await adminSupabaseFetch("social_messages", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({ connection_id: connection.id, sender_id: userId, body }) });
    if (!insert.ok) return NextResponse.json({ error: "Unable to send message." }, { status: 500 });
    const profileResponse = await adminSupabaseFetch(`profiles?id=eq.${userId}&select=full_name,username&limit=1`);
    const profile = profileResponse.ok ? (await profileResponse.json())?.[0] : null;
    const senderName = profile?.full_name ?? profile?.username ?? "A Krythiq user";
    await createNotification({ env: getSupabaseEnv(), accessToken: "", userId: peerId, type: "social.message_received", useServiceRole: true, data: { sender_id: userId, requesterName: senderName, href: `/discover/messages/${userId}`, message: `${senderName} sent you a message.` } }).catch(() => undefined);
    return NextResponse.json({ message: (await insert.json())?.[0] ?? null }, { status: 201 });
  } catch (error) {
    if (error instanceof RequestAuthError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Unable to send message." }, { status: 500 });
  }
}
