import { describe, it, expect } from "vitest";
import { isValidCashbackAddition } from "./walletAdjustment";

describe("isValidCashbackAddition", () => {
  it("given a positive amount and a reason > then valid", () => {
    expect(isValidCashbackAddition("100", "Goodwill bonus")).toBe(true);
  });

  it("given an empty amount > then invalid", () => {
    expect(isValidCashbackAddition("", "reason")).toBe(false);
  });

  it("given a zero amount > then invalid", () => {
    expect(isValidCashbackAddition("0", "reason")).toBe(false);
  });

  it("given a negative amount > then invalid", () => {
    expect(isValidCashbackAddition("-50", "reason")).toBe(false);
  });

  it("given a non-numeric amount > then invalid", () => {
    expect(isValidCashbackAddition("abc", "reason")).toBe(false);
  });

  it("given a blank reason > then invalid", () => {
    expect(isValidCashbackAddition("100", "   ")).toBe(false);
  });
});
