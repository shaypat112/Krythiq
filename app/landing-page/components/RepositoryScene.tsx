import {
  CheckCircle2,
  ChevronRight,
  FileCode2,
  FolderGit2,
  Search,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { BrandLogo } from "@/app/components/BrandLogo";

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
  return (
    <div className="h-full min-h-[300px] overflow-hidden bg-[#090b10] text-white">
      <div className="flex h-9 items-center justify-between border-b border-white/8 bg-[#0d1017] px-3">
        <div className="flex items-center gap-2">
          <BrandLogo className="h-5 w-5 rounded-md" />
          <span className="text-[9px] font-medium text-white/80 sm:text-[10px]">Security workspace</span>
        </div>
        <div className="flex items-center gap-1.5 text-[8px] text-white/35">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          Scan complete
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

          <div className="mt-3 grid grid-cols-[1fr_78px_auto] gap-1.5">
            <div>
              <p className="mb-1 text-[7px] font-medium text-white/65">GitHub repository</p>
              <div className="flex h-7 items-center gap-1.5 rounded-md border border-white/10 bg-black/20 px-2 text-[7px] text-white/70">
                <FolderGit2 className="h-2.5 w-2.5 text-white/35" />
                github.com/krythiq/demo
              </div>
            </div>
            <div>
              <p className="mb-1 text-[7px] font-medium text-white/65">Threshold</p>
              <div className="flex h-7 items-center justify-between rounded-md border border-white/10 bg-black/20 px-2 text-[7px] text-white/70">
                High <ChevronRight className="h-2.5 w-2.5 rotate-90 text-white/30" />
              </div>
            </div>
            <div className="self-end">
              <div className="flex h-7 items-center gap-1 rounded-md bg-white px-2.5 text-[7px] font-semibold text-black">
                <ShieldAlert className="h-2.5 w-2.5" />
                Rescan
              </div>
            </div>
          </div>
        </section>

        <div className="mt-2.5 grid grid-cols-4 gap-1.5">
          {metrics.map((metric) => (
            <div key={metric.label} className="rounded-lg border border-white/8 bg-[#0d1017] p-2">
              <p className="truncate text-[6px] text-white/35 sm:text-[7px]">{metric.label}</p>
              <p className="mt-1 text-[13px] font-semibold leading-none text-white sm:text-[15px]">{metric.value}</p>
              <p className="mt-1 truncate text-[5px] text-white/25 sm:text-[6px]">{metric.detail}</p>
            </div>
          ))}
        </div>

        <div className="mt-2.5 grid gap-2 sm:grid-cols-[.8fr_1.2fr]">
          <section className="rounded-lg border border-violet-400/20 bg-[radial-gradient(circle_at_top_right,rgba(139,92,246,.12),transparent_45%),#0d1017] p-2.5">
            <div className="flex items-center justify-between gap-2">
              <p className="flex items-center gap-1 text-[8px] font-medium text-white/80">
                <Sparkles className="h-2.5 w-2.5 text-violet-300" />
                Repository intelligence
              </p>
              <span className="rounded border border-violet-400/20 bg-violet-400/10 px-1.5 py-0.5 text-[5px] text-violet-300">
                AI analysis
              </span>
            </div>
            <p className="mt-2 text-[6px] leading-[10px] text-white/35 sm:text-[7px] sm:leading-3">
              Authentication and webhook paths contain the highest-impact reachable risks. Review trust-boundary checks first.
            </p>
            <div className="mt-2 grid grid-cols-2 gap-1">
              <MiniStat label="Files scanned" value="214" />
              <MiniStat label="Lines analyzed" value="38.4k" />
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
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-white/7 bg-black/15 p-1.5">
      <p className="text-[5px] text-white/25">{label}</p>
      <p className="mt-0.5 text-[8px] font-medium text-white/65">{value}</p>
    </div>
  );
}
