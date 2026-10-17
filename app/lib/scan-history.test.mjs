import assert from "node:assert/strict";
import test from "node:test";
import { recentScansQuery, summarizeScanHistory, filterScanHistory } from "./scan-history.ts";

const scans = [
  { repo: "owner/api", created_at: "2026-10-10T00:00:00Z", severity: "critical", score: 90, issues: 8 },
  { repo: "owner/web", created_at: "2026-10-12T00:00:00Z", severity: "medium", score: 55, issues: 4 },
  { repo: "owner/api", created_at: "2026-10-14T00:00:00Z", severity: "low", score: 30, issues: 1, source: "cli" },
];

test("history picks the latest evidence even when scans arrive out of order", () => {
  const result = summarizeScanHistory(scans);
  const api = result.find(item => item.repo === "owner/api");
  assert.equal(api.totalScans, 2);
  assert.equal(api.latest.severity, "low");
  assert.equal(api.latest.source, "cli");
});

test("history filters use the latest severity, support owner search, and do not mutate summaries", () => {
  const summaries = summarizeScanHistory(scans);
  const originalOrder = summaries.map(item => item.repo);
  assert.equal(filterScanHistory(summaries, { query: "  OWNER/ ", severity: "low", sort: "recent" })[0].repo, "owner/api");
  assert.deepEqual(filterScanHistory(summaries, { query: "", severity: "critical", sort: "recent" }), []);
  assert.equal(filterScanHistory(summaries, { query: "", severity: "all", sort: "risk" })[0].repo, "owner/web");
  assert.equal(filterScanHistory(summaries, { query: "", severity: "all", sort: "issues" })[0].repo, "owner/web");
  assert.equal(filterScanHistory(summaries, { query: "", severity: "all", sort: "recent" })[0].repo, "owner/api");
  assert.deepEqual(summaries.map(item => item.repo), originalOrder);
});

test("recent scans remain owner-scoped, filter team before limiting, and omit finding payloads", () => {
  for (const team of [null, "team-one"]) {
    const query = new URLSearchParams(recentScansQuery("viewer", team));
    assert.equal(query.get("user_id"), "eq.viewer");
    assert.equal(query.get("findings->>team_id"), team ? "eq.team-one" : "is.null");
    assert.equal(query.get("limit"), "50");
    assert.equal(query.get("select"), "repo,created_at,severity,issues,score,source:findings->>source");
    assert.ok(!query.get("select").split(",").includes("findings"));
  }
  const query = new URLSearchParams(recentScansQuery("viewer", "team&user_id=eq.other"));
  assert.equal(query.get("user_id"), "eq.viewer");
  assert.equal(query.getAll("user_id").length, 1);
});
