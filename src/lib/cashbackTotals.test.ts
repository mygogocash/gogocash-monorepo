import { describe, it, expect } from "vitest";
import { totalEarnedCashback } from "./cashbackTotals";

describe("totalEarnedCashback", () => {
  it("given approved conversion cashback and approved withdrawals > sums both", () => {
    const detail = {
      totalsByStatusAndCurrency: [
        { status: "approved", totalTHB: 165 },
        { status: "pending", totalTHB: 999 },
      ],
      withdrawList: [
        { status: "approved", amount_net: 50 },
        { status: "approved", amount_net: 30 },
      ],
    };
    expect(totalEarnedCashback(detail)).toBe(245); // 165 + (50 + 30)
  });

  it("given no approved conversion row > counts only withdrawals", () => {
    const detail = {
      totalsByStatusAndCurrency: [{ status: "pending", totalTHB: 999 }],
      withdrawList: [{ status: "approved", amount_net: 40 }],
    };
    expect(totalEarnedCashback(detail)).toBe(40);
  });

  it("given non-approved withdrawals > excludes them from the sum", () => {
    const detail = {
      totalsByStatusAndCurrency: [{ status: "approved", totalTHB: 100 }],
      withdrawList: [
        { status: "pending", amount_net: 70 },
        { status: "rejected", amount_net: 20 },
        { status: "approved", amount_net: 10 },
      ],
    };
    expect(totalEarnedCashback(detail)).toBe(110); // 100 + 10
  });

  it("given a withdrawal missing amount_net > treats it as zero", () => {
    const detail = {
      totalsByStatusAndCurrency: [{ status: "approved", totalTHB: 5 }],
      withdrawList: [{ status: "approved" }],
    };
    expect(totalEarnedCashback(detail)).toBe(5);
  });

  it("given null or undefined detail > returns zero", () => {
    expect(totalEarnedCashback(null)).toBe(0);
    expect(totalEarnedCashback(undefined)).toBe(0);
  });

  it("given empty rows > returns zero", () => {
    expect(
      totalEarnedCashback({ totalsByStatusAndCurrency: [], withdrawList: [] }),
    ).toBe(0);
  });
});
