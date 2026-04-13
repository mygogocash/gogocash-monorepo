import { describe, expect, it } from "vitest";
import {
  calculateCreditScore,
  getNextTierThreshold,
  getPointsToNextTier,
  getTier,
  getTierKey,
  transactionPoints,
} from "./scoreCalculator";

describe("scoreCalculator", () => {
  it("caps transaction points at 40 for 51+ orders", () => {
    expect(transactionPoints(0)).toBe(0);
    expect(transactionPoints(51)).toBe(40);
    expect(transactionPoints(100)).toBe(40);
  });

  it("calculates full score from inputs", () => {
    expect(
      calculateCreditScore({
        transactionCount: 51,
        emailVerified: true,
        phoneNumberVerified: true,
        profileComplete: true,
      })
    ).toBe(100);
  });

  it("assigns tiers by thresholds", () => {
    expect(getTierKey(49)).toBe("standard");
    expect(getTierKey(50)).toBe("trusted");
    expect(getTierKey(79)).toBe("trusted");
    expect(getTierKey(80)).toBe("diamond");
    expect(getTier(85).key).toBe("diamond");
  });

  it("returns points to next tier", () => {
    expect(getPointsToNextTier(45)).toBe(5);
    expect(getPointsToNextTier(72)).toBe(8);
    expect(getPointsToNextTier(100)).toBe(null);
    expect(getNextTierThreshold(40)).toBe(50);
    expect(getNextTierThreshold(72)).toBe(80);
  });
});
