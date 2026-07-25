import { NextResponse } from "next/server";
import { RequestAuthError, getSupabaseEnv, requireRequestAuth, supabaseFetch } from "@/app/lib/server/supabaseRest";

export const runtime = "nodejs";

const allowedStatuses = new Set(["reviewed", "false_positive", "ignored", "open"]);

export async function GET(request: Request) {
  try {
    const { accessToken, userId } = requireRequestAuth(request);
    const repository = new URL(request.url).searchParams.get("repository");
    if (!repository) return NextResponse.json({ error: "Missing repository." }, { status: 400 });
    const response = await supabaseFetch(getSupabaseEnv(), `finding_reviews?user_id=eq.${userId}&repository=eq.${encodeURIComponent(repository)}&select=finding_key,status,reason`, { accessToken });
    if (!response.ok) return NextResponse.json({ error: await response.text() }, { status: 500 });
    return NextResponse.json({ reviews: await response.json() });
  } catch (error) {
    if (error instanceof RequestAuthError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Unable to load finding status." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { accessToken, userId } = requireRequestAuth(request);
    const body = await request.json();
    const repository = typeof body.repository === "string" ? body.repository : "";
    const findingKey = typeof body.findingKey === "string" ? body.findingKey : "";
    const status = typeof body.status === "string" ? body.status : "";
    const reason = typeof body.reason === "string" ? body.reason.trim() : null;
    if (!repository || !findingKey || !allowedStatuses.has(status)) return NextResponse.json({ error: "Invalid finding status request." }, { status: 400 });
    if (status === "ignored" && !reason) return NextResponse.json({ error: "An ignore reason is required." }, { status: 400 });
    const response = await supabaseFetch(getSupabaseEnv(), "finding_reviews?on_conflict=user_id,repository,finding_key", {
      method: "POST", accessToken, headers: { Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify({ user_id: userId, repository, finding_key: findingKey, status, reason: status === "ignored" ? reason : null, updated_at: new Date().toISOString() }),
    });
    if (!response.ok) return NextResponse.json({ error: await response.text() }, { status: 500 });
    return NextResponse.json({ review: (await response.json())[0] });
  } catch (error) {
    if (error instanceof RequestAuthError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Unable to save finding status." }, { status: 500 });
  }
}
