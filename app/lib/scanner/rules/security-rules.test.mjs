import assert from "node:assert/strict";
import test from "node:test";
import ruleData from "./security-rules.json" with { type: "json" };
import policyData from "./scanner-policy.json" with { type: "json" };

const rules = new Map(ruleData.rules.map((rule) => [rule.id, rule]));
const matches = (id, source) => {
  const rule = rules.get(id);
  assert.ok(rule, `Missing rule ${id}`);
  return [...source.matchAll(new RegExp(rule.pattern, rule.flags))];
};

test("ruleset definitions are unique and valid", () => {
  assert.equal(ruleData.schemaVersion, 1);
  assert.equal(new Set(ruleData.rules.map((rule) => rule.id)).size, ruleData.rules.length);
  for (const rule of ruleData.rules) {
    assert.ok(rule.flags.includes("g"), `${rule.id} must be global`);
    assert.ok(rule.score >= 0 && rule.score <= 100, `${rule.id} score must be bounded`);
    assert.doesNotThrow(() => new RegExp(rule.pattern, rule.flags), `${rule.id} regex must compile`);
  }
});

test("scanner policy has bounded limits and normalized file selectors", () => {
  assert.equal(policyData.schemaVersion, 1);
  assert.ok(policyData.limits.maxFileBytes > 0);
  assert.ok(policyData.limits.maxFiles > 0);
  assert.ok(policyData.limits.maxScanBytes >= policyData.limits.maxFileBytes);
  assert.ok(policyData.extensions.every((extension) => extension.startsWith(".") && extension === extension.toLowerCase()));
  assert.equal(new Set(policyData.defaultIgnoreDirectories).size, policyData.defaultIgnoreDirectories.length);
});

test("code injection rules match their intended constructs", () => {
  assert.equal(matches("EVAL", "const value = eval(input);").length, 1);
  assert.equal(matches("CMD_INJECTION", "child_process.exec(command);").length, 1);
  assert.equal(matches("SHELL_INJECTION", "subprocess.run(command, shell=True)").length, 1);
});

test("credential rule captures the credential value for contextual validation", () => {
  const [match] = matches("HARDCODED_SECRET", "api_key = 'real-secret-value'");
  assert.equal(match?.[1], "real-secret-value");
});

test("browser and transport rules match unsafe settings", () => {
  assert.equal(matches("DOM_XSS_RISK", "element.innerHTML = userInput").length, 1);
  assert.equal(matches("TLS_VALIDATION_DISABLED", "rejectUnauthorized: false").length, 1);
  assert.equal(matches("TLS_VALIDATION_DISABLED_PYTHON", "verify = False").length, 1);
});
