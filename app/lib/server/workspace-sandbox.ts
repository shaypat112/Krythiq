import "server-only";

export type WorkspaceRuntimeStatus = "queued" | "starting" | "running" | "failed" | "stopped";
export type WorkspaceRuntime = { id: string; status: WorkspaceRuntimeStatus; previewUrl: string | null; error: string | null; expiresAt: string };
export type SandboxLaunchInput = { workspaceId: string; repository: string; baseCommitSha: string; files: Array<{ path: string; content: string }> };

export interface WorkspaceSandboxProvider {
  readonly available: boolean;
  launch(input: SandboxLaunchInput): Promise<WorkspaceRuntime>;
  stop(runtimeId: string): Promise<void>;
}

class UnconfiguredSandboxProvider implements WorkspaceSandboxProvider {
  readonly available = false;
  async launch(): Promise<WorkspaceRuntime> { throw new Error("An isolated workspace runner is not configured."); }
  async stop(): Promise<void> { throw new Error("An isolated workspace runner is not configured."); }
}

export function getWorkspaceSandboxProvider(): WorkspaceSandboxProvider {
  return new UnconfiguredSandboxProvider();
}
