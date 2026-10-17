import { NextResponse } from "next/server";
import { adminSupabaseFetch } from "@/app/lib/server/admin";
import { requireVerifiedRequestAuth } from "@/app/lib/server/requestAuth";
import { RequestAuthError } from "@/app/lib/server/supabaseRest";

export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    const { userId } = await requireVerifiedRequestAuth(request);
    const code = new URL(request.url).searchParams.get("code") ?? "";
    if (!/^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code)) return NextResponse.json({ error: "Invalid code." }, { status: 400 });
    const response = await adminSupabaseFetch(`cli_device_codes?user_code=eq.${code}&user_id=eq.${userId}&select=status,expires_at&limit=1`, { cache: "no-store" });
    if (!response.ok) return NextResponse.json({ error: "Unable to check terminal." }, { status: 503 });
    const device = (await response.json())?.[0];
    if (!device) return NextResponse.json({ error: "Authorization not found." }, { status: 404 });
    return NextResponse.json({ status: device.status === "consumed" ? "connected" : Date.parse(device.expires_at) <= Date.now() ? "expired" : device.status }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: "Unable to check terminal." }, { status: error instanceof RequestAuthError ? error.status : 503 });
  }
}
