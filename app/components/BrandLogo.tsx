import Image from "next/image";

import { cn } from "@/app/lib/utils";

export function BrandLogo({
  className,
  priority = false,
}: {
  className?: string;
  priority?: boolean;
}) {
  return (
    <span
      className={cn(
        "relative inline-block shrink-0 overflow-hidden rounded-lg border border-white/10 bg-[#0b1016]",
        className,
      )}
    >
      <Image
        src="/krythiq_logo.jpeg"
        alt=""
        fill
        priority={priority}
        sizes="48px"
        className="scale-[1.7] object-cover object-center"
      />
    </span>
  );
}
