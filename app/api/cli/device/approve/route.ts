import { NextResponse } from "next/server";
import { adminSupabaseFetch } from "@/app/lib/server/admin";
import { requireVerifiedRequestAuth } from "@/app/lib/server/requestAuth";
import { RequestAuthError } from "@/app/lib/server/supabaseRest";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { userId } = await requireVerifiedRequestAuth(request);
    const body = await request.json().catch(() => ({}));
    const userCode = typeof body?.userCode === "string" ? body.userCode.trim().toUpperCase() : "";
    if (!/^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(userCode)) return NextResponse.json({ error: "Enter a valid CLI code." }, { status: 400 });
    const now = new Date().toISOString();
    const response = await adminSupabaseFetch(`cli_device_codes?user_code=eq.${userCode}&status=eq.pending&expires_at=gt.${encodeURIComponent(now)}`, { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify({ user_id: userId, status: "approved", approved_at: now }) });
    const rows = response.ok ? await response.json() : [];
    if (!rows[0]) return NextResponse.json({ error: "This code is invalid, expired, or already used." }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof RequestAuthError) return NextResponse.json({ error: "Sign in before approving this terminal." }, { status: 401 });
    return NextResponse.json({ error: "Unable to approve this terminal." }, { status: 500 });
  }
}
