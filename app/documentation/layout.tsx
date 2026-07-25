import Link from "next/link";

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground md:flex">
      <aside className="sticky top-0 hidden h-screen w-64 border-r border-border bg-background md:block">
        <div className="space-y-8 p-6">
          <div className="rounded-2xl border border-border bg-background p-4">
            <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">
              Documentation
            </p>
            <p className="mt-2 text-sm font-medium text-foreground">
              Setup, install guides, and usage notes for Votrio.
            </p>
          </div>

          <div className="space-y-8">
            <div>
              <h4 className="mb-4 text-[10px] font-semibold uppercase tracking-[0.35em] text-muted-foreground">
                Getting Started
              </h4>
              <ul className="space-y-3 text-sm">
                <li>
                  <Link
                    href="/documentation"
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Introduction
                  </Link>
                </li>

                <li>
                  <Link
                    href="/documentation/installation"
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Installation
                  </Link>
                </li>
                <li>
                  <Link
                    href="/documentation/quickstart"
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Quick Start
                  </Link>
                </li>
                <li>
                  <Link
                    href="/documentation/project-structure"
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Project Structure
                  </Link>
                </li>
                <li>
                  <Link
                    href="/documentation/commands"
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    CLI Reference
                  </Link>
                </li>
                {/* Inline command summary so commands are visible in the docs sidebar */}
                <li className="pt-2">
                  <h5 className="text-[11px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                    Commands
                  </h5>
                  <ul className="mt-2 space-y-2 text-xs text-zinc-500">
                    <li>
                      <Link
                        href="/documentation/commands"
                        className="hover:text-foreground"
                      >
                        votrio init — setup project
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="/documentation/commands"
                        className="hover:text-foreground"
                      >
                        votrio run — wrap a process
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="/documentation/commands"
                        className="hover:text-foreground"
                      >
                        votrio scan — security scan
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="/documentation/commands"
                        className="hover:text-foreground"
                      >
                        votrio auth — configure API key
                      </Link>
                    </li>
                  </ul>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="mb-4 text-[10px] font-semibold uppercase tracking-[0.35em] text-muted-foreground">
                Features & Analysis
              </h4>
              <ul className="space-y-3 text-sm">
                <li>
                  <Link
                    href="/documentation/stack-traces"
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Stack Traces
                  </Link>
                </li>
                <li>
                  <Link
                    href="/documentation/ai-detection"
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    AI Detection & Architecture
                  </Link>
                </li>
                <li>
                  <Link
                    href="/documentation/system-design"
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    System Design Scenarios
                  </Link>
                </li>
                <li>
                  <Link
                    href="/documentation/config"
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Configuration
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </aside>

      <div className="border-b border-border p-3 md:hidden">
        <nav aria-label="Documentation sections" className="flex gap-2 overflow-x-auto">
          {[
            ["/documentation", "Start"],
            ["/documentation/quickstart", "Quick start"],
            ["/documentation/project-structure", "Structure"],
            ["/documentation/commands", "CLI"],
            ["/documentation/ai-detection", "AI analysis"],
            ["/documentation/system-design", "System design"],
            ["/documentation/config", "Config"],
          ].map(([href, label]) => (
            <Link key={href} href={href} className="shrink-0 rounded-lg border border-border bg-card px-3 py-2 text-sm text-muted-foreground">
              {label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="min-w-0 flex-1 bg-background p-5 sm:p-8 md:p-16">
        <div className="mx-auto max-w-4xl">{children}</div>
      </div>
    </div>
  );
}
