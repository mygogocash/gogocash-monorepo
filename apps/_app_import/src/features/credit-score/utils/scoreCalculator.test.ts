import { describe, expect, it } from "vitest";
import {
  calculateCreditScore,
  getPointsToTrusted,
  getScoreBreakdown,
  getStreakExpiryDays,
  getTier,
  type UserCreditData,
} from "./scoreCalculator";

function buildUser(overrides?: Partial<UserCreditData>): UserCreditData {
  return {
    monthlySpend: 0,
    monthlyTransactionCount: 0,
    emailVerified: false,
    phoneNumberVerified: false,
    profileComplete: false,
    trustedStreakMonths: 0,
    streakRewardStatus: "none",
    ...overrides,
  };
}

describe("scoreCalculator", () => {
  it("covers tier boundary scenarios", () => {
    expect(getTier(0).key).toBe("starter");
    expect(getTier(79).key).toBe("starter");
    expect(getTier(80).key).toBe("trusted");
    expect(getTier(100).key).toBe("trusted");
  });

  it("calculates score using monthly spend, transactions, and verification points", () => {
    expect(calculateCreditScore(buildUser())).toBe(0);
    expect(calculateCreditScore(buildUser({ monthlySpend: 1500 }))).toBe(20);
    expect(calculateCreditScore(buildUser({ monthlySpend: 3000 }))).toBe(40);
    expect(calculateCreditScore(buildUser({ monthlySpend: 9000 }))).toBe(40);
    expect(calculateCreditScore(buildUser({ monthlyTransactionCount: 5 }))).toBe(10);
    expect(calculateCreditScore(buildUser({ monthlyTransactionCount: 10 }))).toBe(20);
    expect(calculateCreditScore(buildUser({ monthlyTransactionCount: 999 }))).toBe(20);
    expect(
      calculateCreditScore(buildUser({ monthlySpend: 3000, monthlyTransactionCount: 10 }))
    ).toBe(60);
    expect(
      calculateCreditScore(
        buildUser({
          monthlySpend: 3000,
          monthlyTransactionCount: 10,
          emailVerified: true,
          phoneNumberVerified: true,
          profileComplete: true,
        })
      )
    ).toBe(100);
  });

  it("returns remaining points to trusted", () => {
    expect(getPointsToTrusted(0)).toBe(80);
    expect(getPointsToTrusted(40)).toBe(40);
    expect(getPointsToTrusted(79)).toBe(1);
    expect(getPointsToTrusted(72)).toBe(8);
    expect(getPointsToTrusted(80)).toBe(null);
    expect(getPointsToTrusted(100)).toBe(null);
  });

  it("builds score breakdown rows with expected CTA states", () => {
    const rows = getScoreBreakdown(
      buildUser({
        monthlySpend: 1200,
        monthlyTransactionCount: 4,
      })
    );
    expect(rows).toHaveLength(5);
    const spendRow = rows.find((row) => row.id === "spend");
    const transactionRow = rows.find((row) => row.id === "transactions");
    const emailRow = rows.find((row) => row.id === "email");
    expect(spendRow).toBeDefined();
    expect(spendRow?.subLabel).toContain("฿1,200 / ฿3,000");
    expect(transactionRow).toBeDefined();
    expect(transactionRow?.subLabel).toContain("4 transactions this month");
    expect(emailRow).toBeDefined();
    expect(emailRow?.ctaHref).toBe("/profile/info");
    expect(transactionRow?.ctaHref).toBe("/");

    const completedRows = getScoreBreakdown(
      buildUser({
        monthlySpend: 3000,
        monthlyTransactionCount: 10,
        emailVerified: true,
        phoneNumberVerified: true,
        profileComplete: true,
      })
    );
    expect(completedRows.every((row) => row.isComplete)).toBe(true);
    expect(completedRows.every((row) => row.ctaHref == null)).toBe(true);
  });

  it("returns streak expiry days safely for earned/redeemed/expired flows", () => {
    expect(getStreakExpiryDays("not-a-date")).toBe(0);
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    expect(getStreakExpiryDays(tomorrow)).toBeGreaterThanOrEqual(1);
    expect(getStreakExpiryDays(yesterday)).toBe(0);
  });
});
