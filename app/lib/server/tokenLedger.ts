import { NextResponse } from "next/server";
import { adminSupabaseFetch } from "./admin";
import { requireVerifiedRequestAuth } from "./requestAuth";
import { RequestAuthError } from "./supabaseRest";
import type { TokenAction } from "@/app/lib/tokens";
import { tokenActionCatalog } from "@/app/lib/tokens";

type Reservation = {
  usage_id: string | null;
  usage_status: "pending" | "completed" | "refunded" | "insufficient";
  token_cost: number;
  balance: number;
  cached_response: Record<string, unknown> | null;
  reservation_created: boolean;
};

async function rpc<T>(name: string, body: Record<string, unknown>) {
  const response = await adminSupabaseFetch(`rpc/${name}`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`Token ledger operation failed: ${await response.text()}`);
  return await response.json() as T;
}

export async function ensureTokenBalance(userId: string) {
  return rpc<number>("ensure_starter_tokens", { target_user_id: userId });
}

export async function loadTokenAccount(userId: string) {
  const balance = await ensureTokenBalance(userId);
  const response = await adminSupabaseFetch(
    `token_transactions?user_id=eq.${encodeURIComponent(userId)}&select=id,amount,transaction_type,description,created_at&order=created_at.desc&limit=50`,
  );
  if (!response.ok) throw new Error("Unable to load token history.");
  return { balance: Number(balance), transactions: await response.json() };
}

export function readIdempotencyKey(request: Request) {
  const value = request.headers.get("idempotency-key")?.trim() ?? "";
  return /^[A-Za-z0-9:_-]{8,160}$/.test(value) ? value : null;
}

export function reserveTokenUsage(userId: string, action: TokenAction, idempotencyKey: string) {
  return ensureScanTokenAction(action).then(() => rpc<Reservation[]>("reserve_ai_tokens", {
    target_user_id: userId,
    requested_action: action,
    request_idempotency_key: idempotencyKey,
  })).then((rows) => {
    if (!rows[0]) throw new Error("Token reservation returned no result.");
    return rows[0];
  });
}

async function ensureScanTokenAction(action: TokenAction) {
  if (action !== "scan_low" && action !== "scan_mid" && action !== "scan_high") return;
  const existing = await adminSupabaseFetch(
    `token_action_costs?action=eq.${encodeURIComponent(action)}&select=action,cost,enabled&limit=1`,
  );
  if (!existing.ok) throw new Error("Unable to verify the scan Token price.");
  const rows = await existing.json() as Array<{ action: string; cost: number; enabled: boolean }>;
  const expected = tokenActionCatalog[action];
  if (rows[0]?.enabled && Number(rows[0].cost) === expected.cost) return;

  const response = rows[0]
    ? await adminSupabaseFetch(`token_action_costs?action=eq.${encodeURIComponent(action)}`, {
        method: "PATCH",
        body: JSON.stringify({ cost: expected.cost, label: expected.label, enabled: true, updated_at: new Date().toISOString() }),
      })
    : await adminSupabaseFetch("token_action_costs", {
        method: "POST",
        body: JSON.stringify({ action, cost: expected.cost, label: expected.label, enabled: true }),
      });
  if (!response.ok) throw new Error("Unable to initialize the scan Token price.");
}

export function completeTokenUsage(userId: string, idempotencyKey: string, payload: Record<string, unknown>) {
  return rpc<number>("complete_ai_usage", {
    target_user_id: userId,
    request_idempotency_key: idempotencyKey,
    usable_response: payload,
  });
}

export function refundTokenUsage(userId: string, idempotencyKey: string, message: string) {
  return rpc<number>("refund_ai_usage", {
    target_user_id: userId,
    request_idempotency_key: idempotencyKey,
    failure_message: message,
  });
}

export async function runPaidAiAction(
  request: Request,
  action: TokenAction,
  execute: () => Promise<Record<string, unknown>>,
) {
  try {
    const { userId } = await requireVerifiedRequestAuth(request);
    const idempotencyKey = readIdempotencyKey(request);
    if (!idempotencyKey) {
      return NextResponse.json(
        { error: "A valid Idempotency-Key header is required.", code: "INVALID_IDEMPOTENCY_KEY" },
        { status: 400 },
      );
    }

    const reservation = await reserveTokenUsage(userId, action, idempotencyKey);

    if (reservation.usage_status === "insufficient") {
      return NextResponse.json({
        error: `This action costs ${reservation.token_cost} Tokens.`,
        code: "INSUFFICIENT_TOKENS",
        cost: reservation.token_cost,
        balance: Number(reservation.balance),
      }, { status: 402 });
    }
    if (reservation.usage_status === "completed" && reservation.cached_response) {
      return NextResponse.json({
        ...reservation.cached_response,
        tokenCharge: { cost: reservation.token_cost, balance: Number(reservation.balance), replayed: true },
      });
    }
    if (!reservation.reservation_created) {
      return NextResponse.json({
        error: reservation.usage_status === "pending"
          ? "An identical AI request is already processing."
          : "This request was previously refunded. Retry with a new idempotency key.",
        code: reservation.usage_status === "pending" ? "REQUEST_IN_PROGRESS" : "REQUEST_REFUNDED",
      }, { status: 409 });
    }

    try {
      const payload = await execute();
      const balance = await completeTokenUsage(userId, idempotencyKey, payload);
      return NextResponse.json({
        ...payload,
        tokenCharge: { cost: reservation.token_cost, balance: Number(balance), replayed: false },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "AI request failed";
      const balance = await refundTokenUsage(userId, idempotencyKey, message);
      return NextResponse.json({
        error: "AI generation failed. Your Tokens were refunded.",
        code: "AI_FAILED_REFUNDED",
        balance: Number(balance),
      }, { status: 502 });
    }
  } catch (error) {
    if (error instanceof RequestAuthError) {
      return NextResponse.json(
        { error: error.message, code: "UNAUTHORIZED" },
        { status: error.status },
      );
    }
    return NextResponse.json({ error: "Unable to process token charge." }, { status: 500 });
  }
}
