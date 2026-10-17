import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { adminSupabaseFetch } from "./admin";
import { RequestAuthError } from "./supabaseRest";

export const hashCliSecret = (value: string) => createHash("sha256").update(value).digest("hex");
export const createCliSecret = () => `kry_cli_${randomBytes(32).toString("base64url")}`;
export const createCliRefreshSecret = () => `kry_refresh_${randomBytes(32).toString("base64url")}`;

export async function requireCliAuth(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  const token = /^Bearer\s+(\S+)$/i.exec(authorization)?.[1] ?? "";
  if (!/^kry_cli_[A-Za-z0-9_-]{43}$/.test(token)) throw new RequestAuthError("Invalid CLI credential.");
  const response = await adminSupabaseFetch("rpc/authenticate_cli_session", {
    method: "POST", body: JSON.stringify({ p_access_hash: hashCliSecret(token) }), cache: "no-store",
  });
  if (!response.ok) throw new RequestAuthError("CLI authentication is temporarily unavailable.", 503);
  const row = (await response.json() as Array<{ user_id: string; token_id: string }>)[0];
  if (!row) throw new RequestAuthError("CLI credential expired or was revoked.");
  return { userId: row.user_id, tokenId: row.token_id };
}
