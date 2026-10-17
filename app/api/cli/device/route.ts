import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { adminSupabaseFetch } from "@/app/lib/server/admin";
import { hashCliSecret } from "@/app/lib/server/cliAuth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const terminalName = typeof body?.name === "string" ? body.name.trim().slice(0, 100) : "Krythiq CLI";
  const deviceCode = randomBytes(32).toString("base64url");
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(8);
  const rawCode = Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
  const userCode = `${rawCode.slice(0, 4)}-${rawCode.slice(4)}`;
  const expiresAt = new Date(Date.now() + 10 * 60_000).toISOString();
  const response = await adminSupabaseFetch("cli_device_codes", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ device_code_hash: hashCliSecret(deviceCode), user_code: userCode, expires_at: expiresAt, terminal_name: terminalName || "Krythiq CLI", session_version: body?.sessionVersion === 2 ? 2 : 1 }) });
  if (!response.ok) return NextResponse.json({ error: "Unable to start CLI authorization." }, { status: 503 });
  const origin = new URL(request.url).origin;
  return NextResponse.json({ deviceCode, userCode, verificationUrl: `${origin}/cli/connect?code=${encodeURIComponent(userCode)}`, expiresIn: 600, interval: 2 }, { headers: { "Cache-Control": "no-store" } });
}
