import assert from "node:assert/strict";
import test from "node:test";

import {
  isStrongPassword,
  isValidEmail,
  normalizeEmail,
  passwordRequirements,
} from "./auth-validation.ts";

test("normalizes and validates email addresses", () => {
  assert.equal(normalizeEmail("  DEV@Example.COM "), "dev@example.com");
  assert.equal(isValidEmail("dev@example.com"), true);
  assert.equal(isValidEmail("not-an-email"), false);
});

test("requires length, mixed case, a number, and a symbol", () => {
  assert.equal(isStrongPassword("Short1!"), false);
  assert.equal(isStrongPassword("longbutlowercase1!"), false);
  assert.equal(isStrongPassword("Production1!"), true);
  assert.equal(
    passwordRequirements("Production1!").every((item) => item.met),
    true,
  );
});
