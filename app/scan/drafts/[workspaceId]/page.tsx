import type { Metadata } from "next";
import { DraftWorkspaceClient } from "./draft-workspace-client";

export const metadata: Metadata = { title: "Draft workspace - Krythiq" };

export default async function DraftWorkspacePage({ params }: { params: Promise<{ workspaceId: string }> }) {
  const { workspaceId } = await params;
  return <DraftWorkspaceClient workspaceId={workspaceId} />;
}
