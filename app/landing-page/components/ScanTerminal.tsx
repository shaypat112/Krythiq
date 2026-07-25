"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import { Terminal, RefreshCw } from "lucide-react";

type Severity = "info" | "high" | "medium" | "low" | "success" | "error" | "muted";

type Line = {
  id: number;
  kind: "input" | "output";
  text: string;
  severity: Severity;
};

const PROMPT = "guest@votrio:~/project$";

const COMMANDS = [
  "votrio init",
  "votrio scan --sandbox",
  "votrio fix --generate",
  "help",
  "clear",
  "whoami",
];

const severityColor: Record<Severity, string> = {
  info: "text-blue-400",
  high: "text-red-400",
  medium: "text-amber-400",
  low: "text-amber-400",
  success: "text-emerald-400",
  error: "text-red-400",
  muted: "text-muted-foreground",
};

const sleep = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

let idCounter = 0;
const nextId = () => (idCounter += 1);

export function ScanTerminal() {
  const [lines, setLines] = useState<Line[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [busy, setBusy] = useState(true);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const cancelledRef = useRef(false);
  const busyRef = useRef(true);
  const scannedRef = useRef(false);
  const historyRef = useRef<string[]>([]);
  const historyIndexRef = useRef(0);

  const inView = useInView(containerRef, { once: true, margin: "-100px" });

  const setBusyBoth = (value: boolean) => {
    busyRef.current = value;
    setBusy(value);
  };

  const push = useCallback((text: string, kind: Line["kind"] = "output", severity: Severity = "muted") => {
    setLines((prev) => [...prev, { id: nextId(), kind, text, severity }]);
  }, []);



  const printLines = useCallback(
    async (entries: { text: string; severity?: Severity; delay?: number }[]) => {
      for (const entry of entries) {
        if (cancelledRef.current) return;
        await sleep(entry.delay ?? 400);
        if (cancelledRef.current) return;
        push(entry.text, "output", entry.severity ?? "muted");
      }
    },
    [push],
  );

  const runCommand = useCallback(
    async (raw: string) => {
      const cmd = raw.trim();
      push(`${PROMPT} ${cmd}`, "input", "muted");
      if (!cmd) return;

      historyRef.current.push(cmd);
      historyIndexRef.current = historyRef.current.length;

      const normalized = cmd.toLowerCase().replace(/\s+/g, " ");

      if (normalized === "help") {
        await printLines([
          { text: "Available commands:", delay: 150 },
          { text: "  votrio init            set up Votrio in this repository", delay: 90 },
          { text: "  votrio scan --sandbox  run a full security scan", delay: 90 },
          { text: "  votrio fix --generate  generate patches for found issues", delay: 90 },
          { text: "  whoami                 show the current session", delay: 90 },
          { text: "  clear                  clear the terminal", delay: 90 },
        ]);
        return;
      }

      if (normalized === "clear") {
        setLines([]);
        return;
      }

      if (normalized === "whoami") {
        await printLines([{ text: "guest @ votrio-sandbox (read-only scan)", delay: 200 }]);
        return;
      }

      if (normalized === "votrio init") {
        await printLines([
          { text: "Initializing Votrio in ~/project", severity: "info", delay: 300 },
          { text: "Detected framework: Next.js, TypeScript", severity: "info", delay: 500 },
          { text: "Creating .votrio/config.yml", severity: "info", delay: 450 },
          { text: "✓ Ready — run `votrio scan --sandbox` to analyze this repository", severity: "success", delay: 500 },
        ]);
        return;
      }

      if (normalized.startsWith("votrio scan")) {
        await printLines([
          { text: "Preparing isolated sandbox…", severity: "info", delay: 300 },
          { text: "Tracing dependency graph across 214 files…", severity: "info", delay: 700 },
          { text: "● HIGH — Privilege escalation via admin token fallback", severity: "high", delay: 650 },
          { text: "● MEDIUM — Unsanitized SQL builder reachable from support tools", severity: "medium", delay: 500 },
          { text: "● LOW — Webhook retry logic leaks internal error detail", severity: "low", delay: 500 },
          { text: "3 findings ranked by exploitability. Run `votrio fix --generate` to patch.", delay: 550 },
        ]);
        scannedRef.current = true;
        return;
      }

      if (normalized.startsWith("votrio fix")) {
        if (!scannedRef.current) {
          await printLines([{ text: "No findings yet — run `votrio scan --sandbox` first.", severity: "error", delay: 250 }]);
          return;
        }
        await printLines([
          { text: "Generating patch guidance for 3 findings…", severity: "info", delay: 400 },
          { text: "Validating fixes in sandbox…", severity: "info", delay: 700 },
          { text: "✓ 3/3 fixes verified — ready for review", severity: "success", delay: 600 },
        ]);
        return;
      }

      if (normalized.startsWith("votrio")) {
        await printLines([{ text: "unknown subcommand — try `help`", severity: "error", delay: 200 }]);
        return;
      }

      await printLines([{ text: `command not found: ${cmd} — type \`help\``, severity: "error", delay: 200 }]);
    },
    [push, printLines],
  );

  const typeIntoInput = useCallback(
    async (text: string) => {
      for (let i = 0; i <= text.length; i += 1) {
        if (cancelledRef.current) return;
        setInputValue(text.slice(0, i));
        await sleep(26 + Math.random() * 40);
      }
      await sleep(260);
      if (cancelledRef.current) return;
      setInputValue("");
      await runCommand(text);
    },
    [runCommand],
  );

  const playIntro = useCallback(async () => {
    cancelledRef.current = false;
    setBusyBoth(true);
    setLines([]);
    scannedRef.current = false;
    historyRef.current = [];
    historyIndexRef.current = 0;

    push("Votrio CLI v1.2.0 — type `help` to see available commands", "output", "muted");
    await sleep(500);
    if (cancelledRef.current) return;
    await typeIntoInput("votrio init");
    if (cancelledRef.current) return;
    await sleep(450);
    if (cancelledRef.current) return;
    await typeIntoInput("votrio scan --sandbox");
    if (cancelledRef.current) return;

    setBusyBoth(false);
    inputRef.current?.focus();
  }, [push, typeIntoInput]);

  useEffect(() => {
    if (!inView) return;
    playIntro();
    return () => {
      cancelledRef.current = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView]);

  const handleSubmit = async () => {
    if (busyRef.current) return;
    const value = inputValue;
    setInputValue("");
    setBusyBoth(true);
    await runCommand(value);
    if (!cancelledRef.current) setBusyBoth(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (busy) return;
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      const hist = historyRef.current;
      if (!hist.length) return;
      historyIndexRef.current = Math.max(0, historyIndexRef.current - 1);
      setInputValue(hist[historyIndexRef.current] ?? "");
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const hist = historyRef.current;
      historyIndexRef.current = Math.min(hist.length, historyIndexRef.current + 1);
      setInputValue(hist[historyIndexRef.current] ?? "");
      return;
    }
    if (e.key === "Tab") {
      e.preventDefault();
      const match = COMMANDS.find((c) => c.startsWith(inputValue) && c !== inputValue);
      if (match) setInputValue(match);
    }
  };

  const restart = () => {
    cancelledRef.current = true;
    window.setTimeout(() => playIntro(), 60);
  };

  return (
    <div
      ref={containerRef}
      className="font-mono text-sm"
      onClick={() => !busy && inputRef.current?.focus()}
    >
      <div className="mb-3 flex items-center justify-between text-muted-foreground">
        <div className="flex items-center gap-2">
          <Terminal className="h-3.5 w-3.5" />
          <span className="text-xs">interactive session — try typing a command</span>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            restart();
          }}
          className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-1 text-[11px] text-muted-foreground transition hover:text-foreground"
        >
          <RefreshCw className="h-3 w-3" />
          restart
        </button>
      </div>

      <div className="max-h-[280px] min-h-[220px] overflow-y-auto pr-1">
        <AnimatePresence initial={false}>
          {lines.map((line) => (
            <motion.div
              key={line.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15 }}
              className={line.kind === "input" ? "pl-0" : "border-l-2 border-border pl-3"}
            >
              <p className={line.kind === "input" ? "text-foreground/80" : severityColor[line.severity]}>
                {line.text}
              </p>
            </motion.div>
          ))}
        </AnimatePresence>

        <div className="flex items-center gap-2 pt-1">
          <span className="shrink-0 text-foreground/60">{PROMPT}</span>
          <input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={busy}
            spellCheck={false}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            className="min-w-0 flex-1 bg-transparent text-foreground caret-amber-400 outline-none disabled:opacity-70"
            aria-label="Votrio terminal input"
          />
        </div>
        <div ref={bottomRef} />
      </div>

      {!busy && (
        <p className="mt-2 text-[10px] text-muted-foreground/70">
          ↑ / ↓ history · Tab to autocomplete · try &quot;votrio scan --sandbox&quot;
        </p>
      )}
    </div>
  );
}
