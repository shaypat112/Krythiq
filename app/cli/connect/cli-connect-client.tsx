"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Laptop, Loader2 } from "lucide-react";
import { createClient } from "@/app/lib/supabase";
import { fetchWithSession } from "@/app/lib/session-fetch";
import { signInRedirect } from "@/app/lib/cli-session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function CliConnectClient({ initialCode }: { initialCode: string }) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [code, setCode] = useState(initialCode.toUpperCase());
  const [phase, setPhase] = useState<"idle" | "approving" | "waiting" | "connected">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (phase !== "waiting") return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const response = await fetchWithSession(supabase, `/api/cli/device/status?code=${encodeURIComponent(code)}`, { signal: controller.signal });
        const payload = await response.json();
        if (controller.signal.aborted) return;
        if (!response.ok) throw new Error(payload.error ?? "Unable to confirm terminal connection. Keep your terminal open.");
        if (payload.status === "connected") { setPhase("connected"); setError(null); return; }
        if (["expired", "denied"].includes(payload.status)) { setError("This authorization expired. Run krythiq connect again in your terminal."); setPhase("idle"); return; }
        setError(null);
      } catch (cause) {
        if (controller.signal.aborted) return;
        setError(cause instanceof Error ? cause.message : "Unable to confirm connection.");
      }
      timer = setTimeout(() => void poll(), 2000);
    };
    void poll();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [phase, code, supabase]);

  const approve = async () => {
    setPhase("approving"); setError(null);
    try {
      const session = (await supabase.auth.getSession()).data.session;
      if (!session) { router.replace(signInRedirect("/cli/connect", `?code=${encodeURIComponent(code)}`)); setPhase("idle"); return; }
      const response = await fetchWithSession(supabase, "/api/cli/device/approve", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userCode: code }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? "Unable to authorize this terminal.");
      setPhase("waiting");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to authorize this terminal."); setPhase("idle"); }
  };

  return <main className="mx-auto grid min-h-[75svh] max-w-xl place-items-center px-6 py-16"><section className="w-full rounded-2xl bg-card p-8 text-center">
    {phase === "connected" ? <>
      <CheckCircle2 className="mx-auto size-10 text-emerald-400" /><h1 className="mt-5 text-2xl font-semibold">Terminal connected</h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">Your terminal claimed its connection. Use krythiq scan --save to upload a result. You can review or revoke this authorization in CLI settings.</p>
      <Button asChild className="mt-6"><Link href="/settings?section=cli">Manage terminals</Link></Button>
    </> : <>
      <Laptop className="mx-auto size-10 text-primary" /><h1 className="mt-5 text-2xl font-semibold">Connect your terminal</h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">Approve only a code shown by your own terminal. This authorizes scan uploads and account-balance checks.</p>
      <label htmlFor="cli-device-code" className="mt-6 block text-sm font-medium">Terminal code</label>
      <Input id="cli-device-code" className="mx-auto mt-2 max-w-xs text-center font-mono tracking-widest" value={code} disabled={phase !== "idle"} maxLength={9} onChange={event => setCode(event.target.value.toUpperCase())} placeholder="ABCD-EFGH" />
      {phase === "waiting" ? <p role="status" className="mt-5 flex items-center justify-center gap-2 text-sm"><Loader2 className="h-4 w-4 animate-spin" />Approved. Waiting for your terminal to finish…</p> : <Button className="mt-5" disabled={phase === "approving" || !/^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code)} onClick={() => void approve()}>{phase === "approving" ? <Loader2 className="animate-spin" /> : <Laptop />}Authorize terminal</Button>}
    </>}
    {error ? <p role="alert" className="mt-4 text-sm text-destructive">{error}</p> : null}
  </section></main>;
}
