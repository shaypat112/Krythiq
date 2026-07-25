"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FileSearch, FolderGit2, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScanWorkspace } from "./scan-workspace";
import { ReportsIndexClient } from "@/app/reports/components/ReportsIndexClient";
import ProfileClient from "@/app/profile/ProfileClient";

type WorkspaceView = "new" | "history" | "repositories";

export function ScanHub() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedView = searchParams.get("view");
  const view: WorkspaceView = requestedView === "history" || requestedView === "repositories" ? requestedView : "new";

  const selectView = (next: WorkspaceView) => {
    router.replace(next === "new" ? "/scan" : `/scan?view=${next}`, { scroll: false });
  };

  return (
    <div className="space-y-6">
      <nav aria-label="Security workspace views" className="grid w-full grid-cols-3 gap-1.5 rounded-xl border border-border bg-card p-1.5 sm:w-fit">
        <Button className="px-2 sm:px-4" variant={view === "new" ? "default" : "ghost"} onClick={() => selectView("new")} aria-current={view === "new" ? "page" : undefined}>
          <FileSearch /> New scan
        </Button>
        <Button className="px-2 sm:px-4" variant={view === "history" ? "default" : "ghost"} onClick={() => selectView("history")} aria-current={view === "history" ? "page" : undefined}>
          <History /> Scan history
        </Button>
        <Button className="px-2 sm:px-4" variant={view === "repositories" ? "default" : "ghost"} onClick={() => selectView("repositories")} aria-current={view === "repositories" ? "page" : undefined}>
          <FolderGit2 /> Repositories
        </Button>
      </nav>
      {view === "new" ? <ScanWorkspace /> : view === "history" ? <ReportsIndexClient embedded onNewScan={() => selectView("new")} /> : <ProfileClient initialTab="integrations" />}
    </div>
  );
}
