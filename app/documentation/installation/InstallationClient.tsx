"use client";

import { useState } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  Terminal,
  Package,
} from "lucide-react";
import { cn } from "@/app/lib/utils";
import { DocumentationCodeBlock as CodeBlock } from "../documentation-code-block";

function Step({
  number,
  title,
  children,
  done = false,
}: {
  number: number;
  title: string;
  children: React.ReactNode;
  done?: boolean;
}) {
  return (
    <div className="flex gap-5">
      <div className="flex flex-col items-center">
        <div
          className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0",
            done
              ? "bg-zinc-800/60 text-zinc-200 border border-zinc-700/70"
              : "bg-zinc-800 text-white border border-zinc-700",
          )}
        >
          {done ? <CheckCircle2 size={16} /> : number}
        </div>
        <div className="w-px flex-1 bg-zinc-800 mt-3 mb-1" />
      </div>
      <div className="pb-10 flex-1 min-w-0">
        <h3 className="text-white font-semibold mb-3 mt-1">{title}</h3>
        {children}
      </div>
    </div>
  );
}

const packageManagers = [
  { id: "npm", label: "npm", cmd: "npm install -g krythiq" },
  { id: "pnpm", label: "pnpm", cmd: "pnpm add -g krythiq" },
  { id: "bun", label: "bun", cmd: "bun add -g krythiq" },
];

export default function InstallationPage() {
  const [pm, setPm] = useState("npm");
  const selected = packageManagers.find((p) => p.id === pm)!;

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs font-mono text-zinc-500">
          <Package size={12} />
          <span>Getting Started</span>
        </div>
        <h1 className="text-4xl font-extrabold text-white tracking-tight">
          Installation
        </h1>
        <p className="text-zinc-400 text-base leading-relaxed max-w-xl">
          Krythiq is a global CLI published through npm. Install it once and use
          it across projects on your machine.
        </p>
      </div>

      {/* Prerequisites */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-5 space-y-3">
        <h2 className="text-sm font-bold text-white">Prerequisites</h2>
        <ul className="space-y-2">
          {[
            { label: "Node.js 20 or later", check: "node --version" },
            { label: "npm, pnpm, or bun", check: "npm --version" },
          ].map((req) => (
            <li key={req.label} className="flex items-center gap-3 text-sm">
              <CheckCircle2 size={14} className="text-zinc-300 shrink-0" />
              <span className="text-zinc-300">{req.label}</span>
              <code className="ml-auto text-xs font-mono text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded hidden sm:block">
                {req.check}
              </code>
            </li>
          ))}
        </ul>
      </div>

      {/* Steps */}
      <div>
        <Step number={1} title="Install krythiq globally">
          <p className="text-sm text-zinc-500 mb-3">
            Choose your preferred package manager:
          </p>
          {/* Package manager tabs */}
          <div className="flex gap-1 mb-3 p-1 bg-zinc-900 border border-zinc-800 rounded-lg w-fit">
            {packageManagers.map((p) => (
              <button
                key={p.id}
                onClick={() => setPm(p.id)}
                className={cn(
                  "px-3 py-1 rounded-md text-xs font-mono font-medium transition-all",
                  pm === p.id
                    ? "bg-zinc-700 text-white"
                    : "text-zinc-500 hover:text-zinc-300",
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
          <CodeBlock code={selected.cmd} />
        </Step>

        <Step number={2} title="Verify the installation">
          <p className="text-sm text-zinc-500 mb-3">
            Confirm krythiq was installed correctly:
          </p>
          <CodeBlock code="krythiq --version" />
          <div className="mt-3 rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-3 font-mono text-sm text-zinc-500">
            <span className="text-zinc-600">→ </span>0.1.1
          </div>
        </Step>

        <Step number={3} title="Authenticate (optional for AI features)">
          <p className="text-sm text-zinc-500 mb-3">
            AI-powered trace analysis requires an API key. Krythiq uses Anthropic
            Claude under the hood.
          </p>
          <CodeBlock code="krythiq auth" />
          <p className="text-xs text-zinc-600 mt-2">
            You can also set{" "}
            <code className="text-zinc-400">ANTHROPIC_API_KEY</code> in your
            environment and Krythiq will pick it up automatically.
          </p>
        </Step>

        <div className="flex gap-5">
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 rounded-full bg-zinc-800/60 border border-zinc-700/70 flex items-center justify-center">
              <CheckCircle2 size={16} className="text-zinc-200" />
            </div>
          </div>
          <div className="pb-2 flex-1">
            <h3 className="text-white font-semibold mt-1">You&apos;re ready</h3>
            <p className="text-sm text-zinc-500 mt-1">
              Head to{" "}
              <a
                href="/documentation/quickstart"
                className="text-zinc-200 hover:underline"
              >
                Quick Start
              </a>{" "}
              to run your first analysis.
            </p>
          </div>
        </div>
      </div>

      {/* Troubleshooting */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-white">Troubleshooting</h2>

        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5 space-y-2">
          <div className="flex items-center gap-2">
            <AlertTriangle size={14} className="text-amber-400" />
            <p className="text-sm font-semibold text-amber-300">
              EACCES: permission denied (Linux / macOS)
            </p>
          </div>
          <p className="text-sm text-zinc-400 leading-relaxed">
            If you get a permissions error, configure your npm prefix to a
            user-writable directory:
          </p>
          <CodeBlock
            label="Fix npm permissions"
            code={`mkdir ~/.npm-global\nnpm config set prefix '~/.npm-global'\nexport PATH=~/.npm-global/bin:$PATH`}
          />
          <p className="text-xs text-zinc-500">
            Add the <code className="text-zinc-400">export PATH</code> line to
            your <code className="text-zinc-400">~/.zshrc</code> or{" "}
            <code className="text-zinc-400">~/.bashrc</code>.
          </p>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/20 p-5 space-y-2">
          <div className="flex items-center gap-2">
            <Terminal size={14} className="text-zinc-400" />
            <p className="text-sm font-semibold text-white">
              command not found: krythiq (after install)
            </p>
          </div>
          <p className="text-sm text-zinc-400">
            Your shell may need to be reloaded after a global install:
          </p>
          <CodeBlock code="source ~/.zshrc   # or source ~/.bashrc" />
        </div>
      </div>
    </div>
  );
}
