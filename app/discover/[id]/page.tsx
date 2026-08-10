import type { Metadata } from "next";
import { PostDetailClient } from "./PostDetailClient";

export const metadata: Metadata = { title: "Post · Explore · Krythiq", description: "View a Krythiq community post." };

export default async function DiscoverPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PostDetailClient id={id} />;
}
