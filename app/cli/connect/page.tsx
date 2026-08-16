import type { Metadata } from "next";
import { CliConnectClient } from "./cli-connect-client";

export const metadata: Metadata = { title: "Connect CLI - Krythiq" };

export default async function CliConnectPage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const { code } = await searchParams;
  return <CliConnectClient initialCode={code ?? ""} />;
}
