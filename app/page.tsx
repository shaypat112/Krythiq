import LandingPage from "./landing-page/page";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Krythiq — Understand your code. Ship with confidence.",
  description: "Scan a repository for security, architecture, and performance findings with clear evidence linked to your code.",
};

export default function Home() {
  return <LandingPage />;
}
