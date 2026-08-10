import type { ReactNode } from "react";
import { Paperclip, X } from "lucide-react";
import { cn } from "@/app/lib/utils";
import { Button } from "@/components/ui/button";

export function Attachment({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("overflow-hidden rounded-2xl border border-border bg-muted/30", className)}>{children}</div>;
}

export function AttachmentHeader({ name, onRemove }: { name: string; onRemove?: () => void }) {
  return <div className="flex items-center gap-2 border-b border-border px-3 py-2 text-xs text-muted-foreground"><Paperclip className="size-3.5" /><span className="min-w-0 flex-1 truncate">{name}</span>{onRemove ? <Button type="button" size="icon-sm" variant="ghost" aria-label="Remove attachment" onClick={onRemove}><X /></Button> : null}</div>;
}
