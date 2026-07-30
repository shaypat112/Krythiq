"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function OptOutClient({ token }: { token: string }) {
  const [state, setState] = useState<"idle" | "saving" | "done" | "error">("idle");
  const optOut = async () => {
    setState("saving");
    const response = await fetch("/api/referrals/opt-out", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    setState(response.ok ? "done" : "error");
  };
  return <div className="mx-auto grid min-h-[70vh] max-w-lg place-items-center px-4"><Card className="w-full"><CardHeader><CardTitle>Referral email preferences</CardTitle></CardHeader><CardContent className="space-y-4"><p className="text-sm leading-6 text-muted-foreground">{state === "done" ? "You will not receive additional Krythiq referral invitations at this address." : "Stop future Krythiq referral invitations to this email address."}</p>{state !== "done" ? <Button onClick={() => void optOut()} disabled={!token || state === "saving"}>{state === "saving" ? "Saving…" : "Stop referral emails"}</Button> : null}{state === "error" ? <p role="alert" className="text-sm text-red-500">This link is invalid or expired.</p> : null}</CardContent></Card></div>;
}
