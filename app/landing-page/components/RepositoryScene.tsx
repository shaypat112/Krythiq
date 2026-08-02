"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  ChevronRight,
  FileCode2,
  FolderGit2,
  Search,
  ShieldAlert,
  GitBranch,
} from "lucide-react";
import { BrandLogo } from "@/app/components/BrandLogo";
import { Safari } from "@/components/ui/safari";

const metrics = [
  { label: "Overall risk", value: "82/100", detail: "Needs attention" },
  { label: "Total findings", value: "7", detail: "Static checks completed" },
  { label: "Code issues", value: "5", detail: "Risky-code rules" },
  { label: "Secret exposure", value: "2", detail: "Credential-pattern rules" },
];

const findings = [
  {
    severity: "high",
    title: "Admin token fallback can bypass role validation",
    file: "app/api/admin/route.ts:84",
    className: "border-orange-400/25 bg-orange-400/10 text-orange-300",
  },
  {
    severity: "medium",
    title: "Webhook signature check accepts an empty secret",
    file: "app/api/webhooks/route.ts:31",
    className: "border-amber-400/25 bg-amber-400/10 text-amber-300",
  },
];

export function RepositoryScene() {
  const [repo, setRepo] = useState("github.com/krythiq/demo");
  const [phase, setPhase] = useState<"idle" | "scanning" | "complete">("complete");
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (phase !== "scanning") return;
    const steps = [31, 54, 76, 92, 100];
    const timers = steps.map((value, index) => window.setTimeout(() => {
      setProgress(value);
      if (value === 100) setPhase("complete");
    }, 420 * (index + 1)));
    return () => timers.forEach(window.clearTimeout);
  }, [phase]);

  const startDemo = () => {
    setProgress(12);
    setPhase("scanning");
  };

  return (
    <Safari url="app.krythiq.com/scan" mode="simple" className="h-full bg-[#090b10]">
    <div className="h-full overflow-hidden bg-[#090b10] text-white">
      <div className="flex h-9 items-center justify-between border-b border-white/8 bg-[#0d1017] px-3">
        <div className="flex items-center gap-2">
          <BrandLogo className="h-5 w-5 rounded-md" />
          <span className="text-[9px] font-medium text-white/80 sm:text-[10px]">Security workspace</span>
        </div>
        <div className="flex items-center gap-1.5 text-[8px] text-white/35">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          {phase === "scanning" ? `Scanning ${progress}%` : phase === "complete" ? "Scan complete" : "Ready to scan"}
        </div>
      </div>

      <div className="h-[calc(100%-2.25rem)] overflow-hidden p-3 sm:p-4">
        <section className="rounded-xl border border-white/8 bg-[radial-gradient(circle_at_10%_0%,rgba(14,165,233,.17),transparent_35%),radial-gradient(circle_at_90%_10%,rgba(168,85,247,.12),transparent_30%),#0d1017] p-3 sm:p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-[13px] font-semibold tracking-tight text-white sm:text-[15px]">
                Find the risks worth fixing first.
              </h2>
              <p className="mt-1 max-w-md text-[7px] leading-3 text-white/40 sm:text-[8px]">
                Krythiq performs a read-only static source review and ranks findings by severity.
              </p>
            </div>
            <span className="hidden items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[7px] text-white/55 sm:flex">
              <CheckCircle2 className="h-2.5 w-2.5 text-emerald-400" />
              Complete
            </span>
          </div>

          <div className="mt-3 grid grid-cols-[1fr_auto] gap-1.5">
            <div>
              <p className="mb-1 text-[7px] font-medium text-white/65">GitHub repository</p>
              <label className="flex h-7 items-center gap-1.5 rounded-md border border-white/10 bg-black/20 px-2 text-[7px] text-white/70 focus-within:border-sky-400/40">
                <FolderGit2 className="h-2.5 w-2.5 text-white/35" />
                <input value={repo} onChange={(event) => setRepo(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") startDemo(); }} aria-label="Demo GitHub repository" className="min-w-0 flex-1 bg-transparent outline-none" />
              </label>
            </div>
            <div className="self-end">
              <button type="button" onClick={startDemo} disabled={phase === "scanning" || !repo.trim()} className="flex h-7 items-center gap-1 rounded-md bg-white px-2.5 text-[7px] font-semibold text-black transition hover:bg-sky-100 disabled:cursor-wait disabled:opacity-60">
                <ShieldAlert className="h-2.5 w-2.5" />
                {phase === "scanning" ? "Scanning…" : phase === "complete" ? "Rescan" : "Scan repository"}
              </button>
            </div>
          </div>
          <div className="mt-2 h-0.5 overflow-hidden rounded-full bg-white/5" aria-hidden={phase !== "scanning"}>
            <div className="h-full rounded-full bg-gradient-to-r from-sky-400 to-emerald-400 transition-[width] duration-300" style={{ width: `${progress}%` }} />
          </div>
        </section>

        <div className={`mt-2.5 grid grid-cols-4 gap-1.5 transition duration-500 ${phase === "scanning" ? "translate-y-1 opacity-35" : "opacity-100"}`}>
          {metrics.map((metric) => (
            <div key={metric.label} className="rounded-lg border border-white/8 bg-[#0d1017] p-2">
              <p className="truncate text-[6px] text-white/35 sm:text-[7px]">{metric.label}</p>
              <p className="mt-1 text-[13px] font-semibold leading-none text-white sm:text-[15px]">{metric.value}</p>
              <p className="mt-1 truncate text-[5px] text-white/25 sm:text-[6px]">{metric.detail}</p>
            </div>
          ))}
        </div>

        <div className={`mt-2.5 grid gap-2 transition duration-500 sm:grid-cols-[.9fr_1.1fr] ${phase === "scanning" ? "translate-y-1 opacity-30" : "opacity-100"}`}>
          <section className="relative overflow-hidden rounded-lg border border-cyan-400/15 bg-[radial-gradient(circle_at_50%_45%,rgba(34,211,238,.11),transparent_48%),#0d1017] p-2.5">
            <div className="pointer-events-none absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.08)_1px,transparent_1px)] [background-size:18px_18px] [mask-image:linear-gradient(to_bottom,black,transparent)]" />
            <div className="flex items-center justify-between gap-2">
              <p className="flex items-center gap-1 text-[8px] font-medium text-white/80">
                <GitBranch className="h-2.5 w-2.5 text-cyan-300" />
                Reachability map
              </p>
              <span className="flex items-center gap-1 text-[5px] text-emerald-300">
                <span className="h-1 w-1 animate-pulse rounded-full bg-emerald-300" />
                214 files mapped
              </span>
            </div>
            <div className="relative mt-1.5 h-[74px] [perspective:500px] sm:h-[88px]">
              <svg viewBox="0 0 240 90" className="h-full w-full overflow-visible [transform:rotateX(7deg)]" role="img" aria-label="Repository dependency graph highlighting a reachable security risk">
                <defs>
                  <linearGradient id="safe-edge" x1="0" x2="1"><stop stopColor="#22d3ee" stopOpacity=".2"/><stop offset="1" stopColor="#22d3ee" stopOpacity=".7"/></linearGradient>
                  <linearGradient id="risk-edge" x1="0" x2="1"><stop stopColor="#f59e0b"/><stop offset="1" stopColor="#fb7185"/></linearGradient>
                  <filter id="node-glow"><feGaussianBlur stdDeviation="2.5" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
                </defs>
                <g fill="none" stroke="url(#safe-edge)" strokeWidth="1">
                  <path d="M18 47 62 21 105 42 148 17 190 35 224 16"/><path d="M18 47 62 67 105 42 148 69 190 35 224 63"/><path d="M62 21 62 67M148 17 148 69"/>
                </g>
                <path d="M18 47 62 21 105 42 148 69 190 35 224 63" fill="none" stroke="url(#risk-edge)" strokeWidth="1.7" strokeDasharray="4 4" className="animate-[dash_3s_linear_infinite]" />
                {[[18,47],[62,21],[62,67],[105,42],[148,17],[148,69],[190,35],[224,16],[224,63]].map(([cx,cy], index) => <circle key={index} cx={cx} cy={cy} r={index === 8 ? 4.5 : 3} fill={index === 8 ? "#fb7185" : index === 5 ? "#f59e0b" : "#22d3ee"} opacity={index === 8 ? 1 : .8} filter={index === 8 ? "url(#node-glow)" : undefined}/>) }
                <text x="9" y="60" fill="white" opacity=".45" fontSize="5">api</text><text x="137" y="81" fill="#fbbf24" fontSize="5">auth</text><text x="204" y="76" fill="#fda4af" fontSize="5">admin</text>
              </svg>
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[9px] font-medium text-white/80">Findings</p>
                <p className="text-[6px] text-white/30">2 of 7 findings triaged</p>
              </div>
              <div className="flex h-5 items-center gap-1 rounded-md border border-white/8 bg-[#0d1017] px-1.5 text-[6px] text-white/35">
                <Search className="h-2 w-2" />
                Search findings
              </div>
            </div>
            <div className="mt-1.5 space-y-1">
              {findings.map((finding) => (
                <div key={finding.title} className="flex items-start gap-1.5 rounded-lg border border-white/8 bg-[#0d1017] p-2">
                  <ChevronRight className="mt-0.5 h-2.5 w-2.5 shrink-0 text-white/25" />
                  <div className="min-w-0">
                    <span className={`rounded border px-1 py-0.5 text-[5px] font-semibold uppercase ${finding.className}`}>
                      {finding.severity}
                    </span>
                    <p className="mt-1 truncate text-[7px] font-medium text-white/70">{finding.title}</p>
                    <p className="mt-0.5 flex items-center gap-1 truncate font-mono text-[5px] text-white/25">
                      <FileCode2 className="h-2 w-2" />
                      {finding.file}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
    </Safari>
  );
}
