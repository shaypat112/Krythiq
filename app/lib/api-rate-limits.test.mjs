import assert from "node:assert/strict";
import test from "node:test";
import { apiPlanCatalog, normalizeApiLimits, planFromPriceId } from "./api-rate-limits.ts";

test("limits cannot exceed the active plan", () => {
  assert.deepEqual(
    normalizeApiLimits({ apiRequestsPerMinute: 9999, expensiveRequestsPerMinute: 9999 }, "free"),
    apiPlanCatalog.free.limits,
  );
});

test("users can lower limits within safe minimums", () => {
  assert.deepEqual(
    normalizeApiLimits({ apiRequestsPerMinute: 40, expensiveRequestsPerMinute: 2 }, "pro"),
    { apiRequestsPerMinute: 40, expensiveRequestsPerMinute: 2 },
  );
  assert.deepEqual(
    normalizeApiLimits({ apiRequestsPerMinute: 0, expensiveRequestsPerMinute: 0 }, "pro"),
    { apiRequestsPerMinute: 10, expensiveRequestsPerMinute: 1 },
  );
});

test("invalid settings fall back to plan defaults", () => {
  assert.deepEqual(normalizeApiLimits({}, "team"), apiPlanCatalog.team.limits);
});

test("billing price ids map to configured plans", () => {
  process.env.STRIPE_PRICE_PRO = "price_pro_test";
  process.env.STRIPE_PRICE_TEAM = "price_team_test";
  assert.equal(planFromPriceId("price_pro_test"), "pro");
  assert.equal(planFromPriceId("price_team_test"), "team");
  assert.equal(planFromPriceId("unknown"), "free");
});
