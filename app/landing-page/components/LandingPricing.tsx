"use client";

import { useRouter } from "next/navigation";
import { PricingTableOne } from "@/components/billingsdk/pricing-table-one";
import type { Plan } from "@/lib/billingsdk-config";

const scanPlans: Plan[] = [
  {
    id: "low",
    title: "Low Scan",
    description: "A quick repository pass.",
    currency: "",
    monthlyPrice: "30",
    yearlyPrice: "30",
    buttonText: "Start a low scan",
    features: [
      { name: "Up to 100 supported files", icon: "check" },
      { name: "Secrets and dangerous patterns", icon: "check" },
      { name: "Short evidence-backed summary", icon: "check" },
    ],
  },
  {
    id: "mid",
    title: "Medium Scan",
    description: "More context for active projects.",
    currency: "",
    monthlyPrice: "50",
    yearlyPrice: "50",
    buttonText: "Start a medium scan",
    highlight: true,
    features: [
      { name: "Up to 250 supported files", icon: "check" },
      { name: "Auth, API, input, and UI checks", icon: "check" },
      { name: "File-level fixes and evidence", icon: "check" },
    ],
  },
  {
    id: "high",
    title: "High Scan",
    description: "The broadest repository review.",
    currency: "",
    monthlyPrice: "70",
    yearlyPrice: "70",
    buttonText: "Start a high scan",
    features: [
      { name: "Up to 500 supported files", icon: "check" },
      { name: "Frontend, backend, and shared checks", icon: "check" },
      { name: "Complete remediation report", icon: "check" },
    ],
  },
];

export function LandingPricing() {
  const router = useRouter();

  return (
    <PricingTableOne
      plans={scanPlans}
      title="Pay for the depth you need."
      description="Repository scans use Tokens from your dashboard balance. The CLI documentation remains free."
      onPlanSelect={(tier) => router.push(`/scan?tier=${tier}`)}
      billingMode="one-time"
      priceUnit="Tokens per scan"
      size="small"
      theme="minimal"
      className="border-t border-border py-20 sm:py-24"
    />
  );
}
