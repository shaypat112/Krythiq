"use client";

import { useMemo } from "react";
import { BarChart3, ReceiptText } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type BillingInvoice = {
  id: string;
  month: string;
  amount: number;
  status: string;
};

export function InvoiceAnalytics({ invoices }: { invoices: BillingInvoice[] }) {
  const chartData = useMemo(
    () => [...invoices].reverse().map((invoice) => ({ month: invoice.month, amount: invoice.amount })),
    [invoices],
  );

  return (
    <Card className="overflow-hidden">
      <CardHeader className="sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1.5">
          <CardTitle>Billing history</CardTitle>
          <CardDescription>Stripe test-mode invoices and spending over time.</CardDescription>
        </div>
        <span className="text-xs text-muted-foreground">{invoices.length} invoices</span>
      </CardHeader>
      <CardContent className="p-0">
        <Tabs defaultValue="table" className="gap-0">
          <div className="border-b px-4 pb-4 sm:px-6">
            <TabsList className="grid w-full grid-cols-2 sm:w-64">
              <TabsTrigger value="table"><ReceiptText className="size-4" />Table</TabsTrigger>
              <TabsTrigger value="graphs"><BarChart3 className="size-4" />Graphs</TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="table" className="mt-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-full pl-4 sm:pl-6">Invoice</TableHead>
                  <TableHead className="hidden sm:table-cell">Status</TableHead>
                  <TableHead className="pr-4 text-right sm:pr-6">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="min-w-0 max-w-0 pl-4 sm:pl-6">
                      <p className="truncate font-medium">{invoice.month}</p>
                      <p className="mt-1 truncate text-xs capitalize text-muted-foreground sm:hidden">{invoice.status}</p>
                    </TableCell>
                    <TableCell className="hidden capitalize text-muted-foreground sm:table-cell">{invoice.status}</TableCell>
                    <TableCell className="whitespace-nowrap pr-4 text-right font-semibold tabular-nums sm:pr-6">${invoice.amount.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>
          <TabsContent value="graphs" className="mt-0 p-4 sm:p-6">
            <div className="h-72 w-full" aria-label="Invoice spending over time">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" opacity={0.12} />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis tickLine={false} axisLine={false} fontSize={12} tickFormatter={(value) => `$${value}`} />
                  <Tooltip
                    cursor={{ fill: "currentColor", opacity: 0.05 }}
                    contentStyle={{ borderRadius: 12, borderColor: "var(--border)", background: "var(--popover)", color: "var(--popover-foreground)" }}
                    formatter={(value) => [`$${Number(value).toFixed(2)}`, "Amount"]}
                  />
                  <Bar dataKey="amount" fill="#38bdf8" radius={[7, 7, 2, 2]} maxBarSize={52} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
