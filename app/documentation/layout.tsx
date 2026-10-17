import Link from "next/link";
import { BrandLogo } from "@/app/components/BrandLogo";

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground md:flex">
      <aside className="section-sidebar sticky top-24 hidden max-h-[calc(100svh-8rem)] w-64 shrink-0 overflow-y-auto md:block">
        <div className="space-y-8 p-6">
          <Link href="/" className="flex items-center gap-2 text-sm font-semibold tracking-tight">
            <BrandLogo className="h-8 w-8 rounded-xl" priority />
            Krythiq
          </Link>
          <div className="space-y-8">
            <Link href="/documentation/navigate-site" className="block text-sm text-muted-foreground transition-colors hover:text-foreground">Navigate this site</Link>
            <div>
              <h4 className="mb-4 text-xs font-semibold text-muted-foreground">
                Getting Started
              </h4>
              <ul className="space-y-2 text-sm">
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
                    href="/documentation/connect-cli"
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Connect CLI to website
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
                  <h5 className="text-xs font-semibold text-muted-foreground">
                    Commands
                  </h5>
                  <ul className="mt-2 space-y-2 text-[13px] text-muted-foreground">
                    <li>
                      <Link
                        href="/documentation/connect-cli"
                        className="hover:text-foreground"
                      >
                        krythiq connect — link dashboard
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="/documentation/commands"
                        className="hover:text-foreground"
                      >
                        krythiq init — setup project
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="/documentation/commands"
                        className="hover:text-foreground"
                      >
                        krythiq run — wrap a process
                      </Link>
                    </li>
                    <li><Link href="/documentation/commands#doctor" className="hover:text-foreground">krythiq doctor — check setup</Link></li>
                    <li><Link href="/documentation/commands#report" className="hover:text-foreground">krythiq report — review evidence</Link></li>
                    <li>
                      <Link
                        href="/documentation/commands"
                        className="hover:text-foreground"
                      >
                        krythiq scan — security scan
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="/documentation/commands"
                        className="hover:text-foreground"
                      >
                        krythiq auth — configure API key
                      </Link>
                    </li>
                  </ul>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="mb-4 text-xs font-semibold text-muted-foreground">
                Features & Analysis
              </h4>
              <ul className="space-y-2 text-sm">
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

      <details className="mb-6 rounded-xl bg-card p-4 md:hidden">
        <summary className="cursor-pointer text-sm font-medium">Documentation sections</summary>
        <nav aria-label="Documentation sections" className="mt-3 grid grid-cols-2 gap-2">
          {[
            ["/documentation", "Introduction"],
            ["/documentation/installation", "Installation"],
            ["/documentation/quickstart", "Quick start"],
            ["/documentation/connect-cli", "Connect CLI"],
            ["/documentation/project-structure", "Structure"],
            ["/documentation/commands", "CLI reference"],
            ["/documentation/ai-detection", "AI analysis"],
            ["/documentation/system-design", "System design"],
            ["/documentation/config", "Configuration"],
          ].map(([href, label]) => <Link key={href} href={href} className="rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground">{label}</Link>)}
        </nav>
      </details>
      <div className="min-w-0 flex-1 bg-background p-5 sm:p-8 md:p-16">
        <div className="docs-content mx-auto max-w-4xl">{children}</div>
      </div>
    </div>
  );
}
