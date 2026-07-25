export type RuleValidator = (match: RegExpMatchArray, sourceLine: string) => boolean;

const nonPlaceholderSecret: RuleValidator = (match, sourceLine) => {
  const value = match[1]?.toLowerCase() ?? "";
  const placeholder = /^(?:changeme|example|placeholder|your[_-]|test(?:ing)?|dummy|fake|sample|redacted|x{4,})/.test(value);
  const documentation = /^\s*(?:\/\/|#|\*|<!--)/.test(sourceLine);
  return !placeholder && !documentation;
};

export const ruleValidators: Record<string, RuleValidator> = {
  non_placeholder_secret: nonPlaceholderSecret,
};
