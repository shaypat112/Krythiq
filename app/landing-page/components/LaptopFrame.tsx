export function LaptopFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative mx-auto w-full max-w-2xl">
      <div className="rounded-t-2xl bg-gradient-to-b from-border to-border/20 p-1">
        <div className="flex items-center justify-between rounded-t-lg bg-card px-4 py-2">
          <div className="flex gap-1.5">
            <div className="h-3 w-3 rounded-full bg-red-500/70" />
            <div className="h-3 w-3 rounded-full bg-amber-400/70" />
            <div className="h-3 w-3 rounded-full bg-emerald-400/70" />
          </div>
          <div className="rounded-md bg-background/60 px-3 py-0.5 font-mono text-xs text-muted-foreground">
            votrio · ~/project
          </div>
          <div className="w-12" />
        </div>
        <div className="rounded-b-lg bg-background p-5">{children}</div>
      </div>
      <div className="mx-auto h-2 w-24 rounded-b-2xl bg-border" />
    </div>
  );
}
