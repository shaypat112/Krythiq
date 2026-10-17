import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const moduleUrl = source => `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
const stateKey = "__krythiqPaidActionFixture";
const authModule = moduleUrl(`export class RequestAuthError extends Error { constructor(message,status=401){super(message);this.status=status;} }`);
const adminModule = moduleUrl(`export const adminSupabaseFetch = (...args) => globalThis.${stateKey}.fetch(...args);`);
async function loadModule(filename, replacements) {
  let source = await readFile(new URL(filename, import.meta.url), "utf8");
  for (const [specifier, target] of Object.entries(replacements)) source = source.replaceAll(`"${specifier}"`, JSON.stringify(target));
  source = source.replace('import "server-only";', "");
  return moduleUrl(ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText);
}
const cliAuth = await loadModule("./server/cliAuth.ts", { "./admin": adminModule, "./supabaseRest": authModule });
const ledger = await loadModule("./server/tokenLedger.ts", {
  "next/server": moduleUrl("export const NextResponse = Response;"),
  "./admin": adminModule,
  "./supabaseRest": authModule,
  "./cliAuth": cliAuth,
  "./requestAuth": moduleUrl(`export const requireVerifiedRequestAuth = async () => { globalThis.${stateKey}.browserAuth++; return {userId:"browser-user"}; };`),
  "@/app/lib/tokens": moduleUrl('export const tokenActionCatalog = {security_analysis:{cost:15,label:"Security analysis"}};'),
  "./plan-entitlements": moduleUrl("export const getUserEntitlements = async () => ({weeklyTokens:0,unlimitedTokens:false});"),
});
const { runPaidAiAction } = await import(ledger);

test("CLI paid actions verify terminal ownership, reserve once, replay, refund and preserve browser authentication", async () => {
  const fixture = { browserAuth: 0, calls: [], mode: "success", fetch: async (route, init) => {
    fixture.calls.push({ route, body: init?.body ? JSON.parse(init.body) : null });
    if (route === "rpc/authenticate_cli_session") return Response.json(fixture.mode === "revoked" ? [] : [{ user_id: "terminal-owner", token_id: "terminal-id" }]);
    if (route.startsWith("token_action_costs?")) return Response.json([{ action: "security_analysis", cost: 15, enabled: true }]);
    if (route === "rpc/reserve_ai_tokens") return Response.json([{ usage_status: fixture.mode === "insufficient" ? "insufficient" : fixture.mode === "replay" ? "completed" : "pending", token_cost: 15, balance: 27, reservation_created: fixture.mode !== "replay", cached_response: fixture.mode === "replay" ? { analysis: "Cached" } : null }]);
    if (["rpc/complete_ai_usage", "rpc/refund_ai_usage"].includes(route)) return Response.json(27);
    throw new Error(`Unexpected operation: ${route}`);
  } };
  globalThis[stateKey] = fixture;
  const request = token => new Request("https://www.krythiq.dev/api/ai/security-analysis", { method: "POST", headers: { Authorization: `Bearer ${token}`, "Idempotency-Key": "fixture-request-123" } });
  const credential = "kry_cli_" + "a".repeat(43);
  let executed = 0;
  const execute = async () => { executed++; return { analysis: "Reviewed" }; };
  try {
    const success = await runPaidAiAction(request(credential), "security_analysis", execute);
    assert.equal(success.status, 200);
    assert.equal((await success.json()).tokenCharge.balance, 27);
    assert.equal(fixture.browserAuth, 0);
    assert.equal(fixture.calls.find(call => call.route === "rpc/reserve_ai_tokens").body.target_user_id, "terminal-owner");
    assert.doesNotMatch(JSON.stringify(fixture.calls), new RegExp(credential));
    fixture.mode = "replay";
    const replay = await runPaidAiAction(request(credential), "security_analysis", execute);
    assert.equal((await replay.json()).tokenCharge.replayed, true);
    assert.equal(executed, 1);
    fixture.mode = "insufficient";
    assert.equal((await runPaidAiAction(request(credential), "security_analysis", execute)).status, 402);
    assert.equal(executed, 1);
    fixture.mode = "success";
    const failed = await runPaidAiAction(request(credential), "security_analysis", async () => { throw new Error("Provider unavailable"); });
    assert.equal(failed.status, 502);
    assert.equal((await failed.json()).code, "AI_FAILED_REFUNDED");
    assert.ok(fixture.calls.some(call => call.route === "rpc/refund_ai_usage"));
    fixture.mode = "revoked";
    const before = fixture.calls.filter(call => call.route === "rpc/reserve_ai_tokens").length;
    assert.equal((await runPaidAiAction(request(credential), "security_analysis", execute)).status, 401);
    assert.equal(fixture.calls.filter(call => call.route === "rpc/reserve_ai_tokens").length, before);
    fixture.mode = "success";
    assert.equal((await runPaidAiAction(request("browser-jwt"), "security_analysis", execute)).status, 200);
    assert.equal(fixture.browserAuth, 1);
  } finally { delete globalThis[stateKey]; }
});
