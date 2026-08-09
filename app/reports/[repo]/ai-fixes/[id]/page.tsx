import type { Metadata } from "next";
import { AiFixDetailClient } from "../../../components/AiFixDetailClient";

export const metadata: Metadata = {
  title: "AI fix details - Krythiq",
  description: "The exact file, code, and suggested replacement from a repository review.",
};

export default async function AiFixPage({ params }: { params: Promise<{ repo: string; id: string }> }) {
  const { repo, id } = await params;
  return <AiFixDetailClient repo={decodeURIComponent(repo)} suggestionId={id} />;
}
