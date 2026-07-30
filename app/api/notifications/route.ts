import { NextResponse } from "next/server";
import {
  RequestAuthError,
  getSupabaseEnv,
  parsePagination,
  requireRequestAuth,
  supabaseFetch,
} from "@/app/lib/server/supabaseRest";

export const runtime = "nodejs";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const { accessToken, userId } = requireRequestAuth(request);

    const { page, pageSize, offset } = parsePagination(searchParams, { page: 1, pageSize: 10 });
    const env = getSupabaseEnv();

    const res = await supabaseFetch(
      env,
      `notifications?user_id=eq.${userId}&select=id,type,data,read_at,created_at&order=created_at.desc&limit=${pageSize}&offset=${offset}`,
      { accessToken },
    );

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: text }, { status: 500 });
    }

    const notifications = await res.json();
    return NextResponse.json({ notifications, page, pageSize });
  } catch (error) {
    if (error instanceof RequestAuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { accessToken, userId } = requireRequestAuth(request);
    const { notificationIds, markAll } = await request.json();

    const env = getSupabaseEnv();
    const now = new Date().toISOString();

    if (markAll) {
      const res = await supabaseFetch(env, `notifications?user_id=eq.${userId}`, {
        method: "PATCH",
        accessToken,
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ read_at: now }),
      });

      if (!res.ok) {
        const text = await res.text();
        return NextResponse.json({ error: text }, { status: 500 });
      }

      return NextResponse.json({ ok: true });
    }

    if (
      !Array.isArray(notificationIds) ||
      notificationIds.length === 0 ||
      notificationIds.length > 100 ||
      !notificationIds.every((id): id is string => typeof id === "string" && UUID_PATTERN.test(id))
    ) {
      return NextResponse.json({ error: "Missing notificationIds." }, { status: 400 });
    }

    const filter = notificationIds.map((id) => `id.eq.${id}`).join(",");
    const res = await supabaseFetch(env, `notifications?user_id=eq.${userId}&or=(${filter})`, {
      method: "PATCH",
      accessToken,
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ read_at: now }),
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: text }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof RequestAuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
  }
}
