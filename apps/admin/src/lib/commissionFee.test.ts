import { describe, it, expect } from "vitest";
import {
  applyPlatformFee,
  applyThirtyPercentFee,
  reversePlatformFee,
  reverseThirtyPercentFee,
} from "./commissionFee";

describe("applyThirtyPercentFee", () => {
  it("given 10 > then 7 (raw minus 30%)", () => {
    expect(applyThirtyPercentFee(10)).toBe(7);
  });

  it("given 0 > then 0", () => {
    expect(applyThirtyPercentFee(0)).toBe(0);
  });

  it("given 5 > then 3.5", () => {
    expect(applyThirtyPercentFee(5)).toBe(3.5);
  });

  it("given 3.33 > then 2.33 (rounded to 2 decimals)", () => {
    expect(applyThirtyPercentFee(3.33)).toBe(2.33);
  });
});

describe("reverseThirtyPercentFee", () => {
  it("given 7 > then 10 (inverse of applying the fee)", () => {
    expect(reverseThirtyPercentFee(7)).toBe(10);
  });

  it("given 0 > then 0", () => {
    expect(reverseThirtyPercentFee(0)).toBe(0);
  });

  it("given 3.5 > then 5", () => {
    expect(reverseThirtyPercentFee(3.5)).toBe(5);
  });
});

describe("applyPlatformFee", () => {
  it("given fee 30 > then matches applyThirtyPercentFee", () => {
    expect(applyPlatformFee(10, 30)).toBe(applyThirtyPercentFee(10));
    expect(applyPlatformFee(3.33, 30)).toBe(applyThirtyPercentFee(3.33));
  });

  it("given fee 20 > then raw × 0.8", () => {
    expect(applyPlatformFee(10, 20)).toBe(8);
  });

  it("given fee 0 > then returns the raw unchanged", () => {
    expect(applyPlatformFee(12.34, 0)).toBe(12.34);
  });

  it("rounds the net to 2 decimals", () => {
    expect(applyPlatformFee(3.33, 30)).toBe(2.33);
    expect(applyPlatformFee(1.234, 20)).toBe(0.99);
  });

  it("given non-finite or out-of-range fee > then falls back to the 30% default", () => {
    expect(applyPlatformFee(10, NaN)).toBe(7);
    expect(applyPlatformFee(10, -5)).toBe(7);
    expect(applyPlatformFee(10, 100)).toBe(7);
    expect(applyPlatformFee(10, 150)).toBe(7);
  });
});

describe("reversePlatformFee", () => {
  it("given fee 30 > then matches reverseThirtyPercentFee", () => {
    expect(reversePlatformFee(7, 30)).toBe(reverseThirtyPercentFee(7));
  });

  it("given fee 20 > then net ÷ 0.8", () => {
    expect(reversePlatformFee(8, 20)).toBe(10);
  });

  it("given fee 0 > then returns the net unchanged", () => {
    expect(reversePlatformFee(12.34, 0)).toBe(12.34);
  });

  it("given non-finite or out-of-range fee > then falls back to the 30% default", () => {
    expect(reversePlatformFee(7, NaN)).toBe(10);
    expect(reversePlatformFee(7, 100)).toBe(10);
  });

  it("round-trips apply → reverse for clean raw values", () => {
    expect(reversePlatformFee(applyPlatformFee(10, 20), 20)).toBe(10);
    expect(reversePlatformFee(applyPlatformFee(12.5, 30), 30)).toBe(12.5);
    expect(reversePlatformFee(applyPlatformFee(5, 0), 0)).toBe(5);
  });
});
