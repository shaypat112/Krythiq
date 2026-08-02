
import { Nav } from "./components/Nav";
import { Hero } from "./components/Hero";
import { SolutionFlow } from "./components/SolutionFlow";
import { ProductShowcase } from "./components/ProductShowcase";
import { ProductVideoStory } from "@/app/components/ProductVideoStory";
import { Founder } from "./components/Founder";
import { ProductPaths } from "./components/ProductPaths";
import { LandingPricing } from "./components/LandingPricing";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(127,127,127,0.08),transparent_36%)]" />

      <Nav />

      <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
        <Hero />
        <ProductPaths />
        <SolutionFlow />
        <ProductShowcase />
        <LandingPricing />
        <ProductVideoStory
          className="border-t border-border py-20 sm:py-28"
          title="See Krythiq follow a risk through the repository."
          description="A short walkthrough of the scan, the evidence behind a finding, and the path to a fix you can review."
        />
        <Founder />
      </div>
    </div>
  );
}
