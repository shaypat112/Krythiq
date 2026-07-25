import type { Metadata } from "next";
import { FindingDetailClient } from "../../../components/FindingDetailClient";

export const metadata: Metadata = {
  title: "Finding details - Votrio",
  description: "Detailed repository finding, risk context, and remediation guidance.",
};

export default async function FindingPage({
  params,
}: {
  params: Promise<{ repo: string; id: string }>;
}) {
  const { repo, id } = await params;
  return <FindingDetailClient repo={decodeURIComponent(repo)} findingId={id} />;
}
