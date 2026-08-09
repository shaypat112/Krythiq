import type { Metadata } from "next";
import { ReportsIndexClient } from "@/app/reports/components/ReportsIndexClient";

export const metadata: Metadata = {
  title: "Scan history - Krythiq",
  description: "Open previous repository scans and their saved results.",
};

export default function ScanHistoryPage() {
  return <ReportsIndexClient embedded />;
}
