import { NextResponse } from "next/server";
import { runSingleFileScan } from "@/app/services/githubScanner";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const isGuest = !request.headers.has("authorization");
    if (isGuest && request.headers.get("cookie")?.includes("votrio_guest_scan=1")) {
      return NextResponse.json({ error: "Your free scan has been used. Sign in to run another." }, { status: 401 });
    }
    const formData = await request.formData();
    const file = formData.get("file");
    const failOn = formData.get("failOn");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Choose one source file to scan." }, { status: 400 });
    }

    const result = await runSingleFileScan(
      { name: file.name, content: await file.text() },
      { failOn: typeof failOn === "string" ? failOn as "low" | "medium" | "high" | "critical" : "high" },
    );

    const response = NextResponse.json({
      ...result,
      totalFindings: result.findings.length,
      intelligence: null,
      scan: null,
    });
    if (isGuest) response.cookies.set("votrio_guest_scan", "1", { path: "/", maxAge: 31536000, sameSite: "lax" });
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "File scan failed.";
    const status = message.includes("Unsupported") || message.includes("limit") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
