
import { Nav } from "./components/Nav";
import { Hero } from "./components/Hero";
import { SolutionFlow } from "./components/SolutionFlow";
import { ProductShowcase } from "./components/ProductShowcase";
import { FounderPost } from "./components/FounderPost";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(127,127,127,0.08),transparent_36%)]" />

      <Nav />

      <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
        <Hero />
        <FounderPost />
        <SolutionFlow />
        <ProductShowcase />
      </div>
    </div>
  );
}
