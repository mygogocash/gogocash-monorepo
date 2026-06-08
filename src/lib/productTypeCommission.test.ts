import { describe, it, expect } from "vitest";
import {
  netCommissionFromRaw,
  rawCommissionFromNet,
} from "@/lib/productTypeCommission";

describe("netCommissionFromRaw", () => {
  it("applies the 30% fee (raw × 0.7) and returns a string", () => {
    expect(netCommissionFromRaw("10")).toBe("7");
  });

  it("rounds to 2 decimals", () => {
    expect(netCommissionFromRaw("12.5")).toBe("8.75");
  });

  it("returns '' for blank or non-numeric input", () => {
    expect(netCommissionFromRaw("")).toBe("");
    expect(netCommissionFromRaw("abc")).toBe("");
  });

  it("rejects negative and non-finite values (not valid commission rates)", () => {
    expect(netCommissionFromRaw("-5")).toBe("");
    expect(netCommissionFromRaw("Infinity")).toBe("");
    expect(netCommissionFromRaw("-Infinity")).toBe("");
  });

  it("accepts zero", () => {
    expect(netCommissionFromRaw("0")).toBe("0");
  });
});

describe("rawCommissionFromNet", () => {
  it("reverses the 30% fee (net ÷ 0.7)", () => {
    expect(rawCommissionFromNet("7")).toBe("10");
  });

  it("returns '' for blank or non-numeric input", () => {
    expect(rawCommissionFromNet("")).toBe("");
    expect(rawCommissionFromNet("abc")).toBe("");
  });

  it("rejects negative and non-finite values", () => {
    expect(rawCommissionFromNet("-3.5")).toBe("");
    expect(rawCommissionFromNet("Infinity")).toBe("");
  });
});

describe("raw → net → raw round-trip", () => {
  it("recovers the original clean raw number", () => {
    expect(rawCommissionFromNet(netCommissionFromRaw("10"))).toBe("10");
    expect(rawCommissionFromNet(netCommissionFromRaw("12.5"))).toBe("12.5");
  });

  // The 2-decimal rounding makes the inverse lossy for values whose net is not
  // exactly representable — pin that so the round-trip isn't mistaken for an identity.
  it("is lossy when rounding drifts (documents the boundary)", () => {
    expect(rawCommissionFromNet(netCommissionFromRaw("0.05"))).not.toBe("0.05");
  });
});
