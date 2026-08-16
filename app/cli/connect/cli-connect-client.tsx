"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Laptop, Loader2 } from "lucide-react";
import { createClient } from "@/app/lib/supabase";
import { buildAuthHeaders } from "@/app/lib/http";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const confetti = Array.from({ length: 30 }, (_, index) => ({
  left: `${(index * 37) % 100}%`,
  delay: `${(index % 10) * 70}ms`,
  duration: `${900 + (index % 6) * 130}ms`,
  color: ["#38bdf8", "#34d399", "#fbbf24", "#fb7185", "#a78bfa"][index % 5],
  rotation: `${(index * 47) % 180}deg`,
}));

function ConnectedCelebration() {
  return <div className="relative isolate overflow-hidden rounded-2xl border border-emerald-500/25 bg-emerald-500/5 px-6 py-10">
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {confetti.map((piece, index) => <span key={index} className="cli-confetti absolute -top-4 h-2.5 w-1.5 rounded-sm" style={{ left: piece.left, backgroundColor: piece.color, animationDelay: piece.delay, animationDuration: piece.duration, rotate: piece.rotation }} />)}
    </div>
    <div className="relative">
      <div aria-hidden="true" className="cli-celebration-pop mx-auto text-5xl">🎂</div>
      <CheckCircle2 className="mx-auto mt-4 size-9 text-emerald-500" />
      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-500">Connection complete</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Congratulations!</h1>
      <p className="mt-3 text-base font-medium">You connected your CLI to the Krythiq.dev Web UI.</p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">Your terminal will finish signing in and future CLI scans can appear in your dashboard. You can close this tab whenever you’re ready.</p>
      <Button asChild className="mt-7"><Link href="/dashboard">Open dashboard</Link></Button>
    </div>
  </div>;
}

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

  return <main className="mx-auto grid min-h-[75svh] max-w-xl place-items-center px-6 py-16"><section className="w-full text-center">{approved ? <ConnectedCelebration /> : <div className="border-y border-border py-10"><Laptop className="mx-auto size-10 text-sky-500" /><h1 className="mt-5 text-2xl font-semibold">Connect Krythiq CLI</h1><p className="mt-2 text-sm leading-6 text-muted-foreground">Approve only if you started this request from your own terminal. The CLI can upload local scan results to your dashboard.</p><Input className="mx-auto mt-6 max-w-xs text-center font-mono tracking-widest" value={code} maxLength={9} onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder="ABCD-EFGH" />{error ? <p className="mt-3 text-sm text-red-500">{error}</p> : null}<Button className="mt-5" disabled={working || !/^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code)} onClick={() => void approve()}>{working ? <Loader2 className="animate-spin" /> : <Laptop />}Authorize terminal</Button></div>}</section></main>;
}
