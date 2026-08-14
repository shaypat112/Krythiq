import { cn } from "@/app/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// ─── Toggle / switch ──────────────────────────────────────────────────────────

export function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 border-b border-border py-4 transition-colors",
        "bg-transparent hover:border-foreground/20",
      )}
    >
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {description && (
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent",
          "transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
          checked ? "bg-foreground" : "bg-muted-foreground/40",
        )}
      >
        <span
          className={cn(
            "pointer-events-none inline-block h-4 w-4 rounded-full shadow-sm",
            "transform transition-transform duration-200",
            checked
              ? "translate-x-4 bg-background"
              : "translate-x-0 bg-background/90",
          )}
        />
      </button>
    </div>
  );
}

// ─── Field group ──────────────────────────────────────────────────────────────

export function FieldGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}

// ─── Input ────────────────────────────────────────────────────────────────────

export function StyledInput(props: React.ComponentProps<typeof Input>) {
  return (
    <Input
      {...props}
      className={cn(
        "h-9 rounded-lg border border-border bg-background px-3 text-sm text-foreground",
        "placeholder:text-muted-foreground focus:border-ring focus:bg-background focus:ring-0",
        "transition-colors",
        props.className,
      )}
    />
  );
}

// ─── Select ───────────────────────────────────────────────────────────────────

export function StyledSelect({
  value,
  onChange,
  children,
}: {
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "h-9 w-full cursor-pointer appearance-none rounded-lg border border-border bg-background px-3 text-sm text-foreground",
        "focus:border-ring focus:outline-none focus:ring-0 transition-colors",
      )}
    >
      {children}
    </select>
  );
}

// ─── Section ──────────────────────────────────────────────────────────────────

export function SectionCard({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("border-b border-border pb-8", className)}>
      <div className="pb-5">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {description && (
          <p className="mt-1 max-w-3xl text-xs leading-5 text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

// ─── Danger button ────────────────────────────────────────────────────────────

export function DangerButton({
  children,
  onClick,
  disabled,
  className,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-600 transition-colors dark:text-red-400",
        "hover:border-red-500/50 hover:bg-red-500/15",
        "disabled:opacity-40 disabled:cursor-not-allowed",
        className,
      )}
    >
      {children}
    </button>
  );
}

// ─── Ghost action button ──────────────────────────────────────────────────────

export function GhostButton({
  children,
  onClick,
  disabled,
  className,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-muted-foreground transition-colors",
        "hover:bg-muted hover:text-foreground",
        "disabled:cursor-not-allowed disabled:opacity-40",
        className,
      )}
    >
      {children}
    </button>
  );
}
