"use client";

import { useCallback, useMemo } from "react";
import { BarChart3, Download, List } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/app/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export interface UsageItem {
  id: string;
  activity: string;
  date: string;
  type: string;
  tokens: number;
}

interface UsageTableProps {
  className?: string;
  title?: string;
  description?: string;
  usageHistory: UsageItem[];
  showTotal?: boolean;
  limit?: number;
}

function escapeCsv(value: string | number) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

export function UsageTable({
  className,
  title = "Usage activity",
  description = "Recent token charges, purchases, rewards, and refunds.",
  usageHistory,
  showTotal = true,
  limit,
}: UsageTableProps) {
  const rows = typeof limit === "number" ? usageHistory.slice(0, limit) : usageHistory;
  const totalUsed = usageHistory.reduce(
    (total, item) => total + (item.tokens < 0 ? Math.abs(item.tokens) : 0),
    0,
  );
  const chartData = useMemo(() => {
    const daily = new Map<string, { date: string; used: number; added: number }>();
    [...usageHistory].reverse().forEach((item) => {
      const date = new Date(item.date).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      });
      const point = daily.get(date) ?? { date, used: 0, added: 0 };
      if (item.tokens < 0) point.used += Math.abs(item.tokens);
      else point.added += item.tokens;
      daily.set(date, point);
    });
    return Array.from(daily.values());
  }, [usageHistory]);

  const exportToCsv = useCallback(() => {
    if (!usageHistory.length) return;
    const header = ["Activity", "Date", "Type", "Tokens"].map(escapeCsv).join(",");
    const data = usageHistory.map((item) =>
      [item.activity, new Date(item.date).toISOString(), item.type, item.tokens]
        .map(escapeCsv)
        .join(","),
    );
    const blob = new Blob(["\uFEFF", [header, ...data].join("\r\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "krythiq-usage.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }, [usageHistory]);

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1.5">
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        {usageHistory.length ? (
          <Button variant="outline" size="sm" onClick={exportToCsv}>
            <Download className="size-4" />
            Export CSV
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="p-0">
        <Tabs defaultValue="table" className="gap-0">
          <div className="border-b px-4 pb-4 sm:px-6">
            <TabsList className="grid w-full grid-cols-2 sm:w-64">
              <TabsTrigger value="table"><List className="size-4" />Table</TabsTrigger>
              <TabsTrigger value="graphs"><BarChart3 className="size-4" />Graphs</TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="table" className="mt-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-full pl-4 sm:pl-6">Activity</TableHead>
                <TableHead className="hidden md:table-cell">Date</TableHead>
                <TableHead className="hidden lg:table-cell">Type</TableHead>
                <TableHead className="pr-4 text-right sm:pr-6">Tokens</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!rows.length ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-28 text-center text-muted-foreground">
                    No usage activity yet.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="min-w-0 max-w-0 pl-4 sm:pl-6">
                      <p className="truncate font-medium">{item.activity}</p>
                      <p className="mt-1 truncate text-xs capitalize text-muted-foreground md:hidden">
                        {new Date(item.date).toLocaleDateString()} · {item.type.replaceAll("_", " ")}
                      </p>
                    </TableCell>
                    <TableCell className="hidden whitespace-nowrap text-muted-foreground md:table-cell">
                      {new Date(item.date).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="hidden capitalize text-muted-foreground lg:table-cell">
                      {item.type.replaceAll("_", " ")}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "whitespace-nowrap pr-4 text-right font-semibold tabular-nums sm:pr-6",
                        item.tokens > 0 && "text-emerald-600 dark:text-emerald-400",
                      )}
                    >
                      {item.tokens > 0 ? "+" : ""}
                      {item.tokens.toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))
              )}
              {showTotal && usageHistory.length ? (
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableCell colSpan={3} className="pl-4 font-semibold sm:pl-6">
                    Total tokens used
                  </TableCell>
                  <TableCell className="pr-4 text-right font-semibold tabular-nums sm:pr-6">
                    {totalUsed.toLocaleString()}
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
          </TabsContent>
          <TabsContent value="graphs" className="mt-0 p-4 sm:p-6">
            {chartData.length ? (
              <div className="h-72 w-full" aria-label="Token usage over time">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="usageSpent" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id="usageAdded" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" opacity={0.12} />
                    <XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={12} />
                    <YAxis tickLine={false} axisLine={false} fontSize={12} tickFormatter={(value) => Number(value).toLocaleString()} />
                    <ChartTooltip
                      contentStyle={{ borderRadius: 12, borderColor: "var(--border)", background: "var(--popover)", color: "var(--popover-foreground)" }}
                      formatter={(value, name) => [Number(value).toLocaleString(), name === "used" ? "Used" : "Added"]}
                    />
                    <Area type="monotone" dataKey="used" stroke="#8b5cf6" strokeWidth={2} fill="url(#usageSpent)" />
                    <Area type="monotone" dataKey="added" stroke="#10b981" strokeWidth={2} fill="url(#usageAdded)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">Usage graphs will appear after your first Token activity.</div>}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
