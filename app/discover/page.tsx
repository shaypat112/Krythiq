import type { Metadata } from "next";
import { DiscoverClient } from "./DiscoverClient";

export const metadata: Metadata = {
  title: "Explore - Krythiq",
  description: "Explore verified projects, security progress, and scan milestones from the Krythiq community.",
};

export default function DiscoverPage() {
  return <DiscoverClient />;
}
