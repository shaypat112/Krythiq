"use client";

import { Linkedin, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/app/lib/utils";

type LinkedInScanShareProps = {
  repository: string;
  severity: string;
  issues: number;
  score: number;
  reportPath?: string;
  compact?: boolean;
  className?: string;
};

function buildTemplate(repository: string, severity: string, issues: number, score: number, reportUrl: string) {
  return [
    `I just reviewed ${repository} with Krythiq.`,
    "",
    `Risk score: ${score}/100`,
    `Findings: ${issues}`,
    `Highest severity: ${severity.toLowerCase()}`,
    "",
    `View my Krythiq scan: ${reportUrl}`,
    "",
    "#ApplicationSecurity #DevSecOps #SoftwareEngineering",
  ].join("\n");
}

export function LinkedInScanShare({ repository, severity, issues, score, reportPath, compact = false, className }: LinkedInScanShareProps) {
  const share = async () => {
    const path = reportPath ?? `/reports/${encodeURIComponent(repository)}`;
    const reportUrl = new URL(path, window.location.origin).toString();
    const linkedInWindow = window.open("about:blank", "krythiq-linkedin-share", "popup,width=720,height=760,noreferrer");
    try {
      await navigator.clipboard.writeText(buildTemplate(repository, severity, issues, score, reportUrl));
      toast.success("Post template copied. Paste it into LinkedIn.");
    } catch {
      toast.info("LinkedIn opened. Add your scan summary before posting.");
    }
    const shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(reportUrl)}`;
    if (linkedInWindow) linkedInWindow.location.href = shareUrl;
    else window.open(shareUrl, "_blank", "noopener,noreferrer");
  };

  return <Tooltip><TooltipTrigger asChild><Button type="button" size={compact ? "icon-sm" : "sm"} variant="outline" className={cn("border-[#0a66c2]/30 text-[#0a66c2] hover:bg-[#0a66c2]/10 hover:text-[#0a66c2]", className)} onClick={() => void share()} aria-label="Share scan on LinkedIn">{compact ? <Linkedin /> : <><Share2 />Share on LinkedIn</>}</Button></TooltipTrigger><TooltipContent>Copies a ready-to-post summary, then opens LinkedIn.</TooltipContent></Tooltip>;
}
