"use client";

import type { LucideIcon } from "lucide-react";
import { Github, Instagram, Linkedin, Share2, Youtube } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/app/lib/utils";

export type SocialItem = { icon: LucideIcon; label: string; href: string };

export const SOCIAL_LINKS: SocialItem[] = [
  { icon: Github, label: "GitHub", href: "https://github.com/shaypat112/Krythiq" },
  { icon: Linkedin, label: "LinkedIn", href: "blank_blank" },
  { icon: Instagram, label: "Instagram", href: "https://www.instagram.com/krythiq_xyz/" },
  { icon: Youtube, label: "Community", href: "https://www.youtube.com/channel/UCUPKWAbludAqG6JB6mbYygg" },
];

export function SocialButton({ className }: { className?: string }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className={cn("relative h-10 w-40", className)} onMouseEnter={() => setVisible(true)} onMouseLeave={() => setVisible(false)} onFocus={() => setVisible(true)} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setVisible(false); }}>
      <motion.div animate={{ opacity: visible ? 0 : 1 }}>
        <Button variant="outline" className="w-40"><Share2 /> Connect</Button>
      </motion.div>
      <motion.div animate={{ width: visible ? 160 : 0 }} className="absolute left-0 top-0 flex h-10 overflow-hidden rounded-md">
        {SOCIAL_LINKS.map((item, index) => (
          <motion.a key={item.label} href={item.href} target="_blank" rel="noreferrer" aria-label={item.label} animate={{ opacity: visible ? 1 : 0, x: visible ? 0 : -16 }} transition={{ delay: visible ? index * 0.04 : 0 }} className="grid h-10 w-10 shrink-0 place-items-center border-r border-white/10 bg-foreground text-background transition hover:opacity-80 last:border-r-0">
            <item.icon className="h-4 w-4" />
          </motion.a>
        ))}
      </motion.div>
    </div>
  );
}
