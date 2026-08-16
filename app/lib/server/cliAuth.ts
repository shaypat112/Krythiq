import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { adminSupabaseFetch } from "./admin";
import { RequestAuthError } from "./supabaseRest";

export const hashCliSecret = (value: string) => createHash("sha256").update(value).digest("hex");
export const createCliSecret = () => `kry_cli_${randomBytes(32).toString("base64url")}`;

export async function requireCliAuth(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
  if (!token.startsWith("kry_cli_") || token.length > 200) throw new RequestAuthError("Invalid CLI credential.");
  const response = await adminSupabaseFetch(`cli_access_tokens?token_hash=eq.${hashCliSecret(token)}&revoked_at=is.null&select=id,user_id,expires_at&limit=1`);
  const row = response.ok ? (await response.json() as Array<{ id: string; user_id: string; expires_at: string | null }>)[0] : null;
  if (!row || (row.expires_at && new Date(row.expires_at).getTime() <= Date.now())) throw new RequestAuthError("CLI credential expired or was revoked.");
  await adminSupabaseFetch(`cli_access_tokens?id=eq.${row.id}`, { method: "PATCH", body: JSON.stringify({ last_used_at: new Date().toISOString() }) }).catch(() => undefined);
  return { userId: row.user_id, tokenId: row.id };
}
