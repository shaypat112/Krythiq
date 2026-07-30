"use client";

import { useMemo, useState } from "react";
import { Check } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/app/lib/utils";
import type { Plan } from "@/lib/billingsdk-config";

export interface PricingTableProps {
  className?: string;
  plans: Plan[];
  onPlanSelect?: (planId: string, billingCycle: "monthly" | "yearly") => void;
  showFooter?: boolean;
  footerText?: string;
  footerButtonText?: string;
  onFooterButtonClick?: () => void;
  variant?: "small" | "medium" | "large" | null;
  billingMode?: "toggle" | "monthly" | "yearly" | "one-time";
}

function numericPrice(price: string) {
  const value = Number.parseFloat(price);
  return Number.isFinite(value) ? value : null;
}

function discountFor(plan: Plan) {
  const monthly = numericPrice(plan.monthlyPrice);
  const yearly = numericPrice(plan.yearlyPrice);
  if (monthly === null || yearly === null || monthly <= 0) return 0;
  return Math.max(0, Math.round(((monthly * 12 - yearly) / (monthly * 12)) * 100));
}

export function PricingTableThree({
  className,
  plans,
  onPlanSelect,
  showFooter = false,
  footerText,
  footerButtonText,
  onFooterButtonClick,
  billingMode = "toggle",
}: PricingTableProps) {
  const [cycle, setCycle] = useState<"monthly" | "yearly">(
    billingMode === "yearly" ? "yearly" : "monthly",
  );
  const selectedCycle =
    billingMode === "one-time" || billingMode === "monthly"
      ? "monthly"
      : billingMode === "yearly"
        ? "yearly"
        : cycle;
  const bestDiscount = useMemo(
    () => Math.max(0, ...plans.map(discountFor)),
    [plans],
  );

  return (
    <div className={cn("mx-auto w-full max-w-7xl", className)}>
      {billingMode === "toggle" ? (
        <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div
            className="grid w-full grid-cols-2 rounded-xl bg-muted/70 p-1 sm:w-[272px]"
            role="group"
            aria-label="Billing period"
          >
            {(["monthly", "yearly"] as const).map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={cycle === value}
                onClick={() => setCycle(value)}
                className={cn(
                  "h-10 rounded-lg px-5 text-sm font-semibold capitalize transition-colors",
                  cycle === value
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {value}
              </button>
            ))}
          </div>
          {bestDiscount > 0 ? (
            <p className="text-sm font-medium text-muted-foreground">
              Save up to {bestDiscount}% with yearly billing
            </p>
          ) : null}
        </div>
      ) : null}

      <div
        className={cn(
          "grid overflow-hidden rounded-2xl border bg-card shadow-sm",
          plans.length === 1 && "mx-auto max-w-lg grid-cols-1",
          plans.length === 2 && "grid-cols-1 md:grid-cols-2",
          plans.length === 3 && "grid-cols-1 md:grid-cols-3",
          plans.length >= 4 && "grid-cols-1 md:grid-cols-2 xl:grid-cols-4",
        )}
      >
        {plans.map((plan, index) => {
          const yearly = selectedCycle === "yearly";
          const price = yearly ? plan.yearlyPrice : plan.monthlyPrice;
          const yearlyUnavailable = yearly && plan.yearlyAvailable === false;
          const discount = discountFor(plan);

          return (
            <article
              key={plan.id}
              className={cn(
                "relative flex min-h-[510px] flex-col bg-card px-7 py-9 md:px-9",
                index > 0 && "border-t md:border-l md:border-t-0",
                plan.highlight &&
                  "z-10 bg-muted/35 ring-1 ring-inset ring-primary/20",
              )}
            >
              {plan.badge ? (
                <span className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 rounded-full border bg-background px-4 py-1.5 text-xs font-semibold shadow-sm">
                  {plan.badge}
                </span>
              ) : null}

              <div>
                <h3 className="text-2xl font-semibold tracking-tight">{plan.title}</h3>
                <p className="mt-3 min-h-12 text-sm leading-6 text-muted-foreground">
                  {plan.description}
                </p>
              </div>

              <div className="mt-5 min-h-[82px]">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={`${plan.id}-${selectedCycle}`}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    transition={{ duration: 0.16 }}
                  >
                    <div className="flex items-end gap-2">
                      <span className="text-5xl font-semibold tracking-tight">
                        {numericPrice(price) !== null ? plan.currency : null}
                        {price}
                      </span>
                      {yearly && discount > 0 ? (
                        <span className="mb-1 rounded-md bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
                          {discount}% off
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {billingMode === "one-time"
                        ? "One-time payment"
                        : yearly
                          ? "Billed once per year"
                          : "Billed monthly"}
                    </p>
                  </motion.div>
                </AnimatePresence>
              </div>

              <ul className="mt-8 flex-1 space-y-4">
                {plan.features.map((feature) => (
                  <li key={feature.name} className="flex items-center gap-3 text-sm">
                    <span className="grid size-5 shrink-0 place-items-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      <Check className="size-3.5" strokeWidth={2.5} />
                    </span>
                    <span>{feature.name}</span>
                    <span className="ml-auto text-muted-foreground">Included</span>
                  </li>
                ))}
              </ul>

              <Button
                type="button"
                variant={plan.highlight ? "default" : "secondary"}
                size="lg"
                className="mt-8 w-full"
                onClick={() => onPlanSelect?.(plan.id, selectedCycle)}
                disabled={plan.disabled || yearlyUnavailable}
              >
                {yearlyUnavailable ? "Yearly coming soon" : plan.buttonText}
              </Button>
            </article>
          );
        })}
      </div>

      {showFooter ? (
        <div className="flex flex-col gap-4 border-x border-b bg-muted/30 p-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-medium">
            {footerText ??
              "Pre-negotiated discounts are available to early-stage startups and nonprofits."}
          </p>
          <Button variant="secondary" onClick={onFooterButtonClick}>
            {footerButtonText ?? "Apply now"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
