"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2, MailWarning } from "lucide-react";

import { createClient } from "@/app/lib/supabase";
import { buildAuthHeaders } from "@/app/lib/http";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AcceptInvitationPage() {
  return <Suspense fallback={<InvitationLoading />}><AcceptInvitation /></Suspense>;
}

function AcceptInvitation() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Accepting your team invitation…");

  useEffect(() => {
    let active = true;
    const accept = async () => {
      const token = searchParams.get("token");
      const { data } = await supabase.auth.getSession();
      const accessToken = data.session?.access_token;
      if (!token || !accessToken) {
        if (active) { setStatus("error"); setMessage("This invitation link is incomplete."); }
        return;
      }
      const response = await fetch("/api/teams/invitations/accept", {
        method: "POST",
        headers: buildAuthHeaders(accessToken, { "Content-Type": "application/json" }),
        body: JSON.stringify({ token }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!active) return;
      if (!response.ok) {
        setStatus("error");
        setMessage(payload?.error ?? "Unable to accept this invitation.");
        return;
      }
      window.dispatchEvent(new Event("votrio:teams-changed"));
      setStatus("success");
      setMessage(`You joined ${payload?.team?.name ?? "the team"}.`);
    };
    void accept();
    return () => { active = false; };
  }, [searchParams, supabase]);

  return (
    <div className="grid min-h-[60vh] place-items-center">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <span className={`mx-auto grid h-12 w-12 place-items-center rounded-2xl ${status === "error" ? "bg-destructive/10 text-destructive" : "bg-emerald-500/10 text-emerald-500"}`}>
            {status === "loading" ? <Loader2 className="animate-spin" /> : status === "success" ? <CheckCircle2 /> : <MailWarning />}
          </span>
          <CardTitle className="mt-4">{status === "success" ? "Invitation accepted" : status === "error" ? "Invitation unavailable" : "Joining team"}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-6 text-muted-foreground">{message}</p>
          {status !== "loading" ? <Button className="mt-5" onClick={() => router.replace(status === "success" ? "/scan?view=repositories" : "/settings?section=teams")}>{status === "success" ? "Open workspace" : "Go to teams"}</Button> : null}
        </CardContent>
      </Card>
    </div>
  );
}

function InvitationLoading() {
  return <div className="grid min-h-[60vh] place-items-center"><Loader2 className="animate-spin text-muted-foreground" /></div>;
}
