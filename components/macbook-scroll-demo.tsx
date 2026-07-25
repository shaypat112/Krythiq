import type { ReactNode } from "react";
import { MacbookScroll } from "@/components/ui/macbook-scroll";

export default function MacbookScrollDemo({ children }: { children: ReactNode }) {
  return (
    <div className="w-full">
      <MacbookScroll compact screen={children} showGradient={false} />
    </div>
  );
}
