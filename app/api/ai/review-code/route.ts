import { NextResponse } from "next/server";
import {
  RequestAuthError,
  requireRequestAuth,
} from "@/app/lib/server/supabaseRest";

export const runtime = "nodejs";

/**
 * The former implementation invoked an unversioned local Python prototype that
 * was not installed or started by the application. Keep the route explicit so
 * existing clients receive an honest, stable response while the feature is
 * unavailable.
 */
export async function POST(request: Request) {
  try {
    requireRequestAuth(request);
    return NextResponse.json(
      {
        error: "Code review is not implemented",
        code: "FEATURE_NOT_IMPLEMENTED",
      },
      { status: 501 },
    );
  } catch (error: unknown) {
    if (error instanceof RequestAuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Code-review availability check failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
