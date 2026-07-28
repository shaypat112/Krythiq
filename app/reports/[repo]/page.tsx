import type { Metadata } from "next";
import { ReportDetailClient } from "../components/ReportDetailClient";

export const metadata: Metadata = {
  title: "Report - Krythiq",
  description: "Detailed repository scan report.",
};

export default async function ReportPage({
  params,
}: {
  params: Promise<{ repo: string }>;
}) {
  const { repo } = await params;
  return <ReportDetailClient repo={decodeURIComponent(repo)} />;
}
