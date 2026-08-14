import { NextResponse } from "next/server";
import { requireWorkspaceRequest } from "@/app/lib/server/repository-workspaces";
import { getWorkspaceSandboxProvider } from "@/app/lib/server/workspace-sandbox";
import { RequestAuthError } from "@/app/lib/server/supabaseRest";

export const runtime = "nodejs";
type Context = { params: Promise<{ workspaceId: string }> };

export async function GET(request: Request, { params }: Context) {
  try {
    const { workspaceId } = await params;
    await requireWorkspaceRequest(request, workspaceId);
    const provider = getWorkspaceSandboxProvider();
    return NextResponse.json({ available: provider.available, status: "stopped", message: provider.available ? null : "A CPU-, memory-, network-, and time-limited isolated runner must be configured before repository execution is enabled." });
  } catch (error) {
    if (error instanceof RequestAuthError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
  }
}
