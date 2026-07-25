"use client";

import dynamic from "next/dynamic";

import type { GlobeArc, GlobeLocation } from "@/components/ui/globe";

const World = dynamic(
  () => import("@/components/ui/globe").then((module) => module.World),
  { ssr: false },
);

const partnerLocations: GlobeLocation[] = [
  {
    id: "finero",
    name: "Finero",
    city: "Dallas, Texas",
    category: "Financial technology",
    audience: "Technology",
    description: "Earlier vulnerability discovery and focused remediation for production teams.",
    lat: 32.7767,
    lng: -96.797,
    color: "#a78bfa",
  },
  {
    id: "bp-catawba",
    name: "BP Gas Station",
    city: "Catawba, North Carolina",
    category: "Retail infrastructure",
    audience: "Enterprise",
    description: "Continuous review for customer-facing production systems.",
    lat: 35.7074,
    lng: -81.0756,
    color: "#34d399",
  },
  {
    id: "charlotte-student-hub",
    name: "Charlotte Student Hub",
    city: "Charlotte, North Carolina",
    category: "Developer education",
    audience: "Education",
    description: "Simple repository architecture and secure-engineering guidance for student developers.",
    lat: 35.2271,
    lng: -80.8431,
    color: "#38bdf8",
  },
];

const partnerArcs: GlobeArc[] = [
  { startLat: 32.7767, startLng: -96.797, endLat: 35.7074, endLng: -81.0756, altitude: 0.12, color: "#a78bfa" },
  { startLat: 35.7074, startLng: -81.0756, endLat: 35.2271, endLng: -80.8431, altitude: 0.06, color: "#34d399" },
  { startLat: 35.2271, startLng: -80.8431, endLat: 32.7767, endLng: -96.797, altitude: 0.14, color: "#38bdf8" },
];

export default function GlobeDemo({
  filter = "All",
}: {
  filter?: "All" | GlobeLocation["audience"];
}) {
  const visibleLocations =
    filter === "All"
      ? partnerLocations
      : partnerLocations.filter((location) => location.audience === filter);
  const visibleIds = new Set(visibleLocations.map((location) => location.id));
  const visibleArcs =
    filter === "All" || visibleIds.size > 1 ? partnerArcs : [];

  return (
    <div
      className="relative h-[22rem] w-full overflow-hidden rounded-[2rem] border border-border/70 bg-[radial-gradient(circle_at_center,rgba(99,102,241,.16),transparent_58%)] sm:h-[30rem]"
      aria-label="Interactive globe showing Votrio partner connections"
      role="img"
    >
      <World arcs={visibleArcs} locations={visibleLocations} />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background to-transparent" />
      <div className="pointer-events-none absolute left-5 top-5 rounded-full border border-border/70 bg-background/70 px-3 py-1.5 text-xs text-muted-foreground backdrop-blur">
        Drag to explore · Hover a partner pin
      </div>
    </div>
  );
}
