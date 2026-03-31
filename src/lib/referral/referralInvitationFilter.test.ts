import { describe, expect, it } from "vitest";
import type { ResponseReferralList } from "@/interfaces/referral";
import {
  inferReferralCategoryFromHeuristics,
  referralRowMatchesTab,
  resolveReferralRowCategory,
} from "./referralInvitationFilter";

function row(partial: Partial<ResponseReferralList>): ResponseReferralList {
  return {
    _id: "1",
    user_id: {} as ResponseReferralList["user_id"],
    conversion_id: 0,
    referral_id: {} as ResponseReferralList["referral_id"],
    point: 0,
    type: "",
    action: "",
    createdAt: new Date(),
    updatedAt: new Date(),
    __v: 0,
    ...partial,
  } as ResponseReferralList;
}

describe("referralRowMatchesTab", () => {
  it("all tab includes every row", () => {
    const r = row({ type: "x", action: "y" });
    expect(referralRowMatchesTab(r, "all")).toBe(true);
  });

  it("account tab matches signup-like heuristics", () => {
    expect(referralRowMatchesTab(row({ type: "signup", action: "" }), "account")).toBe(true);
    expect(referralRowMatchesTab(row({ type: "order", action: "placed" }), "account")).toBe(false);
  });

  it("shop tab matches purchase-like heuristics", () => {
    expect(referralRowMatchesTab(row({ type: "purchase", action: "" }), "shop")).toBe(true);
    expect(referralRowMatchesTab(row({ type: "signup", action: "" }), "shop")).toBe(false);
  });

  it("uses referral_category when present", () => {
    const account = row({ referral_category: "account", type: "order", action: "placed" });
    expect(referralRowMatchesTab(account, "account")).toBe(true);
    expect(referralRowMatchesTab(account, "shop")).toBe(false);

    const shop = row({ referral_category: "shop", type: "signup", action: "" });
    expect(referralRowMatchesTab(shop, "shop")).toBe(true);
    expect(referralRowMatchesTab(shop, "account")).toBe(false);
  });
});

describe("inferReferralCategoryFromHeuristics", () => {
  it("returns null when neither pattern matches", () => {
    expect(inferReferralCategoryFromHeuristics(row({ type: "unknown", action: "x" }))).toBeNull();
  });
});

describe("resolveReferralRowCategory", () => {
  it("prefers API category over heuristics", () => {
    expect(
      resolveReferralRowCategory(
        row({ referral_category: "shop", type: "signup", action: "complete" })
      )
    ).toBe("shop");
  });
});
