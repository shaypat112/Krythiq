"use client";

import { useState } from "react";
import {
  ArrowRight,
  Copy,
  Check,
  Zap,
  Info,
} from "lucide-react";
import { cn } from "@/app/lib/utils";
import Link from "next/link";

function CodeBlock({
  code,
  label,
  highlight,
}: {
  code: string;
  label?: string;
  highlight?: string[];
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lines = code.split("\n");

  return (
    <div className="group rounded-lg border border-zinc-800 bg-zinc-950 overflow-hidden">
      {label && (
        <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800 bg-zinc-900/50">
          <span className="text-[11px] text-zinc-500 font-mono">{label}</span>
          <button
            onClick={copy}
            className="flex items-center gap-1.5 text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors opacity-0 group-hover:opacity-100"
          >
            {copied ? (
              <>
                <Check size={11} className="text-zinc-200" />
                <span className="text-zinc-200">Copied</span>
              </>
            ) : (
              <>
                <Copy size={11} />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      )}
      <div className="relative px-4 py-3.5">
        {lines.length === 1 ? (
          <div className="flex items-center gap-3">
            <span className="text-zinc-600 font-mono text-sm select-none">
              $
            </span>
            <code className="text-zinc-200 font-mono text-sm flex-1">
              {code}
            </code>
            {!label && (
              <button
                onClick={copy}
                className="shrink-0 text-zinc-600 hover:text-zinc-400 transition-colors opacity-0 group-hover:opacity-100"
              >
                {copied ? (
                  <Check size={14} className="text-zinc-200" />
                ) : (
                  <Copy size={14} />
                )}
              </button>
            )}
          </div>
        ) : (
          <pre className="text-sm font-mono overflow-x-auto">
            {lines.map((line, i) => (
              <div
                key={i}
                className={cn(
                  "leading-6",
                  line.startsWith("#")
                    ? "text-zinc-600"
                    : line.startsWith("→") ||
                        line.startsWith("✓") ||
                        line.startsWith("●")
                      ? "text-zinc-200"
                      : highlight?.some((h) => line.includes(h))
                        ? "text-amber-300"
                        : "text-zinc-300",
                )}
              >
                {line || " "}
              </div>
            ))}
          </pre>
        )}
      </div>
    </div>
  );
}

const steps = [
  {
    number: 1,
    title: "Initialize your project",
    description:
      "Run this in your project root. Krythiq creates a config file and detects your stack.",
    cmd: "krythiq init",
    output: `→ Detecting project stack...
✓ Node.js / TypeScript detected
✓ Created krythiq.config.mjs
✓ Added .krythiq/ to .gitignore

Ready. Run: krythiq run "npm start"`,
    tip: null,
  },
  {
    number: 2,
    title: "Wrap your start command",
    description:
      "Wrap a trusted command. Use --no-ai to stream output without an Anthropic credential.",
    cmd: `krythiq run "npm start" --no-ai`,
    output: `● krythiq watching - node v20.11.0
● AI disabled

  > myapp@1.0.0 start
  > node index.js

Server listening on :3000`,
    tip: 'Works with any process: krythiq run "python app.py", krythiq run "go run .", etc.',
  },
  {
    number: 3,
    title: "See AI debug output on an error",
    description:
      "When an error occurs, Krythiq intercepts it and streams an AI explanation directly in your terminal.",
    cmd: null,
    output: `TypeError: Cannot read properties of undefined (reading 'id')
    at /src/routes/user.ts:42:18

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
● krythiq - trace analysis

  Root cause: req.user is undefined because the
  auth middleware isn't applied to this route.

  Fix: Add authMiddleware before this handler:

    router.get('/profile', authMiddleware, handler)

  Confidence: 94%
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    tip: null,
  },
  {
    number: 4,
    title: "Run a security scan",
    description:
      "Scan your codebase for vulnerabilities at any time with a single command.",
    cmd: "krythiq scan",
    output: `krythiq scan

✓ Found 214 files
✓ Scanned 214 files

Semgrep is unavailable; install Semgrep or provide .krythiq/rules.json for code-rule scanning.
✓ No issues found`,
    tip: "Add krythiq scan to your CI pipeline with krythiq scan --ci --fail-on=high",
  },
];

export default function QuickStartPage() {
  const [activeStep, setActiveStep] = useState<number | null>(null);

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs font-mono text-zinc-500">
          <Zap size={12} />
          <span>Getting Started</span>
        </div>
        <h1 className="text-4xl font-extrabold text-white tracking-tight">
          Quick Start
        </h1>
        <p className="text-zinc-400 text-base leading-relaxed max-w-xl">
          From install to your first AI-analyzed stack trace in under 2 minutes.
          No account required to start.
        </p>
      </div>

      {/* Time estimate */}
      <div className="flex items-center gap-6 py-3 border-y border-zinc-800/60">
        {[
          { label: "Time to first trace", value: "~90 seconds" },
          { label: "Config required", value: "Zero" },
          { label: "Sends code to cloud", value: "Never" },
        ].map((s) => (
          <div key={s.label} className="text-center">
            <p className="text-white font-bold text-sm font-mono">{s.value}</p>
            <p className="text-zinc-600 text-xs mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Steps */}
      <div className="space-y-2">
        {steps.map((step, i) => {
          return (
            <div
              key={step.number}
              className={cn(
                "rounded-xl border transition-all",
                activeStep === i
                  ? "border-zinc-700/60 bg-zinc-900/40"
                  : "border-zinc-800 bg-zinc-900/20 hover:border-zinc-700",
              )}
            >
              <button
                className="w-full flex items-center gap-4 p-5 text-left"
                onClick={() => setActiveStep(activeStep === i ? null : i)}
              >
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 transition-all",
                    activeStep === i
                      ? "bg-zinc-800/60 text-zinc-200 border border-zinc-700/70"
                      : "bg-zinc-800 text-white border border-zinc-700",
                  )}
                >
                  {step.number}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold text-sm">
                    {step.title}
                  </p>
                  <p className="text-zinc-500 text-xs mt-0.5 truncate">
                    {step.description}
                  </p>
                </div>
                <ArrowRight
                  size={14}
                  className={cn(
                    "text-zinc-600 shrink-0 transition-transform",
                    activeStep === i && "rotate-90 text-zinc-200",
                  )}
                />
              </button>

              {activeStep === i && (
                <div className="px-5 pb-5 space-y-3">
                  <p className="text-sm text-zinc-400 leading-relaxed">
                    {step.description}
                  </p>
                  {step.cmd && <CodeBlock code={step.cmd} />}
                  <CodeBlock
                    label="terminal output"
                    code={step.output}
                    highlight={["⚠", "TypeError", "Error"]}
                  />
                  {step.tip && (
                    <div className="flex items-start gap-2 p-3 rounded-lg border border-zinc-800 bg-zinc-950">
                      <Info
                        size={13}
                        className="text-cyan-400 mt-0.5 shrink-0"
                      />
                      <p className="text-xs text-zinc-400">{step.tip}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* What's next */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold text-white">What&apos;s next</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            {
              href: "/documentation/stack-traces",
              title: "Stack Trace Analysis",
              desc: "Customize how Krythiq explains errors",
            },
            {
              href: "/documentation/ai-detection",
              title: "Security Scanning",
              desc: "Run deep vulnerability audits",
            },
            {
              href: "/documentation/config",
              title: "Configuration",
              desc: "krythiq.config.mjs reference",
            },
            {
              href: "/documentation/commands",
              title: "CLI Reference",
              desc: "Every command and flag",
            },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 p-4 rounded-lg border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/40 transition-all group"
            >
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium">{item.title}</p>
                <p className="text-zinc-500 text-xs mt-0.5">{item.desc}</p>
              </div>
              <ArrowRight
                size={14}
                className="text-zinc-600 group-hover:text-zinc-400 group-hover:translate-x-0.5 transition-all"
              />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
