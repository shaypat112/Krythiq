import type { Metadata } from "next";
import { DiscoverProfileClient } from "./DiscoverProfileClient";

export const metadata: Metadata = { title: "Community profile · Krythiq", description: "View a safe Krythiq community profile." };

export default async function DiscoverProfilePage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  return <DiscoverProfileClient userId={userId} />;
}
