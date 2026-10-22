import test from "node:test";
import assert from "node:assert/strict";
import {
  passwordRequirements,
  passwordValidationMessage,
} from "../src/account/password-policy.ts";

const valid = "SafePasscode12!";

test("registration password requires 12 characters and all required character classes", () => {
  assert.equal(passwordValidationMessage(valid), null);
  assert.deepEqual(passwordRequirements(valid).map((x) => x.satisfied), [true, true, true, true, true]);
  const scenarios = [
    { password: "Abcdef1!", missing: "12–128 characters" },
    { password: "UPPERCASE123!", missing: "lowercase letter" },
    { password: "lowercase123!", missing: "uppercase letter" },
    { password: "NoDigitsAllowed!", missing: "number" },
    { password: "NoSpecial12345", missing: "symbol" },
  ];
  for (const { password, missing } of scenarios) {
    const message = passwordValidationMessage(password);
    assert.ok(message, `Expected rejection for ${missing}`);
    assert.match(message!, new RegExp(missing));
  }
  assert.match(passwordValidationMessage("A".repeat(129))!, /12–128/);
  assert.match(passwordValidationMessage(undefined)!, /12–128/);
  assert.equal(passwordValidationMessage("CapsAndDigit9#"), null);
});
