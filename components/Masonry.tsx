"use client";

import type { ReactNode } from "react";
import { cn } from "@/app/lib/utils";
import "./Masonry.css";

type MasonryProps = {
  children: ReactNode;
  className?: string;
};

/** A content-first masonry layout that supports full post cards, not only images. */
export default function Masonry({ children, className }: MasonryProps) {
  return <div className={cn("social-masonry", className)}>{children}</div>;
}
