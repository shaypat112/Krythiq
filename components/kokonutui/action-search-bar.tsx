"use client";

import { AnimatePresence, motion } from "motion/react";
import { Search } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { Input } from "@/components/ui/input";

export type ScanAction = {
  id: string;
  label: string;
  description: string;
  shortcut?: string;
  icon: ReactNode;
  onSelect: () => void;
};

export function ActionSearchBar({ actions }: { actions: ScanAction[] }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return needle
      ? actions.filter((action) => `${action.label} ${action.description}`.toLowerCase().includes(needle))
      : actions;
  }, [actions, query]);

  return (
    <div className="relative z-20 w-full">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          aria-expanded={open}
          className="h-11 rounded-xl border-white/10 bg-background/70 pl-10 pr-20 shadow-sm backdrop-blur"
          onBlur={() => window.setTimeout(() => setOpen(false), 150)}
          onChange={(event) => { setQuery(event.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Quick action: scan a repo, inspect one file, view history…"
          role="combobox"
          value={query}
        />
        <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-md border border-border bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">⌘ K</kbd>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="absolute mt-2 w-full overflow-hidden rounded-xl border border-border bg-popover p-1.5 shadow-2xl"
            exit={{ opacity: 0, y: -6 }}
            initial={{ opacity: 0, y: -6 }}
          >
            {matches.length ? matches.map((action) => (
              <button
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-muted"
                key={action.id}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => { action.onSelect(); setOpen(false); setQuery(""); }}
                type="button"
              >
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-muted text-foreground">{action.icon}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{action.label}</span>
                  <span className="block truncate text-xs text-muted-foreground">{action.description}</span>
                </span>
                {action.shortcut && <kbd className="text-[10px] text-muted-foreground">{action.shortcut}</kbd>}
              </button>
            )) : <p className="px-3 py-5 text-center text-sm text-muted-foreground">No matching scan action.</p>}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
