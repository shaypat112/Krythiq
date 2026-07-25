"use client";

import { MultiStepLoader } from "@/components/ui/multi-step-loader";

const scanLoadingStates = [
  { text: "Validating repository access" },
  { text: "Reading repository structure" },
  { text: "Detecting manifests and frameworks" },
  { text: "Mapping services and trust boundaries" },
  { text: "Analyzing risky code paths" },
  { text: "Generating prioritized remediation" },
];

export default function MultiStepLoaderDemo({ loading }: { loading: boolean }) {
  return <MultiStepLoader loadingStates={scanLoadingStates} loading={loading} duration={1250} loop />;
}
