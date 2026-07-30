import type { UsageItem } from "@/components/billingsdk/usage-table";

export type TokenTransaction = {
  id: string;
  amount: number;
  transaction_type: string;
  description: string;
  created_at: string;
};

export function toUsageItems(transactions: TokenTransaction[]): UsageItem[] {
  return transactions.map((transaction) => ({
    id: transaction.id,
    activity: transaction.description,
    date: transaction.created_at,
    type: transaction.transaction_type,
    tokens: Number(transaction.amount),
  }));
}

export function hasPaymentFailure(status?: string | null) {
  return ["past_due", "unpaid", "incomplete", "incomplete_expired"].includes(
    status ?? "",
  );
}
