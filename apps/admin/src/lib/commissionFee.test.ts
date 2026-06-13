import { describe, it, expect } from "vitest";
import {
  applyThirtyPercentFee,
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
