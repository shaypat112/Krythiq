"use client";

import { AnimatePresence, motion } from "motion/react";
import { Download, Filter, RotateCw, Search, Send, Sparkles, Boxes } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Input } from "@/components/ui/input";

export type ScanAction = {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  run: () => void;
};

export function ActionSearchBar({ actions }: { actions: ScanAction[] }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const filtered = useMemo(() => {
    const value = query.trim().toLowerCase();
    return value ? actions.filter((action) => `${action.label} ${action.description}`.toLowerCase().includes(value)) : actions;
  }, [actions, query]);

  useEffect(() => {
    const openCommands = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        document.getElementById("scan-actions")?.focus();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", openCommands);
    return () => window.removeEventListener("keydown", openCommands);
  }, []);

  const run = (action: ScanAction) => {
    action.run();
    setQuery("");
    setOpen(false);
  };

  return (
    <div className="relative z-30 mx-auto w-full max-w-2xl">
      <label htmlFor="scan-actions" className="mb-2 block text-xs font-medium uppercase tracking-wider text-muted-foreground">Ask Krythiq or run an action</label>
      <div className="relative">
        <Input
          id="scan-actions"
          role="combobox"
          aria-expanded={open}
          aria-controls="scan-action-results"
          value={query}
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 150)}
          onChange={(event) => { setQuery(event.target.value); setOpen(true); setActiveIndex(-1); }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") { event.preventDefault(); setActiveIndex((index) => Math.min(index + 1, filtered.length - 1)); }
            if (event.key === "ArrowUp") { event.preventDefault(); setActiveIndex((index) => Math.max(index - 1, 0)); }
            if (event.key === "Enter" && activeIndex >= 0 && filtered[activeIndex]) { event.preventDefault(); run(filtered[activeIndex]); }
            if (event.key === "Escape") setOpen(false);
          }}
          placeholder="Search findings, explore the stack, export results…"
          className="h-11 rounded-xl pr-24"
        />
        <div className="pointer-events-none absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-2 text-muted-foreground">
          {query ? <Send className="h-4 w-4" /> : <Search className="h-4 w-4" />}
          <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px]">⌘K</kbd>
        </div>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div id="scan-action-results" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="absolute mt-2 w-full overflow-hidden rounded-xl border border-border bg-popover p-1.5 shadow-2xl">
            {filtered.length ? filtered.map((action, index) => (
              <button key={action.id} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => run(action)} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition ${activeIndex === index ? "bg-accent" : "hover:bg-accent/70"}`}>
                <span className="text-sky-400">{action.icon}</span>
                <span className="min-w-0 flex-1"><span className="block text-sm font-medium">{action.label}</span><span className="block truncate text-xs text-muted-foreground">{action.description}</span></span>
              </button>
            )) : <p className="px-3 py-6 text-center text-sm text-muted-foreground">No matching scan action.</p>}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export const scanActionIcons = {
  intelligence: <Sparkles className="h-4 w-4" />,
  cloud: <Boxes className="h-4 w-4" />,
  filter: <Filter className="h-4 w-4" />,
  export: <Download className="h-4 w-4" />,
  reset: <RotateCw className="h-4 w-4" />,
};
