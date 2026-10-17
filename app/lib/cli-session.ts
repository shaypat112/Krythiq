export type CliDeviceState = { revoked_at: string | null; expires_at: string | null; refresh_expires_at?: string | null };

export function cliDeviceStatus(device: CliDeviceState, now = Date.now()): "active" | "expired" | "revoked" {
  if (device.revoked_at) return "revoked";
  const expiry = device.refresh_expires_at ?? device.expires_at;
  if (expiry === null) return "active"; // Legacy durable credentials remain usable until revoked.
  const timestamp = Date.parse(expiry);
  return Number.isFinite(timestamp) && timestamp > now ? "active" : "expired";
}

export function signInRedirect(pathname: string, search = "") {
  const destination = pathname.startsWith("/") && !pathname.startsWith("//") && !pathname.includes("\\") ? pathname + search : "/scan";
  return `/auth?next=${encodeURIComponent(destination)}`;
}
