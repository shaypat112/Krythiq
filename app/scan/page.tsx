import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { ScanWorkspace } from "./scan-workspace";

export const metadata: Metadata = {
  title: "Security workspace - Krythiq",
  description: "Scan a GitHub repository or individual source file, explore its technology stack, and review security findings.",
};

export default function ScanPage() {
  return <Suspense fallback={<div className="space-y-4"><Skeleton className="h-12 w-72" /><Skeleton className="h-80" /></div>}><ScanWorkspace /></Suspense>;
}
