"use client";

import * as React from "react";
import { cn } from "@/app/lib/utils";

export function SpotlightCard({ className, children }: React.PropsWithChildren<{ className?: string }>) {
  const [position, setPosition] = React.useState({ x: 50, y: 0 });

  return (
    <article
      className={cn("group relative overflow-hidden rounded-[1.75rem] border border-border/80 bg-card/75 shadow-lg shadow-black/5 transition-colors duration-300 hover:border-violet-300/35", className)}
      onPointerMove={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        setPosition({
          x: ((event.clientX - rect.left) / rect.width) * 100,
          y: ((event.clientY - rect.top) / rect.height) * 100,
        });
      }}
      onPointerLeave={() => setPosition({ x: 50, y: 0 })}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{ background: `radial-gradient(320px circle at ${position.x}% ${position.y}%, rgba(167,139,250,.12), transparent 70%)` }}
      />
      <div className="relative h-full">{children}</div>
    </article>
  );
}
