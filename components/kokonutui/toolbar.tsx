"use client";

/**
 * Adapted from KokonutUI Toolbar by @dorianbaffier.
 * https://kokonutui.com
 */

import { AnimatePresence, motion } from "motion/react";
import * as React from "react";
import { cn } from "@/app/lib/utils";

export type ToolbarIcon = React.ComponentType<{
  className?: string;
  size?: number | string;
  "aria-hidden"?: boolean;
}>;

export interface ToolbarItem {
  id: string;
  title: string;
  icon: ToolbarIcon;
}

interface ToolbarProps {
  items: ToolbarItem[];
  selected?: string;
  defaultSelected?: string;
  className?: string;
  onSelect?: (itemId: string) => void;
  ariaLabel?: string;
}

const transition = { type: "spring" as const, bounce: 0, duration: 0.35 };

export function Toolbar({
  items,
  selected,
  defaultSelected,
  className,
  onSelect,
  ariaLabel = "Toolbar",
}: ToolbarProps) {
  const [internalSelected, setInternalSelected] = React.useState(defaultSelected ?? items[0]?.id ?? "");
  const activeItem = selected ?? internalSelected;

  const select = (itemId: string) => {
    if (selected === undefined) setInternalSelected(itemId);
    onSelect?.(itemId);
  };

  return (
    <div className={cn("max-w-full overflow-x-auto pb-1", className)}>
      <div role="tablist" aria-label={ariaLabel} className="flex w-max items-center gap-1 rounded-xl border border-border bg-muted/40 p-1.5">
        {items.map((item) => {
          const active = activeItem === item.id;
          return (
            <motion.button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={active}
              aria-label={item.title}
              title={item.title}
              onClick={() => select(item.id)}
              animate={{ paddingLeft: active ? 14 : 10, paddingRight: active ? 14 : 10 }}
              transition={transition}
              className={cn(
                "flex h-10 items-center justify-center gap-0 rounded-lg text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/50",
                active ? "gap-2 bg-background text-foreground shadow-sm ring-1 ring-border" : "text-muted-foreground hover:bg-background/60 hover:text-foreground",
              )}
            >
              <item.icon aria-hidden size={18} className={cn("shrink-0", active && "text-sky-500")} />
              <AnimatePresence initial={false}>
                {active ? (
                  <motion.span
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: "auto", opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    transition={transition}
                    className="overflow-hidden whitespace-nowrap"
                  >
                    {item.title}
                  </motion.span>
                ) : null}
              </AnimatePresence>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

export default Toolbar;
