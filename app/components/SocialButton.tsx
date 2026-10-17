"use client";

import { Github, Instagram, Share2, Youtube } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/app/lib/utils";

const SOCIAL_LINKS = [
  { icon: Github, label: "GitHub", href: "https://github.com/shaypat112/Krythiq" },
  { icon: Instagram, label: "Instagram", href: "https://www.instagram.com/krythiq_xyz/" },
  { icon: Youtube, label: "Community", href: "https://www.youtube.com/channel/UCUPKWAbludAqG6JB6mbYygg" },
];

export function SocialButton({ className }: { className?: string }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <Button variant="ghost" aria-expanded={visible} onClick={() => setVisible((current) => !current)}>
        <Share2 /> Connect
      </Button>
      {visible ? <nav aria-label="Social links" className="flex items-center gap-1">
        {SOCIAL_LINKS.map(({ icon: Icon, label, href }) => (
          <Button key={label} asChild size="icon" variant="ghost">
            <a href={href} target="_blank" rel="noreferrer" aria-label={label}><Icon /></a>
          </Button>
        ))}
      </nav> : null}
    </div>
  );
}
