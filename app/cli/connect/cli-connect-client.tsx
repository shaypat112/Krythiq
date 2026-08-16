"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Laptop, Loader2 } from "lucide-react";
import { createClient } from "@/app/lib/supabase";
import { buildAuthHeaders } from "@/app/lib/http";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function CliConnectClient({ initialCode }: { initialCode: string }) {
  const supabase = useMemo(() => createClient(), []);
  const [code, setCode] = useState(initialCode.toUpperCase());
  const [working, setWorking] = useState(false);
  const [approved, setApproved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const approve = async () => {
    setWorking(true); setError(null);
    const session = (await supabase.auth.getSession()).data.session;
    if (!session?.access_token) { window.location.href = `/auth?next=${encodeURIComponent(`/cli/connect?code=${code}`)}`; return; }
    const response = await fetch("/api/cli/device/approve", { method: "POST", headers: buildAuthHeaders(session.access_token, { "Content-Type": "application/json" }), body: JSON.stringify({ userCode: code }) });
    const payload = await response.json().catch(() => ({}));
    setWorking(false);
    if (!response.ok) { setError(payload.error ?? "Unable to connect this terminal."); return; }
    setApproved(true);
  };

  return <main className="mx-auto grid min-h-[75svh] max-w-xl place-items-center px-6 py-16"><section className="w-full border-y border-border py-10 text-center">{approved ? <><CheckCircle2 className="mx-auto size-10 text-emerald-500" /><h1 className="mt-5 text-2xl font-semibold">Terminal connected</h1><p className="mt-2 text-sm text-muted-foreground">You can close this tab. Your CLI will finish signing in and display your Token balance.</p><Button asChild className="mt-6"><Link href="/dashboard">Open dashboard</Link></Button></> : <><Laptop className="mx-auto size-10 text-sky-500" /><h1 className="mt-5 text-2xl font-semibold">Connect Krythiq CLI</h1><p className="mt-2 text-sm leading-6 text-muted-foreground">Approve only if you started this request from your own terminal. The CLI can upload local scan results to your dashboard.</p><Input className="mx-auto mt-6 max-w-xs text-center font-mono tracking-widest" value={code} maxLength={9} onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder="ABCD-EFGH" />{error ? <p className="mt-3 text-sm text-red-500">{error}</p> : null}<Button className="mt-5" disabled={working || !/^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code)} onClick={() => void approve()}>{working ? <Loader2 className="animate-spin" /> : <Laptop />}Authorize terminal</Button></>}</section></main>;
}
