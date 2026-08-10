import type { ReactNode } from "react";
import { cn } from "@/app/lib/utils";

export function MessageScroller({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("max-h-72 space-y-3 overflow-y-auto overscroll-contain pr-1 [scrollbar-width:thin]", className)}>{children}</div>;
}
