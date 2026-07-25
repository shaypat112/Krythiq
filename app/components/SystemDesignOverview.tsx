"use client";

import { ArrowRight, CheckCircle2, CircleHelp, TriangleAlert } from "lucide-react";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HelpTooltip } from "@/app/components/HelpTooltip";

type Scenario = {
  id: string;
  title: string;
  status: "ready" | "watch" | "risk" | "unknown";
  confidence: "low" | "medium";
  reflection: string;
  evidence: string[];
  nextStep: string;
};

export type SystemDesignResult = {
  summary: string;
  disclaimer: string;
  scenarios: Scenario[];
};

const statusMeta = {
  ready: { label: "Looks prepared", value: 3, color: "var(--chart-2)", icon: CheckCircle2 },
  watch: { label: "Worth improving", value: 2, color: "var(--chart-3)", icon: CircleHelp },
  risk: { label: "Fix this next", value: 1, color: "var(--chart-4)", icon: TriangleAlert },
  unknown: { label: "Not enough info", value: 0.35, color: "var(--muted-foreground)", icon: CircleHelp },
};

const shortLabels: Record<string, string> = {
  "traffic-spike": "More visitors",
  "data-growth": "More data",
  "dependency-failure": "Service outage",
  "multi-region": "More locations",
  "cost-pressure": "Higher bills",
};

function ReadinessTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: { title: string; statusLabel: string } }> }) {
  if (!active || !payload?.[0]) return null;
  return <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-lg"><p className="font-medium">{payload[0].payload.title}</p><p className="mt-1 text-muted-foreground">{payload[0].payload.statusLabel}</p></div>;
}

export function SystemDesignOverview({ result, docsHref }: { result: SystemDesignResult; docsHref?: string }) {
  const chartData = result.scenarios.map((scenario) => ({
    ...scenario,
    label: shortLabels[scenario.id] ?? scenario.title,
    value: statusMeta[scenario.status].value,
    color: statusMeta[scenario.status].color,
    statusLabel: statusMeta[scenario.status].label,
  }));
  const priorities = [...result.scenarios]
    .sort((a, b) => statusMeta[a.status].value - statusMeta[b.status].value)
    .slice(0, 3);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-border bg-muted/20">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div><CardTitle>Will this app handle growth?</CardTitle><p className="mt-1 max-w-3xl text-sm text-muted-foreground">{result.summary}</p></div>
          {docsHref ? <a href={docsHref} className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground">Simple guide <ArrowRight className="h-4 w-4" /></a> : <Badge variant="outline">Code signals only</Badge>}
        </div>
      </CardHeader>
      <CardContent className="space-y-6 p-5">
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <div className="flex items-center gap-1.5"><h3 className="text-sm font-semibold">Quick picture</h3><HelpTooltip>This estimate is based on repository code signals. It is not a live load test.</HelpTooltip></div>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">Longer bars mean the code contains more useful safeguards. This is not a speed or capacity test.</p>
            <div className="mt-3 h-64" role="img" aria-label={chartData.map((item) => `${item.label}: ${item.statusLabel}`).join(", ")}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ left: 4, right: 20 }}>
                  <XAxis type="number" domain={[0, 3]} hide />
                  <YAxis type="category" dataKey="label" width={92} axisLine={false} tickLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} />
                  <Tooltip cursor={{ fill: "var(--muted)" }} content={<ReadinessTooltip />} />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={18}>
                    {chartData.map((item) => <Cell key={item.id} fill={item.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              {(["risk", "watch", "ready"] as const).map((status) => <span key={status} className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: statusMeta[status].color }} />{statusMeta[status].label}</span>)}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold">Your easiest next fixes</h3>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">Start with the first item. You do not need to rebuild the whole app.</p>
            <ol className="mt-4 space-y-3">
              {priorities.map((scenario, index) => {
                const meta = statusMeta[scenario.status];
                const Icon = meta.icon;
                return (
                  <li key={scenario.id} className="rounded-xl border border-border bg-background p-4">
                    <div className="flex items-start gap-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">{index + 1}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2"><p className="text-sm font-semibold">{shortLabels[scenario.id] ?? scenario.title}</p><Badge variant="outline"><Icon className="h-3 w-3" />{meta.label}</Badge></div>
                        <p className="mt-2 text-sm leading-6">{scenario.nextStep}</p>
                        <details className="mt-2 text-xs text-muted-foreground"><summary className="cursor-pointer">Why Votrio suggested this</summary><p className="mt-2 leading-5">{scenario.reflection}</p></details>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
        <p className="border-t border-border pt-4 text-xs leading-5 text-muted-foreground">{result.disclaimer}</p>
      </CardContent>
    </Card>
  );
}
