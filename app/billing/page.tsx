import { BillingClient } from "./BillingClient";
import { readScanTier } from "@/app/lib/scanner/scan-levels";

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string; tier?: string }>;
}) {
  const query = await searchParams;
  const tier = readScanTier(query.tier);
  return <BillingClient insufficientScanTier={query.reason === "insufficient_tokens" ? tier : null} />;
}
