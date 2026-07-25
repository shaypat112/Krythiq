import ruleData from "./security-rules.json";
import policyData from "./scanner-policy.json";
import { ruleValidators, type RuleValidator } from "./validators";

export type SecurityRule = {
  id: string;
  pattern: RegExp;
  severity: "low" | "medium" | "high" | "critical";
  score: number;
  category: "code" | "secrets";
  message: string;
  suggestion: string;
  advisoryId: string;
  validator?: RuleValidator;
};

type RuleDefinition = {
  id: string;
  pattern: string;
  flags: string;
  severity: SecurityRule["severity"];
  score: number;
  category: SecurityRule["category"];
  message: string;
  suggestion: string;
  validator?: string;
};

function compileRules(): SecurityRule[] {
  if (ruleData.schemaVersion !== 1 || !Array.isArray(ruleData.rules)) {
    throw new Error("Unsupported security rule schema.");
  }

  const ids = new Set<string>();
  return (ruleData.rules as RuleDefinition[]).map((definition) => {
    if (!definition.id || ids.has(definition.id)) throw new Error(`Duplicate or missing security rule id: ${definition.id}`);
    if (!definition.flags.includes("g")) throw new Error(`Security rule ${definition.id} must use the global regex flag.`);
    if (!Number.isFinite(definition.score) || definition.score < 0 || definition.score > 100) {
      throw new Error(`Security rule ${definition.id} has an invalid score.`);
    }
    const validator = definition.validator ? ruleValidators[definition.validator] : undefined;
    if (definition.validator && !validator) throw new Error(`Security rule ${definition.id} references an unknown validator.`);

    ids.add(definition.id);
    return {
      id: definition.id,
      pattern: new RegExp(definition.pattern, definition.flags),
      severity: definition.severity,
      score: definition.score,
      category: definition.category,
      message: definition.message,
      suggestion: definition.suggestion,
      advisoryId: `VOTRIO-${definition.id}`,
      validator,
    };
  });
}

export const securityRuleRegistry = Object.freeze({
  schemaVersion: ruleData.schemaVersion,
  rulesetVersion: ruleData.rulesetVersion,
  rules: Object.freeze(compileRules()),
});

function positiveInteger(value: number, label: string) {
  if (!Number.isSafeInteger(value) || value <= 0) throw new Error(`Scanner policy ${label} must be a positive integer.`);
  return value;
}

if (policyData.schemaVersion !== 1) throw new Error("Unsupported scanner policy schema.");

export const scannerPolicy = Object.freeze({
  schemaVersion: policyData.schemaVersion,
  limits: Object.freeze({
    maxFileBytes: positiveInteger(policyData.limits.maxFileBytes, "maxFileBytes"),
    maxFiles: positiveInteger(policyData.limits.maxFiles, "maxFiles"),
    maxScanBytes: positiveInteger(policyData.limits.maxScanBytes, "maxScanBytes"),
  }),
  extensions: new Set(policyData.extensions.map((extension) => extension.toLowerCase())),
  securityConfigFiles: new Set(policyData.securityConfigFiles.map((file) => file.toLowerCase())),
  defaultIgnoreDirectories: new Set(policyData.defaultIgnoreDirectories),
  manifestFiles: Object.freeze([...policyData.manifestFiles]),
});
