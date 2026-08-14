import { Loader2 } from "lucide-react";

export default function LoadingDraftWorkspace() {
  return <div className="grid min-h-[65svh] place-items-center text-sm text-muted-foreground"><span className="flex items-center gap-2"><Loader2 className="size-4 animate-spin" />Opening repository workspace…</span></div>;
}
