import { NextResponse } from "next/server";
import { adminSupabaseFetch } from "@/app/lib/server/admin";
import { createCliSecret, hashCliSecret } from "@/app/lib/server/cliAuth";
import { loadTokenAccount } from "@/app/lib/server/tokenLedger";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const deviceCode = typeof body?.deviceCode === "string" ? body.deviceCode : "";
  if (!deviceCode || deviceCode.length > 200) return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  const response = await adminSupabaseFetch(`cli_device_codes?device_code_hash=eq.${hashCliSecret(deviceCode)}&select=id,user_id,status,expires_at&limit=1`);
  const row = response.ok ? (await response.json() as Array<{ id: string; user_id: string | null; status: string; expires_at: string }>)[0] : null;
  if (!row || new Date(row.expires_at).getTime() <= Date.now()) return NextResponse.json({ error: "expired_token" }, { status: 400 });
  if (row.status !== "approved" || !row.user_id) return NextResponse.json({ error: "authorization_pending" }, { status: 428 });
  const consume = await adminSupabaseFetch(`cli_device_codes?id=eq.${row.id}&status=eq.approved`, { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify({ status: "consumed" }) });
  const consumed = consume.ok ? await consume.json() : [];
  if (!consumed[0]) return NextResponse.json({ error: "authorization_pending" }, { status: 428 });
  const token = createCliSecret();
  const insert = await adminSupabaseFetch("cli_access_tokens", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ user_id: row.user_id, token_hash: hashCliSecret(token) }) });
  if (!insert.ok) return NextResponse.json({ error: "server_error" }, { status: 503 });
  const account = await loadTokenAccount(row.user_id);
  return NextResponse.json({ accessToken: token, tokenType: "Bearer", balance: account.balance });
}
