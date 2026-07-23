import { describe, expect, it } from "vitest";

import { buildReferralCardCopy } from "./referralBonusCopy";

const fallback = {
  title: "10% Cashback Bonus",
  subtitle: "Share & earn 10% friend cashback payout",
  body: "Share your referral link. You earn 10% cashback payout whenever your friend receives cashback in their wallet.",
  actionLabel: "Share now",
};

describe("buildReferralCardCopy", () => {
  it("substitutes a live percent into the title, subtitle and body", () => {
    const copy = buildReferralCardCopy(20, fallback);
    expect(copy.title).toBe("20% Cashback Bonus");
    expect(copy.subtitle).toBe("Share & earn 20% friend cashback payout");
    expect(copy.body).toContain("You earn 20% cashback payout");
    // the CTA is not percentage-driven and is preserved verbatim
    expect(copy.actionLabel).toBe("Share now");
  });

  it("renders whole percents without a trailing decimal", () => {
    expect(buildReferralCardCopy(10, fallback).title).toBe("10% Cashback Bonus");
  });

  it("keeps one decimal for fractional percents", () => {
    expect(buildReferralCardCopy(12.5, fallback).title).toBe(
      "12.5% Cashback Bonus",
    );
  });

  it("falls back to the fixture copy when the percent is missing/invalid", () => {
    expect(buildReferralCardCopy(undefined, fallback)).toEqual(fallback);
    expect(buildReferralCardCopy(Number.NaN, fallback)).toEqual(fallback);
    expect(buildReferralCardCopy(-5, fallback)).toEqual(fallback);
    expect(buildReferralCardCopy(101, fallback)).toEqual(fallback);
  });

  it("handles a 0% percent explicitly (feature effectively off) via fallback", () => {
    // 0 means the payout engine credits nothing; showing "0%" would confuse,
    // so we keep the marketing fixture copy rather than advertise a 0 bonus.
    expect(buildReferralCardCopy(0, fallback)).toEqual(fallback);
  });
});
