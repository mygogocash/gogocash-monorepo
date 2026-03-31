import { describe, expect, it } from "vitest";
import { IntlError, IntlErrorCode } from "use-intl/core";
import { createGetMessageFallback } from "./intlMessageFallback";

const missingMessageError = () => new IntlError(IntlErrorCode.MISSING_MESSAGE);

describe("createGetMessageFallback", () => {
  it("returns header search strings for en", () => {
    const fb = createGetMessageFallback("en");
    expect(
      fb({
        error: missingMessageError(),
        key: "headerSearchTrendingTitle",
        namespace: undefined,
      })
    ).toBe("Popular right now");
  });

  it("returns header search strings for th", () => {
    const fb = createGetMessageFallback("th");
    expect(
      fb({
        error: missingMessageError(),
        key: "headerSearchTrendingTitle",
        namespace: undefined,
      })
    ).toBe("ยอดนิยมตอนนี้");
  });

  it("returns wallet status filter labels for en, th, and jp", () => {
    expect(
      createGetMessageFallback("en")({
        error: missingMessageError(),
        key: "walletTransactionsStatusFilterAll",
        namespace: undefined,
      })
    ).toBe("All statuses");
    expect(
      createGetMessageFallback("th")({
        error: missingMessageError(),
        key: "walletTransactionsStatusFilterAll",
        namespace: undefined,
      })
    ).toBe("ทุกสถานะ");
    expect(
      createGetMessageFallback("jp")({
        error: missingMessageError(),
        key: "walletTransactionsStatusFilterAll",
        namespace: undefined,
      })
    ).toBe("すべてのステータス");
  });

  it("falls back to namespace.key for unknown keys", () => {
    const fb = createGetMessageFallback("en");
    expect(
      fb({
        error: missingMessageError(),
        key: "unknownKey",
        namespace: "ns",
      })
    ).toBe("ns.unknownKey");
  });

  it("returns missing orders strings from locale JSON for en and th", () => {
    expect(
      createGetMessageFallback("en")({
        error: missingMessageError(),
        key: "missingOrdersPageIntroSelfService",
        namespace: undefined,
      })
    ).toContain("Self-service form");
    expect(
      createGetMessageFallback("en")({
        error: missingMessageError(),
        key: "missingOrdersSectionPurchaseTitle",
        namespace: undefined,
      })
    ).toBe("Your purchase");
    expect(
      createGetMessageFallback("th")({
        error: missingMessageError(),
        key: "missingOrdersSectionPurchaseTitle",
        namespace: undefined,
      })
    ).toBe("รายละเอียดการซื้อ");
    expect(
      createGetMessageFallback("jp")({
        error: missingMessageError(),
        key: "missingOrdersPageIntroSelfService",
        namespace: undefined,
      })
    ).toContain("Self-service form");
  });

  it("returns withdraw form CTA strings for en and th", () => {
    expect(
      createGetMessageFallback("en")({
        error: missingMessageError(),
        key: "withdrawFormCtaTitle",
        namespace: undefined,
      })
    ).toBe("Confirm");
    expect(
      createGetMessageFallback("th")({
        error: missingMessageError(),
        key: "withdrawFormCtaSubtitle",
        namespace: undefined,
      })
    ).toBe("และถอนเงิน");
  });

  it("returns withdraw confirm Go to Wallet button for en and th", () => {
    expect(
      createGetMessageFallback("en")({
        error: missingMessageError(),
        key: "withdrawConfirmGoToWalletButton",
        namespace: undefined,
      })
    ).toBe("Go to Wallet");
    expect(
      createGetMessageFallback("th")({
        error: missingMessageError(),
        key: "withdrawConfirmGoToWalletButton",
        namespace: undefined,
      })
    ).toBe("ไปที่กระเป๋าเงิน");
  });

  it("returns withdraw confirm Continue Shopping for en and th", () => {
    expect(
      createGetMessageFallback("en")({
        error: missingMessageError(),
        key: "withdrawConfirmContinueShopping",
        namespace: undefined,
      })
    ).toBe("Continue Shopping");
    expect(
      createGetMessageFallback("th")({
        error: missingMessageError(),
        key: "withdrawConfirmContinueShopping",
        namespace: undefined,
      })
    ).toBe("ช้อปต่อ");
  });

  it("returns withdraw confirm review badge Pending for en and th", () => {
    expect(
      createGetMessageFallback("en")({
        error: missingMessageError(),
        key: "withdrawConfirmReviewBadge",
        namespace: undefined,
      })
    ).toBe("Pending");
    expect(
      createGetMessageFallback("th")({
        error: missingMessageError(),
        key: "withdrawConfirmReviewBadge",
        namespace: undefined,
      })
    ).toBe("รอดำเนินการ");
  });
});
