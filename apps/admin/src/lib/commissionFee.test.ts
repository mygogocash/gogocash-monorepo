import { describe, it, expect } from "vitest";
import {
  applyPlatformFee,
  applyThirtyPercentFee,
  reversePlatformFee,
  reverseThirtyPercentFee,
  reconcileCommissionOnFeeChange,
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

describe("reconcileCommissionOnFeeChange (PR #283 review HIGH-2)", () => {
  // When the Fee Structure rate resolves after the admin already typed (or
  // partner-synced) a raw %, the RAW is ground truth: the stored net must be
  // recomputed with the real fee. When the raw was only seeded from the
  // stored net, the stored net is ground truth: re-derive the raw display.
  it("edited raw wins: stored net is recomputed with the new fee", () => {
    expect(
      reconcileCommissionOnFeeChange({
        rawEdited: true,
        raw: "10",
        storedNet: 7, // baked at the 30% fallback
        feePercent: 20,
      }),
    ).toEqual({ raw: "10", storedNet: 8 });
  });

  it("unedited raw is re-derived from the stored net (passive open stays safe)", () => {
    expect(
      reconcileCommissionOnFeeChange({
        rawEdited: false,
        raw: "10", // seeded at the fallback fee
        storedNet: 7,
        feePercent: 30,
      }),
    ).toEqual({ raw: "10", storedNet: 7 });
    expect(
      reconcileCommissionOnFeeChange({
        rawEdited: false,
        raw: "23.33",
        storedNet: 7,
        feePercent: 20,
      }),
    ).toEqual({ raw: "8.75", storedNet: 7 });
  });

  it("edited-but-blank raw clears the stored net", () => {
    expect(
      reconcileCommissionOnFeeChange({
        rawEdited: true,
        raw: "  ",
        storedNet: 7,
        feePercent: 20,
      }),
    ).toEqual({ raw: "  ", storedNet: null });
  });

  it("no stored net and unedited raw yields an empty raw display", () => {
    expect(
      reconcileCommissionOnFeeChange({
        rawEdited: false,
        raw: "",
        storedNet: null,
        feePercent: 20,
      }),
    ).toEqual({ raw: "", storedNet: null });
  });
});
