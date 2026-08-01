import { StaticTweetCard } from "@/components/ui/tweet-card";
import { FadeIn } from "../shared/FadeIn";

export function FounderPost() {
  return (
    <section
      className="relative border-t border-border py-20 sm:py-24"
      aria-labelledby="founder-post-heading"
    >
      <div aria-hidden className="absolute inset-x-[18%] top-1/2 h-36 -translate-y-1/2 rounded-full bg-violet-500/10 blur-3xl" />
      <FadeIn className="relative grid items-center gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:gap-16">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-violet-400">Founder log / 001</p>
          <h2 id="founder-post-heading" className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
            Built for the teams already moving too fast for old security tools.
          </h2>
          <p className="mt-4 max-w-lg text-sm leading-6 text-muted-foreground sm:text-base">
            The product thesis, without the enterprise pitch.
          </p>
        </div>
        <StaticTweetCard
          author="Shivang Patel"
          subtitle="Founder, Krythiq"
          avatarUrl="/krythiq_logo.jpeg"
          text="Small teams can ship a week of code before lunch. Security review should run at that speed too: show me what can break, where it starts, and the smallest safe fix. That’s why I’m building Krythiq."
          className="ml-auto text-left"
        />
      </FadeIn>
    </section>
  );
}
