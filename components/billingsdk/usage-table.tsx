"use client";

import { useCallback } from "react";
import { Download } from "lucide-react";
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
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Activity</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="pr-6 text-right">Tokens</TableHead>
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
                    <TableCell className="max-w-[320px] truncate pl-6 font-medium">
                      {item.activity}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {new Date(item.date).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="capitalize text-muted-foreground">
                      {item.type.replaceAll("_", " ")}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "pr-6 text-right font-semibold tabular-nums",
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
                  <TableCell colSpan={3} className="pl-6 font-semibold">
                    Total tokens used
                  </TableCell>
                  <TableCell className="pr-6 text-right font-semibold tabular-nums">
                    {totalUsed.toLocaleString()}
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
