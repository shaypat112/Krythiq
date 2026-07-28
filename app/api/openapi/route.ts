import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    openapi: "3.0.3",
    info: {
      title: "Krythiq API",
      version: "0.2.0",
      description: "Security scanning, settings, and session APIs.",
    },
    paths: {
      "/api/notifications": {
        get: { summary: "List notifications" },
        post: { summary: "Mark notifications read" },
      },
      "/api/settings/load": {
        post: { summary: "Load settings" },
      },
      "/api/settings/save": {
        post: { summary: "Save settings" },
      },
      "/api/settings/test-webhook": {
        post: { summary: "Send test webhook" },
      },
      "/api/webhooks/retry": {
        post: { summary: "Retry failed webhook deliveries" },
      },
      "/api/scan/github": {
        post: { summary: "Run GitHub scan" },
      },
    },
  });
}
