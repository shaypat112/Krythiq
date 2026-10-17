import type { SupabaseClient } from "@supabase/supabase-js";

// Only authentication failures trigger renewal; outages must not discard a session.
export async function fetchWithSession(client: SupabaseClient, url: string, init: RequestInit = {}) {
  const { data } = await client.auth.getSession();
  if (!data.session?.access_token) throw new Error("Sign in to continue.");
  const send = (token: string) => {
    const headers = new Headers(init.headers);
    headers.set("Authorization", `Bearer ${token}`);
    return fetch(url, { ...init, headers, cache: "no-store", signal: init.signal ? AbortSignal.any([init.signal, AbortSignal.timeout(15_000)]) : AbortSignal.timeout(15_000) });
  };
  let response = await send(data.session.access_token);
  if (response.status === 401) {
    const refreshed = await client.auth.refreshSession();
    if (refreshed.error || !refreshed.data.session?.access_token) throw new Error("Your browser session expired. Sign in again.");
    response = await send(refreshed.data.session.access_token);
  }
  return response;
}
