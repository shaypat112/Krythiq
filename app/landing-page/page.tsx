
import { Nav } from "./components/Nav";
import { Hero } from "./components/Hero";
import { Problem } from "./components/Problem";
import { SolutionFlow } from "./components/SolutionFlow";



import { Footer } from "./components/Footer";


export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(127,127,127,0.08),transparent_36%)]" />

      <Nav />

      <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
        <Hero />

        <Problem />
        <SolutionFlow />
        <Footer />
      </div>
    </div>
  );
}
