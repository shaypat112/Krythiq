import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { ScanHub } from "./scan-hub";

export const metadata: Metadata = {
  title: "Security workspace - Votrio",
  description: "Run repository security scans and review scan history.",
};

export default function ScanPage() {
  return <Suspense fallback={<div className="space-y-4"><Skeleton className="h-12 w-72" /><Skeleton className="h-80" /></div>}><ScanHub /></Suspense>;
}
