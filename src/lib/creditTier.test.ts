import { describe, it, expect } from "vitest";
import { tierFromScore, CREDIT_TIER_BADGE } from "./creditTier";

describe("tierFromScore", () => {
  it("given a score below 300 > returns bronze", () => {
    expect(tierFromScore(0)).toBe("bronze");
    expect(tierFromScore(299)).toBe("bronze");
  });

  it("given a score in [300, 600) > returns silver", () => {
    expect(tierFromScore(300)).toBe("silver");
    expect(tierFromScore(599)).toBe("silver");
  });

  it("given a score in [600, 800) > returns gold", () => {
    expect(tierFromScore(600)).toBe("gold");
    expect(tierFromScore(799)).toBe("gold");
  });

  it("given a score >= 800 > returns platinum", () => {
    expect(tierFromScore(800)).toBe("platinum");
    expect(tierFromScore(1000)).toBe("platinum");
  });
});

describe("CREDIT_TIER_BADGE", () => {
  it("has a class string for every tier", () => {
    for (const tier of ["bronze", "silver", "gold", "platinum"] as const) {
      expect(CREDIT_TIER_BADGE[tier]).toMatch(/bg-.+ text-.+/);
    }
  });
});
