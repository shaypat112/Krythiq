import { StaticTweetCard } from "@/components/ui/tweet-card";
import { FadeIn } from "../shared/FadeIn";

export function FounderPost() {
  return (
    <section
      className="border-t border-border py-24"
      aria-labelledby="founder-post-heading"
    >
      <FadeIn className="mx-auto max-w-2xl text-center">
        <h2
          id="founder-post-heading"
          className="text-3xl font-semibold tracking-tight sm:text-4xl"
        >
          Building Krythiq in public.
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
          A note from the founder on why the product exists.
        </p>
        <StaticTweetCard
          author="Shivang Patel"
          subtitle="Founder, Krythiq"
          avatarUrl="/krythiq_logo.jpeg"
          text="I’m building Krythiq for teams shipping AI-generated code faster than traditional review can keep up. It maps repository context, surfaces security risk, reviews frontend quality, and recommends established components before weak patterns reach production. Shipping fast shouldn’t mean shipping blind."
          className="mx-auto mt-8 text-left"
        />
      </FadeIn>
    </section>
  );
}
