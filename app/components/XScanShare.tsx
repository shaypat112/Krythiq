"use client";

import { IconBrandX } from "@tabler/icons-react";
import { Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/app/lib/utils";

type XScanShareProps = {
  repository: string;
  severity: string;
  issues: number;
  score: number;
  reportPath?: string;
  compact?: boolean;
  className?: string;
};

function buildPost(repository: string, severity: string, issues: number, score: number) {
  const safeRepository = repository.length > 80 ? `${repository.slice(0, 77)}…` : repository;
  return `I reviewed ${safeRepository} with Krythiq. Risk score: ${score}/100 · ${issues} findings · Highest severity: ${severity.toLowerCase()}. #ApplicationSecurity #DevSecOps`;
}

export function XScanShare({ repository, severity, issues, score, reportPath, compact = false, className }: XScanShareProps) {
  const share = () => {
    const path = reportPath ?? `/reports/${encodeURIComponent(repository)}`;
    const reportUrl = new URL(path, window.location.origin).toString();
    const params = new URLSearchParams({
      text: buildPost(repository, severity, issues, score),
      url: reportUrl,
    });
    window.open(`https://x.com/intent/post?${params.toString()}`, "krythiq-x-share", "popup,width=720,height=640,noreferrer");
  };

  return <Tooltip><TooltipTrigger asChild><Button type="button" size={compact ? "icon-sm" : "sm"} variant="outline" className={cn("border-foreground/20 text-foreground hover:bg-foreground hover:text-background", className)} onClick={share} aria-label="Share scan on X">{compact ? <IconBrandX /> : <><Share2 />Share on X</>}</Button></TooltipTrigger><TooltipContent>Share this scan report on your X profile.</TooltipContent></Tooltip>;
}

