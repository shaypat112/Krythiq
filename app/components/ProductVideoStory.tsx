"use client";

import { HeroVideoDialog } from "@/components/ui/hero-video-dialog";

const VIDEO_EMBED =
  "https://www.youtube.com/embed/-XcnVSCnt_U?start=336&autoplay=1&rel=0";
const VIDEO_THUMBNAIL =
  "https://img.youtube.com/vi/-XcnVSCnt_U/maxresdefault.jpg";

export function ProductVideoStory({
  eyebrow = "See the workflow",
  title = "Watch how the product comes together.",
  description = "A practical walkthrough of the ideas and workflow behind Votrio.",
  className = "",
}: {
  eyebrow?: string;
  title?: string;
  description?: string;
  className?: string;
}) {
  return (
    <section className={className} aria-labelledby="product-video-title">
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-violet-400">
          {eyebrow}
        </p>
        <h2
          id="product-video-title"
          className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl"
        >
          {title}
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
          {description}
        </p>
      </div>
      <div className="relative mx-auto mt-8 max-w-5xl">
        <div aria-hidden className="absolute inset-x-[10%] bottom-0 h-24 rounded-full bg-violet-500/15 blur-3xl" />
        <HeroVideoDialog
          animationStyle="from-center"
          videoSrc={VIDEO_EMBED}
          thumbnailSrc={VIDEO_THUMBNAIL}
          thumbnailAlt="Play the Votrio product walkthrough"
          className="relative overflow-hidden rounded-2xl"
        />
      </div>
    </section>
  );
}
