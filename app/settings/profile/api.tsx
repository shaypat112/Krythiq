"use client";

import { Activity, Gauge, KeyRound, Save, ShieldCheck } from "lucide-react";
import { apiPlanCatalog } from "@/app/lib/api-rate-limits";
import { useSettings } from "./context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { HelpTooltip } from "@/app/components/HelpTooltip";

export function ApiSection() {
  const { settings, update, save, saving, apiPlan } = useSettings();
  const plan = apiPlanCatalog[apiPlan];

  return (
    <div className="space-y-6">
      <header>
        <div className="flex flex-wrap items-center gap-2"><Badge variant="outline"><KeyRound /> API settings</Badge><Badge>{plan.name} plan</Badge></div>
        <h1 className="mt-4 text-2xl font-semibold">Control API usage</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">These controls change the request limits Votrio enforces for your account. Lower limits can protect a prototype from loops, runaway scripts, and unexpected AI usage.</p>
      </header>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Gauge className="h-5 w-5" /> Rate limits</CardTitle></CardHeader>
        <CardContent className="space-y-7">
          <div>
            <div className="flex items-center justify-between gap-4">
              <div><div className="flex items-center gap-1.5"><Label htmlFor="api-limit">Standard API requests</Label><HelpTooltip>Maximum normal API calls allowed each minute for your account.</HelpTooltip></div><p className="mt-1 text-xs text-muted-foreground">Settings, notifications, reports, repositories, and other normal API calls.</p></div>
              <span className="shrink-0 rounded-md border border-border bg-muted px-2.5 py-1 font-mono text-sm">{settings.apiRequestsPerMinute}/min</span>
            </div>
            <input id="api-limit" type="range" min={10} max={plan.limits.apiRequestsPerMinute} step={10} value={settings.apiRequestsPerMinute} onChange={(event) => update("apiRequestsPerMinute", Number(event.target.value))} className="mt-4 w-full accent-foreground" />
            <div className="mt-1 flex justify-between text-xs text-muted-foreground"><span>10/min</span><span>Plan maximum: {plan.limits.apiRequestsPerMinute}/min</span></div>
          </div>

          <div>
            <div className="flex items-center justify-between gap-4">
              <div><div className="flex items-center gap-1.5"><Label htmlFor="expensive-limit">Scans and AI requests</Label><HelpTooltip>These operations use more compute, so they have a separate lower limit.</HelpTooltip></div><p className="mt-1 text-xs text-muted-foreground">Repository scans, AI analysis, chat, and webhook tests.</p></div>
              <span className="shrink-0 rounded-md border border-border bg-muted px-2.5 py-1 font-mono text-sm">{settings.expensiveRequestsPerMinute}/min</span>
            </div>
            <input id="expensive-limit" type="range" min={1} max={plan.limits.expensiveRequestsPerMinute} step={1} value={settings.expensiveRequestsPerMinute} onChange={(event) => update("expensiveRequestsPerMinute", Number(event.target.value))} className="mt-4 w-full accent-foreground" />
            <div className="mt-1 flex justify-between text-xs text-muted-foreground"><span>1/min</span><span>Plan maximum: {plan.limits.expensiveRequestsPerMinute}/min</span></div>
          </div>

          <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm leading-6 text-muted-foreground">
            <p className="flex items-center gap-2 font-medium text-foreground"><ShieldCheck className="h-4 w-4" /> How enforcement works</p>
            <p className="mt-2">Limits use a rolling one-minute process-level guard and return HTTP 429 with retry headers when exceeded. A CDN or distributed rate-limit store should remain the authoritative protection for multi-instance production deployments.</p>
          </div>
          <Button onClick={() => void save()} disabled={saving}><Save />{saving ? "Saving…" : "Save API limits"}</Button>
        </CardContent>
      </Card>

      <section aria-labelledby="business-model-heading">
        <div className="flex items-center gap-2"><Activity className="h-5 w-5 text-muted-foreground" /><h2 id="business-model-heading" className="text-lg font-semibold">How the business model works</h2></div>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">Votrio keeps the first security workflow accessible, then charges for the capacity and collaboration real production teams need. Exact checkout prices come from Stripe.</p>
        <div className="mt-4 grid gap-3">
          {(Object.entries(apiPlanCatalog) as Array<[keyof typeof apiPlanCatalog, (typeof apiPlanCatalog)[keyof typeof apiPlanCatalog]]>).map(([id, item]) => (
            <Card key={id} className={id === apiPlan ? "border-foreground/30" : ""}>
              <CardContent className="grid gap-3 p-4 sm:grid-cols-[0.55fr_1fr_1fr] sm:items-center">
                <div><div className="flex items-center gap-2"><p className="font-semibold">{item.name}</p>{id === apiPlan ? <Badge variant="outline">Current</Badge> : null}</div><p className="mt-1 text-xs text-muted-foreground">{item.pricePosition}</p></div>
                <div><p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Best for</p><p className="mt-1 text-sm">{item.audience}</p></div>
                <div><p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Capacity</p><p className="mt-1 text-sm">{item.limits.apiRequestsPerMinute} API/min · {item.limits.expensiveRequestsPerMinute} scans & AI/min</p><p className="mt-1 text-xs text-muted-foreground">{item.included}</p></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
