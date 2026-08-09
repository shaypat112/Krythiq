"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FileSearch, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScanWorkspace } from "./scan-workspace";
import { ReportsIndexClient } from "@/app/reports/components/ReportsIndexClient";

type WorkspaceView = "new" | "history";

export function ScanHub() {
  const searchParams = useSearchParams();
  const requestedView = searchParams.get("view");
  const view: WorkspaceView = requestedView === "history" ? requestedView : "new";

  return (
    <div className="space-y-6">
      <nav aria-label="Security workspace views" className="grid w-full grid-cols-2 gap-1.5 rounded-xl border border-border bg-card p-1.5 sm:w-fit">
        <Button asChild className="px-2 sm:px-4" variant={view === "new" ? "default" : "ghost"}>
          <Link href="/scan" scroll={false} aria-current={view === "new" ? "page" : undefined}>
            <FileSearch /> New scan
          </Link>
        </Button>
        <Button asChild className="px-2 sm:px-4" variant={view === "history" ? "default" : "ghost"}>
          <Link href="/scan?view=history" scroll={false} aria-current={view === "history" ? "page" : undefined}>
            <History /> Scan history
          </Link>
        </Button>
      </nav>
      {view === "new" ? <ScanWorkspace /> : <ReportsIndexClient embedded onNewScan={() => window.location.assign("/scan")} />}
    </div>
  );
}
