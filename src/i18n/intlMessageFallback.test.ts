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
});
