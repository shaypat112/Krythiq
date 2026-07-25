
import type { LucideIcon } from "lucide-react";

export function Eyebrow({
  icon: Icon,
  children,
  tone = "default",
}: {
  icon?: LucideIcon;
  children: React.ReactNode;
  tone?: "default" | "amber";
}) {
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-[11px] uppercase tracking-[0.2em] ${
        tone === "amber"
          ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
          : "border-border bg-card text-muted-foreground"
      }`}
    >
      {Icon ? <Icon className="h-3 w-3" /> : null}
      {children}
    </div>
  );
}
