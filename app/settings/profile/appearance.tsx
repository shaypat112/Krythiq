"use client";

import { Moon, SunMedium } from "lucide-react";
import { useTheme } from "@/app/components/theme-provider";
import { SectionCard, Toggle } from "./primitives";

export function AppearanceSection() {
  const { theme, setTheme } = useTheme();
  const isLight = theme === "light";

  return (
    <SectionCard
      title="Appearance"
      description="Choose the color mode that feels best while reviewing repositories."
    >
      <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-background via-muted/40 to-background p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">Theme mode</p>
            <p className="text-sm text-muted-foreground">
              Switch between the focused dark workspace and a brighter light
              review mode.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-border bg-background/80 p-1">
            <button
              type="button"
              onClick={() => setTheme("dark")}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                !isLight
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className="inline-flex items-center gap-1.5">
                <Moon className="h-3.5 w-3.5" />
                Dark
              </span>
            </button>
            <button
              type="button"
              onClick={() => setTheme("light")}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                isLight
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className="inline-flex items-center gap-1.5">
                <SunMedium className="h-3.5 w-3.5" />
                Light
              </span>
            </button>
          </div>
        </div>
      </div>

    </SectionCard>
  );
}
