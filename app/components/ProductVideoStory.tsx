"use client";

import { HeroVideoDialog } from "@/components/ui/hero-video-dialog";

const VIDEO_EMBED =
  "https://www.youtube.com/embed/-XcnVSCnt_U?start=336&autoplay=1&rel=0";
const VIDEO_THUMBNAIL =
  "https://img.youtube.com/vi/-XcnVSCnt_U/maxresdefault.jpg";

export function ProductVideoStory({
  title = "Watch how the product comes together.",
  description = "A practical walkthrough of the ideas and workflow behind Krythiq.",
  className = "",
}: {
  title?: string;
  description?: string;
  className?: string;
}) {
  return (
    <section className={className} aria-labelledby="product-video-title">
      <div className="mx-auto max-w-3xl text-center">
        <h2
          id="product-video-title"
          className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl"
        >
          {title}
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
          {description}
        </p>
      </div>
      <div className="relative mx-auto mt-10 max-w-5xl">
        <div aria-hidden className="absolute inset-x-[8%] -bottom-6 h-32 rounded-full bg-violet-500/20 blur-3xl" />
        <div className="relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#08090c] p-2 shadow-[0_40px_100px_-35px_rgba(0,0,0,.8)] sm:p-3">
          <div className="flex h-9 items-center gap-2 px-2 sm:h-10">
            <div className="flex gap-1.5" aria-hidden>
              <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
            </div>
            <span className="mx-auto -translate-x-5 font-mono text-[10px] text-white/35 sm:text-xs">krythiq · product walkthrough</span>
          </div>
          <HeroVideoDialog
            animationStyle="from-center"
            videoSrc={VIDEO_EMBED}
            thumbnailSrc={VIDEO_THUMBNAIL}
            thumbnailAlt="Play the Krythiq product walkthrough"
            className="overflow-hidden rounded-2xl border border-white/10 bg-black"
          />
        </div>
      </div>
    </section>
  );
}
