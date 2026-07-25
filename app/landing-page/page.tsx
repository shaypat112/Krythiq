
import { Nav } from "./components/Nav";
import { Hero } from "./components/Hero";
import { Problem } from "./components/Problem";
import { SolutionFlow } from "./components/SolutionFlow";
import { ProductShowcase } from "./components/ProductShowcase";
import { Founder } from "./components/Founder";
import { FinalCTA } from "./components/FinalCTA";
import { Footer } from "./components/Footer";
import { ProductVideoStory } from "@/app/components/ProductVideoStory";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(127,127,127,0.08),transparent_36%)]" />

      <Nav />

      <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
        <Hero />
        <ProductVideoStory
          className="py-16 sm:py-24"
          eyebrow="Product walkthrough"
          title="See the thinking behind Votrio."
          description="Watch the walkthrough, then connect a repository and turn the ideas into a real security workflow."
        />
        <Problem />
        <SolutionFlow />
        <ProductShowcase />
        <Founder />
        <FinalCTA />
        <Footer />
      </div>
    </div>
  );
}
