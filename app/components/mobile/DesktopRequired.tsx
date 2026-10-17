import Link from "next/link";
import { ArrowRight, Laptop } from "lucide-react";

import { BrandLogo } from "@/app/components/BrandLogo";
import { Button } from "@/components/ui/button";

export function DesktopRequired({
  children,
  enabled = true,
}: {
  children: React.ReactNode;
  enabled?: boolean;
}) {
  if (!enabled) return children;

  return (
    <>
      <section className="relative grid min-h-dvh overflow-hidden bg-background px-5 py-10 md:hidden">
        <div className="relative mx-auto flex w-full max-w-sm flex-col justify-center">
          <div className="mb-8 flex items-center gap-2 text-sm font-semibold">
            <BrandLogo className="h-8 w-8 rounded-xl" priority />
            Krythiq
          </div>

          <div className="rounded-2xl bg-card p-6">
            <span className="inline-flex items-center gap-2 text-sm font-medium text-primary">
              <Laptop className="h-3.5 w-3.5" />
              Desktop workspace
            </span>
            <h1 className="mt-5 text-3xl font-semibold tracking-tight">
              Open Krythiq on a desktop.
            </h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Repository scans, findings, charts, and remediation tools need more room than a phone provides. Continue on a laptop or desktop for the complete workspace.
            </p>
            <div className="mt-6 rounded-xl bg-muted p-4">
              <p className="text-sm font-medium">Your account is safe.</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Sign in on your computer with the same account to pick up where you left off.
              </p>
            </div>
            <Button asChild variant="outline" className="mt-5 w-full">
              <Link href="/documentation">
                Browse documentation
                <ArrowRight />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <div className="hidden md:block">{children}</div>
    </>
  );
}
