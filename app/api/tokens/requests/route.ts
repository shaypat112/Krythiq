import { NextResponse } from "next/server";
import {
  adminSupabaseFetch,
  extractVerifiedGitHubLogin,
  fetchAuthUser,
} from "@/app/lib/server/admin";
import { requireVerifiedRequestAuth } from "@/app/lib/server/requestAuth";
import { RequestAuthError } from "@/app/lib/server/supabaseRest";
import { getSupabaseEnv } from "@/app/lib/server/supabaseRest";
import { createNotification } from "@/app/lib/server/notifications";

export const runtime = "nodejs";

const tokenAdminLogin = "shaypat112";

type TokenRequestRow = {
  id: string;
  user_id: string;
  amount: number;
  request_type: "test_tokens" | "refund";
  reason: string | null;
  status: "pending" | "approved" | "rejected";
  reviewed_at: string | null;
  created_at: string;
};

async function getAuthContext(request: Request) {
  const auth = await requireVerifiedRequestAuth(request);
  const authUser = await fetchAuthUser(auth.accessToken);
  return {
    ...auth,
    isAdmin:
      extractVerifiedGitHubLogin(authUser)?.toLowerCase() ===
        tokenAdminLogin.toLowerCase(),
  };
}

async function jsonRows(response: Response) {
  if (!response.ok) throw new Error(await response.text());
  return await response.json() as TokenRequestRow[];
}

export async function GET(request: Request) {
  try {
    const { userId, isAdmin } = await getAuthContext(request);
    const ownPath = `token_requests?user_id=eq.${userId}&select=id,user_id,amount,request_type,reason,status,reviewed_at,created_at&order=created_at.desc&limit=20`;
    const [ownRequests, pendingRequests] = await Promise.all([
      adminSupabaseFetch(ownPath).then(jsonRows),
      isAdmin
        ? adminSupabaseFetch(
            "token_requests?status=eq.pending&select=id,user_id,amount,request_type,reason,status,reviewed_at,created_at&order=created_at.asc&limit=100",
          ).then(jsonRows)
        : Promise.resolve([]),
    ]);

    const requesterIds = [...new Set(pendingRequests.map((item) => item.user_id))];
    const profiles = requesterIds.length
      ? await adminSupabaseFetch(
          `profiles?id=in.(${requesterIds.join(",")})&select=id,username,full_name`,
        ).then(async (response) => {
          if (!response.ok) return [];
          return await response.json() as Array<{
            id: string;
            username: string | null;
            full_name: string | null;
          }>;
        })
      : [];
    const profilesById = new Map(profiles.map((profile) => [profile.id, profile]));

    return NextResponse.json({
      isAdmin,
      adminLogin: tokenAdminLogin,
      ownRequests,
      pendingRequests: pendingRequests.map((item) => ({
        ...item,
        requester: profilesById.get(item.user_id) ?? null,
      })),
    });
  } catch (error) {
    if (error instanceof RequestAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load Token requests." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const { userId, accessToken } = await getAuthContext(request);
    const body = await request.json().catch(() => ({}));
    const amount = Number(body.amount);
    const requestType = body.requestType === "refund" ? "refund" : "test_tokens";
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";
    if (!Number.isInteger(amount) || amount < 1 || amount > 500) {
      return NextResponse.json(
        { error: "Request an amount between 1 and 500 Tokens." },
        { status: 400 },
      );
    }
    if (requestType === "refund" && (reason.length < 10 || reason.length > 1000)) {
      return NextResponse.json(
        { error: "Explain the refund request in 10 to 1,000 characters." },
        { status: 400 },
      );
    }

    const response = await adminSupabaseFetch("token_requests", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        user_id: userId,
        amount,
        request_type: requestType,
        reason: requestType === "refund" ? reason : null,
      }),
    });
    if (response.status === 409) {
      return NextResponse.json(
        { error: "You already have a pending Token request." },
        { status: 409 },
      );
    }
    const rows = await jsonRows(response);
    await createNotification({
      env: getSupabaseEnv(), accessToken, userId,
      type: requestType === "refund" ? "token.refund_requested" : "token.requested",
      data: { amount, request_type: requestType, message: requestType === "refund" ? `Your refund request for ${amount} Tokens was submitted for review.` : `Your request for ${amount} Tokens was submitted for review.` },
    }).catch(() => undefined);
    return NextResponse.json({ request: rows[0] }, { status: 201 });
  } catch (error) {
    if (error instanceof RequestAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create Token request." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const { userId, isAdmin } = await getAuthContext(request);
    if (!isAdmin) {
      return NextResponse.json({ error: "Admin access required." }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const requestId = typeof body.requestId === "string" ? body.requestId : "";
    const decision = body.decision;
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId) ||
      (decision !== "approved" && decision !== "rejected")
    ) {
      return NextResponse.json({ error: "Invalid review request." }, { status: 400 });
    }

    const lookup = await adminSupabaseFetch(`token_requests?id=eq.${requestId}&select=id,user_id,amount,request_type,status&limit=1`);
    const pendingRequest = lookup.ok ? (await lookup.json() as TokenRequestRow[])[0] : null;
    if (!pendingRequest || pendingRequest.status !== "pending") {
      return NextResponse.json({ error: "This Token request is no longer pending." }, { status: 409 });
    }

    const response = await adminSupabaseFetch("rpc/review_token_request", {
      method: "POST",
      body: JSON.stringify({
        request_id: requestId,
        reviewer_id: userId,
        decision,
      }),
    });
    if (!response.ok) {
      const message = await response.text();
      const status = message.includes("already reviewed") ? 409 : 400;
      return NextResponse.json({ error: "This Token request could not be reviewed." }, { status });
    }
    await createNotification({
      env: getSupabaseEnv(), accessToken: "", userId: pendingRequest.user_id,
      type: decision === "approved" ? "token.approved" : "token.rejected",
      data: { amount: pendingRequest.amount, request_type: pendingRequest.request_type, message: decision === "approved" ? `Your ${pendingRequest.request_type === "refund" ? "refund" : "Token"} request for ${pendingRequest.amount} Tokens was approved.` : `Your ${pendingRequest.request_type === "refund" ? "refund" : "Token"} request for ${pendingRequest.amount} Tokens was not approved.` },
      useServiceRole: true,
    }).catch(() => undefined);
    return NextResponse.json({ request: await response.json() });
  } catch (error) {
    if (error instanceof RequestAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to review Token request." },
      { status: 500 },
    );
  }
}
