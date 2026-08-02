"use client";

import { CircleHelp } from "lucide-react";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/app/lib/utils";

export function HelpTooltip({
  children,
  side = "top",
  contentClassName,
}: {
  children: React.ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  contentClassName?: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="inline-flex rounded-full text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="More information"
        >
          <CircleHelp className="h-3.5 w-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent side={side} className={cn("max-w-64 leading-5", contentClassName)}>
        {children}
      </TooltipContent>
    </Tooltip>
  );
}
