"use client";

import { useState } from "react";
import { Gauge, Sparkles } from "lucide-react";
import { cn } from "@/app/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export type UsageBasedPricingProps = {
  className?: string;
  min?: number;
  max?: number;
  step?: number;
  snapTo?: number;
  value?: number;
  defaultValue?: number;
  onChange?: (value: number) => void;
  onChangeEnd?: (value: number) => void;
  currency?: string;
  basePrice?: number;
  includedCredits?: number;
  unitPricePerCredit?: number;
  unitLabel?: string;
  title?: string;
  subtitle?: string;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function UsageBasedPricing({
  className,
  min = 100,
  max = 5000,
  step = 100,
  snapTo,
  value: controlledValue,
  defaultValue = 1000,
  onChange,
  onChangeEnd,
  currency = "$",
  basePrice = 0,
  includedCredits = 0,
  unitPricePerCredit = 0.01,
  unitLabel = "Tokens",
  title = "Usage-based estimate",
  subtitle = "Explore an estimated monthly usage budget.",
}: UsageBasedPricingProps) {
  const [internalValue, setInternalValue] = useState(
    clamp(defaultValue, min, max),
  );
  const value = clamp(controlledValue ?? internalValue, min, max);
  const increment = snapTo ?? step;
  const extraUsage = Math.max(0, value - includedCredits);
  const estimatedPrice = basePrice + extraUsage * unitPricePerCredit;
  const percentage = ((value - min) / (max - min)) * 100;

  const updateValue = (nextValue: number) => {
    const next = clamp(
      Math.round(nextValue / increment) * increment,
      min,
      max,
    );
    if (controlledValue === undefined) setInternalValue(next);
    onChange?.(next);
  };

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="border-b bg-muted/20">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            <Gauge className="size-5" />
          </span>
          <div className="space-y-1">
            <CardTitle>{title}</CardTitle>
            <CardDescription>{subtitle}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-8 p-6 sm:p-8">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border bg-background p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Monthly usage
            </p>
            <p className="mt-2 text-3xl font-semibold tabular-nums">
              {value.toLocaleString()}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{unitLabel}</p>
          </div>
          <div className="rounded-xl border bg-background p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Estimated spend
            </p>
            <p className="mt-2 text-3xl font-semibold tabular-nums">
              {currency}
              {estimatedPrice.toFixed(2)}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">per month</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="relative pt-6">
            <div
              className="absolute top-0 -translate-x-1/2 rounded-md border bg-background px-2 py-1 text-xs font-semibold shadow-sm"
              style={{ left: `${percentage}%` }}
            >
              {value.toLocaleString()}
            </div>
            <input
              type="range"
              min={min}
              max={max}
              step={increment}
              value={value}
              aria-label={`Estimated monthly ${unitLabel}`}
              onChange={(event) => updateValue(Number(event.target.value))}
              onPointerUp={() => onChangeEnd?.(value)}
              onKeyUp={() => onChangeEnd?.(value)}
              className="h-2 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary"
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{min.toLocaleString()} {unitLabel}</span>
            <span>{max.toLocaleString()} {unitLabel}</span>
          </div>
        </div>

        <div className="flex gap-3 rounded-xl bg-primary/5 p-4 text-sm text-muted-foreground">
          <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" />
          <p>
            Includes {includedCredits.toLocaleString()} {unitLabel}; additional
            usage is estimated at {currency}{unitPricePerCredit.toFixed(2)} each.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default UsageBasedPricing;
