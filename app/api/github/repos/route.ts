import { NextResponse } from "next/server";
import {
  RequestAuthError,
  getSupabaseEnv,
  requireRequestAuth,
  supabaseFetch,
} from "@/app/lib/server/supabaseRest";
import { createNotification } from "@/app/lib/server/notifications";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const providerToken = body?.providerToken as string | undefined;
    const { accessToken, userId } = requireRequestAuth(request);

    if (!providerToken) {
      return NextResponse.json(
        { error: "Missing providerToken" },
        { status: 400 }
      );
    }
    const env = getSupabaseEnv();

    const ghRes = await fetch("https://api.github.com/user/repos?per_page=100", {
      headers: {
        Authorization: `Bearer ${providerToken}`,
        Accept: "application/vnd.github+json",
      },
    });

    if (!ghRes.ok) {
      const text = await ghRes.text();
      return NextResponse.json(
        { error: `GitHub API error: ${text}` },
        { status: ghRes.status }
      );
    }

    const repos = (await ghRes.json()) as Array<{
      id: number;
      full_name: string;
      private: boolean;
    }>;

    const payload = repos.map((repo) => ({
      user_id: userId,
      full_name: repo.full_name,
      private: repo.private,
      last_scanned_at: null,
    }));

    const profileUpsertRes = await supabaseFetch(env, "profiles", {
      method: "POST",
      accessToken,
      headers: {
        Prefer: "resolution=merge-duplicates",
      },
      body: JSON.stringify({
        id: userId,
        updated_at: new Date().toISOString(),
      }),
    });

    if (!profileUpsertRes.ok) {
      const text = await profileUpsertRes.text();
      return NextResponse.json(
        { error: `Failed to ensure profile: ${text}` },
        { status: 500 }
      );
    }

    const deleteRes = await supabaseFetch(
      env,
      `connected_repos?user_id=eq.${userId}`,
      {
        method: "DELETE",
        accessToken,
      },
    );

    if (!deleteRes.ok) {
      const text = await deleteRes.text();
      return NextResponse.json(
        { error: `Failed to clear repos: ${text}` },
        { status: 500 }
      );
    }

    const insertRes = await supabaseFetch(env, "connected_repos", {
      method: "POST",
      accessToken,
      headers: {
        Prefer: "return=representation",
      },
      body: JSON.stringify(payload),
    });

    if (!insertRes.ok) {
      const text = await insertRes.text();
      return NextResponse.json(
        { error: `Failed to store repos: ${text}` },
        { status: 500 }
      );
    }

    const stored = await insertRes.json();
    await createNotification({ env, accessToken, userId, type: "repository.synced", data: { repository_count: stored.length, message: `${stored.length} GitHub ${stored.length === 1 ? "repository is" : "repositories are"} synchronized and ready to scan.` } }).catch(() => undefined);
    return NextResponse.json({ repos: stored });
  } catch (error) {
    if (error instanceof RequestAuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
  }
}
