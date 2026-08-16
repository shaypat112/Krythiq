"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/app/lib/utils";

type DocumentationCodeBlockProps = {
  code: string;
  label?: string;
  highlight?: string[];
  className?: string;
};

export function DocumentationCodeBlock({ code, label, highlight, className }: DocumentationCodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lines = code.split("\n");

  useEffect(() => () => {
    if (resetTimer.current) clearTimeout(resetTimer.current);
  }, []);

  const copy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    if (resetTimer.current) clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={cn("group overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950", className)}>
      {label && <div className="border-b border-zinc-800 bg-zinc-900/50 px-4 py-2 font-mono text-[11px] text-zinc-500">{label}</div>}
      <div className="relative min-w-0 px-4 py-3.5 pr-28">
        <button
          type="button"
          onClick={copy}
          aria-label={copied ? "Copied to clipboard" : "Copy to clipboard"}
          className={cn(
            "absolute right-3 top-3 flex h-8 min-w-8 items-center justify-center gap-1.5 rounded-md border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-400 shadow-sm transition-all duration-200 hover:border-zinc-600 hover:text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400",
            copied && "border-emerald-800/70 bg-emerald-950/70 text-emerald-300",
          )}
        >
          {copied ? <Check className="size-4 animate-in zoom-in-50 duration-200" /> : <Copy className="size-4" />}
          <span className={cn("overflow-hidden transition-all duration-200", copied ? "max-w-14 opacity-100" : "max-w-0 opacity-0")}>Copied</span>
        </button>
        <pre className="overflow-x-auto font-mono text-sm text-zinc-200">
          {lines.map((line, index) => (
            <code
              key={`${index}-${line}`}
              className={cn(
                "block min-h-5 whitespace-pre",
                line.startsWith("#") && "text-zinc-500",
                (line.startsWith("→") || line.startsWith("✓") || line.startsWith("●")) && "text-zinc-200",
                highlight?.some((value) => line.includes(value)) && "text-amber-300",
              )}
            >
              {line || " "}
            </code>
          ))}
        </pre>
        <span className="sr-only" aria-live="polite">{copied ? "Copied to clipboard" : ""}</span>
      </div>
    </div>
  );
}
