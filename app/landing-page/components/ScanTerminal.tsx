"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { motion, AnimatePresence, useInView, useReducedMotion } from "framer-motion";
import { Terminal, RefreshCw } from "lucide-react";

type Severity = "info" | "high" | "medium" | "low" | "success" | "error" | "muted";

type Line = {
  id: number;
  kind: "input" | "output";
  text: string;
  severity: Severity;
  code?: boolean;
  typing?: boolean;
};

const PROMPT = "guest@krythiq:~/project$";

const COMMANDS = [
  "krythiq init",
  "krythiq scan --format json",
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

function SyntaxText({ text }: { text: string }) {
  const tokens = text.split(/(\b(?:export|async|function|const|await|if|throw|new|return)\b|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|\/\/.*|[{}()[\].?:;])/g);
  return <>{tokens.map((token, index) => {
    const className = /^(export|async|function|const|await|if|throw|new|return)$/.test(token)
      ? "text-fuchsia-400"
      : /^["']/.test(token) ? "text-emerald-400"
        : /^\/\//.test(token) ? "text-slate-500"
          : /^[{}()[\].?:;]$/.test(token) ? "text-cyan-300" : "text-slate-200";
    return <span className={className} key={`${index}-${token}`}>{token}</span>;
  })}</>;
}

export function ScanTerminal() {
  const [lines, setLines] = useState<Line[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [busy, setBusy] = useState(true);
  const reducedMotion = useReducedMotion();

  const containerRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const cancelledRef = useRef(false);
  const busyRef = useRef(true);
  const historyRef = useRef<string[]>([]);
  const historyIndexRef = useRef(0);
  const visibleRef = useRef(false);
  const startedRef = useRef(false);

  const inView = useInView(containerRef, { margin: "-100px" });

  useEffect(() => { visibleRef.current = inView; }, [inView]);

  const waitUntilVisible = useCallback(async () => {
    while (!visibleRef.current && !cancelledRef.current) await sleep(120);
  }, []);

  const setBusyBoth = (value: boolean) => {
    busyRef.current = value;
    setBusy(value);
  };

  const push = useCallback((text: string, kind: Line["kind"] = "output", severity: Severity = "muted") => {
    setLines((prev) => [...prev, { id: nextId(), kind, text, severity }]);
  }, []);



  const printLines = useCallback(
    async (entries: { text: string; severity?: Severity; delay?: number; type?: boolean; code?: boolean }[]) => {
      for (const entry of entries) {
        if (cancelledRef.current) return;
        await waitUntilVisible();
        await sleep(reducedMotion ? 0 : entry.delay ?? 400);
        if (cancelledRef.current) return;
        if (!entry.type || reducedMotion) {
          setLines((prev) => [...prev, { id: nextId(), kind: "output", text: entry.text, severity: entry.severity ?? "muted", code: entry.code }]);
          continue;
        }
        const id = nextId();
        setLines((prev) => [...prev, { id, kind: "output", text: "", severity: entry.severity ?? "muted", code: entry.code, typing: true }]);
        for (let index = 1; index <= entry.text.length; index += 1) {
          if (cancelledRef.current) return;
          await waitUntilVisible();
          setLines((prev) => prev.map((line) => line.id === id ? { ...line, text: entry.text.slice(0, index), typing: index < entry.text.length } : line));
          await sleep(12);
        }
      }
    },
    [reducedMotion, waitUntilVisible],
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
          { text: "  krythiq init            set up Krythiq in this repository", delay: 90 },
          { text: "  krythiq scan            run available security engines", delay: 90 },
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
        await printLines([{ text: "guest @ krythiq-sandbox (read-only scan)", delay: 200 }]);
        return;
      }

      if (normalized === "krythiq init") {
        await printLines([
          { text: "Initializing Krythiq in ~/project", severity: "info", delay: 300 },
          { text: "Detected framework: Next.js, TypeScript", severity: "info", delay: 500 },
          { text: "Creating krythiq.config.mjs", severity: "info", delay: 450 },
          { text: "✓ Ready — run `krythiq scan` to analyze this repository", severity: "success", delay: 500 },
        ]);
        return;
      }

      if (normalized.startsWith("krythiq scan")) {
        await printLines([
          { text: "Discovering source files…", severity: "info", delay: 300 },
          { text: "Running custom rules, Semgrep, and npm audit when available…", severity: "info", delay: 700 },
          { text: "● HIGH — CUSTOM_DANGEROUS_CALL src/example.ts:12", severity: "high", delay: 650 },
          { text: "1 issue detected. Review the source before changing it.", delay: 550 },
        ]);
        return;
      }

      if (normalized.startsWith("krythiq")) {
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
        await waitUntilVisible();
        setInputValue(text.slice(0, i));
        await sleep(reducedMotion ? 0 : 26 + Math.random() * 40);
      }
      await sleep(260);
      if (cancelledRef.current) return;
      setInputValue("");
      await runCommand(text);
    },
    [reducedMotion, runCommand, waitUntilVisible],
  );

  const playIntro = useCallback(async () => {
    cancelledRef.current = false;
    setBusyBoth(true);
    setLines([]);
    historyRef.current = [];
    historyIndexRef.current = 0;

    push("Krythiq CLI v0.1.1 — type `help` to see available commands", "output", "muted");
    await sleep(500);
    if (cancelledRef.current) return;
    await typeIntoInput("krythiq init");
    if (cancelledRef.current) return;
    await sleep(450);
    if (cancelledRef.current) return;
    await typeIntoInput("krythiq scan --format json");
    if (cancelledRef.current) return;

    setBusyBoth(false);
    inputRef.current?.focus();
  }, [push, typeIntoInput]);

  useEffect(() => {
    if (!inView || startedRef.current) return;
    startedRef.current = true;
    void playIntro();
    return () => {
      visibleRef.current = false;
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
    startedRef.current = true;
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

      <div className="max-h-[300px] min-h-[260px] overflow-y-auto pr-1 text-xs sm:text-sm">
        <AnimatePresence initial={false}>
          {lines.map((line) => (
            <motion.div
              key={line.id}
              initial={reducedMotion ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15 }}
              className={line.kind === "input" ? "pl-0" : "border-l-2 border-border pl-3"}
            >
              <p className={line.kind === "input" ? "text-foreground/80" : severityColor[line.severity]}>
                {line.code ? <SyntaxText text={line.text} /> : line.text}
                {line.typing ? <span aria-hidden="true" className="ml-0.5 inline-block h-[1em] w-1.5 animate-pulse bg-amber-400 motion-reduce:animate-none" /> : null}
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
            aria-label="Krythiq terminal input"
          />
        </div>
        <div ref={bottomRef} />
      </div>

      {!busy && (
        <p className="mt-2 text-[10px] text-muted-foreground/70">
          ↑ / ↓ history · Tab to autocomplete · try &quot;krythiq scan --format json&quot;
        </p>
      )}
    </div>
  );
}
