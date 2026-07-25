import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { getSupabaseEnv, RequestAuthError, requireRequestAuth, supabaseFetch } from "@/app/lib/server/supabaseRest";

export async function POST(request: Request) {
  try {
    const { accessToken } = requireRequestAuth(request);
    const body = await request.json().catch(() => ({}));
    const token = typeof body?.token === "string" ? body.token : "";
    if (token.length < 32) return NextResponse.json({ error: "Invalid invitation link." }, { status: 400 });
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const result = await supabaseFetch(getSupabaseEnv(), "rpc/accept_team_invitation", {
      method: "POST",
      accessToken,
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ invitation_token_hash: tokenHash }),
    });
    if (!result.ok) {
      const text = await result.text();
      const forbidden = /42501|email address/i.test(text);
      return NextResponse.json(
        { error: forbidden ? "Sign in with the email address that received this invitation." : "This invitation is invalid or expired." },
        { status: forbidden ? 403 : 400 },
      );
    }
    const accepted = (await result.json())?.[0];
    return NextResponse.json({ ok: true, team: { id: accepted?.team_id, name: accepted?.team_name } });
  } catch (error) {
    if (error instanceof RequestAuthError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
  }
}
