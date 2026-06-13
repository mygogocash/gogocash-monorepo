import { describe, it, expect } from "vitest";
import {
  isValidTxHash,
  parseAmount,
  validateOptionalAmount,
  validateBoundedAmount,
} from "@/lib/formValidation";

describe("isValidTxHash", () => {
  const good = "0x" + "a".repeat(64);
  it("accepts a 0x-prefixed 64-hex hash", () => {
    expect(isValidTxHash(good)).toBe(true);
    expect(isValidTxHash(`  ${good}  `)).toBe(true);
  });
  it("rejects malformed hashes", () => {
    expect(isValidTxHash("")).toBe(false);
    expect(isValidTxHash("x")).toBe(false);
    expect(isValidTxHash("0x" + "a".repeat(63))).toBe(false);
    expect(isValidTxHash("0x" + "g".repeat(64))).toBe(false);
    expect(isValidTxHash(undefined)).toBe(false);
  });
});

describe("parseAmount", () => {
  it("parses finite numbers and strings", () => {
    expect(parseAmount("12.5")).toBe(12.5);
    expect(parseAmount(7)).toBe(7);
    expect(parseAmount(0)).toBe(0);
  });
  it("returns null for empty/invalid", () => {
    expect(parseAmount("")).toBeNull();
    expect(parseAmount(null)).toBeNull();
    expect(parseAmount(undefined)).toBeNull();
    expect(parseAmount("abc")).toBeNull();
    expect(parseAmount(".")).toBeNull();
  });
});

describe("validateOptionalAmount", () => {
  it("treats empty as valid (untouched optional field)", () => {
    expect(validateOptionalAmount("", "Payout")).toBeNull();
    expect(validateOptionalAmount(undefined, "Payout")).toBeNull();
  });
  it("rejects non-numbers and negatives", () => {
    expect(validateOptionalAmount("abc", "Sale amount")).toMatch(/number/);
    expect(validateOptionalAmount("-5", "Sale amount")).toMatch(
      /greater than 0/,
    );
  });
  it("rejects zero for sale amounts but allows it for payouts", () => {
    expect(validateOptionalAmount("0", "Sale amount")).toMatch(
      /greater than 0/,
    );
    expect(validateOptionalAmount("0", "Payout", true)).toBeNull();
  });
});

describe("validateBoundedAmount", () => {
  it("requires a number within range", () => {
    expect(validateBoundedAmount("abc", "Score", 0, 1000)).toMatch(/number/);
    expect(validateBoundedAmount("1200", "Score", 0, 1000)).toMatch(/between/);
    expect(validateBoundedAmount("750", "Score", 0, 1000)).toBeNull();
    expect(validateBoundedAmount("0", "Score", 0, 1000)).toBeNull();
  });
});
