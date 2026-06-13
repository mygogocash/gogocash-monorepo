import { describe, expect, it } from "vitest";
import {
  getWithdrawConfirmActionCopy,
  getWithdrawFormCtaCopy,
  mergeWithdrawCtaMessages,
} from "./withdrawCtaMerge";

describe("mergeWithdrawCtaMessages", () => {
  it("fills missing withdraw CTA keys for en", () => {
    const out = mergeWithdrawCtaMessages({}, "en");
    expect(out.withdrawFormCtaTitle).toBe("Confirm");
    expect(out.withdrawFormCtaSubtitle).toBe("and withdraw");
  });

  it("fills missing withdraw CTA keys for th", () => {
    const out = mergeWithdrawCtaMessages({}, "th");
    expect(out.withdrawFormCtaTitle).toBe("ยืนยัน");
  });

  it("does not overwrite existing keys", () => {
    const out = mergeWithdrawCtaMessages({ withdrawFormCtaTitle: "Custom" }, "en");
    expect(out.withdrawFormCtaTitle).toBe("Custom");
  });

  it("fills missing withdraw confirm keys for en and th", () => {
    const enOut = mergeWithdrawCtaMessages({}, "en");
    expect(enOut.withdrawConfirmGoToWalletButton).toBe("Go to Wallet");
    expect(enOut.withdrawConfirmContinueShopping).toBe("Continue Shopping");
    expect(enOut.withdrawConfirmReviewBadge).toBe("Pending");
    const thOut = mergeWithdrawCtaMessages({}, "th");
    expect(thOut.withdrawConfirmGoToWalletButton).toBe("ไปที่กระเป๋าเงิน");
    expect(thOut.withdrawConfirmContinueShopping).toBe("ช้อปต่อ");
    expect(thOut.withdrawConfirmReviewBadge).toBe("รอดำเนินการ");
  });
});

describe("getWithdrawConfirmActionCopy", () => {
  it("returns en strings for non-th locales", () => {
    expect(getWithdrawConfirmActionCopy("en")).toEqual({
      goToWallet: "Go to Wallet",
      continueShopping: "Continue Shopping",
      reviewBadge: "Pending",
    });
    expect(getWithdrawConfirmActionCopy("jp")).toEqual(getWithdrawConfirmActionCopy("en"));
  });

  it("returns th strings for th", () => {
    expect(getWithdrawConfirmActionCopy("th")).toEqual({
      goToWallet: "ไปที่กระเป๋าเงิน",
      continueShopping: "ช้อปต่อ",
      reviewBadge: "รอดำเนินการ",
    });
  });
});

describe("getWithdrawFormCtaCopy", () => {
  it("returns en copy for non-th locales", () => {
    expect(getWithdrawFormCtaCopy("en")).toEqual({
      title: "Confirm",
      subtitle: "and withdraw",
    });
    expect(getWithdrawFormCtaCopy("jp")).toEqual({
      title: "Confirm",
      subtitle: "and withdraw",
    });
  });

  it("returns th copy for th", () => {
    expect(getWithdrawFormCtaCopy("th")).toEqual({
      title: "ยืนยัน",
      subtitle: "และถอนเงิน",
    });
  });
});
