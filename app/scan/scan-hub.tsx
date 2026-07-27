"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FileSearch, FolderGit2, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScanWorkspace } from "./scan-workspace";
import { ReportsIndexClient } from "@/app/reports/components/ReportsIndexClient";
import ProfileClient from "@/app/profile/ProfileClient";
import { createClient } from "@/app/lib/supabase";

type WorkspaceView = "new" | "history" | "repositories";

export function ScanHub() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedView = searchParams.get("view");
  const view: WorkspaceView = requestedView === "history" || requestedView === "repositories" ? requestedView : "new";

  const selectView = async (next: WorkspaceView) => {
    if (next !== "new") {
      const { data } = await createClient().auth.getSession();
      if (!data.session) {
        router.push("/auth?next=/scan");
        return;
      }
    }
    router.replace(next === "new" ? "/scan" : `/scan?view=${next}`, { scroll: false });
  };

  return (
    <div className="space-y-7">
      <nav aria-label="Security workspace views" className="grid w-full grid-cols-3 gap-1 rounded-2xl border border-white/10 bg-card/70 p-1.5 shadow-lg backdrop-blur-xl sm:w-fit">
        <Button className="h-9 rounded-xl px-2 sm:px-4" variant={view === "new" ? "default" : "ghost"} onClick={() => void selectView("new")} aria-current={view === "new" ? "page" : undefined}>
          <FileSearch /> New scan
        </Button>
        <Button className="h-9 rounded-xl px-2 sm:px-4" variant={view === "history" ? "default" : "ghost"} onClick={() => void selectView("history")} aria-current={view === "history" ? "page" : undefined}>
          <History /> Scan history
        </Button>
        <Button className="h-9 rounded-xl px-2 sm:px-4" variant={view === "repositories" ? "default" : "ghost"} onClick={() => void selectView("repositories")} aria-current={view === "repositories" ? "page" : undefined}>
          <FolderGit2 /> Repositories
        </Button>
      </nav>
      {view === "new" ? <ScanWorkspace /> : view === "history" ? <ReportsIndexClient embedded onNewScan={() => void selectView("new")} /> : <ProfileClient initialTab="integrations" />}
    </div>
  );
}
