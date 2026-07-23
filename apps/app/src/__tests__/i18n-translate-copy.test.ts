import { describe, expect, it } from "vitest";

import { translateCopy } from "@mobile/i18n/messages";

// translateCopy reuses the web ICU catalogs via reverse-lookup (shared English value -> catalog key
// -> active-locale string). Pure function, so it's unit-tested here in the source suite.
describe("translateCopy reverse-lookup catalog reuse", () => {
  it("translates shared English copy to Thai", () => {
    expect(translateCopy("Get started earning cashback", "th")).toBe(
      "เริ่มรับเงินคืนได้เลย",
    );
  });

  it("returns the English copy unchanged at the en locale", () => {
    expect(translateCopy("Get started earning cashback", "en")).toBe(
      "Get started earning cashback",
    );
  });

  it("falls back to the input string when no catalog key matches", () => {
    const orphan = "ZZZ string absent from every catalog ZZZ";
    expect(translateCopy(orphan, "th")).toBe(orphan);
  });

  it("translates mobile-only copy from the overlay catalog (no web equivalent)", () => {
    // "Date Range" has no web catalog match; it lives only in mobile-overlay.{en,th}.json,
    // merged into MESSAGES. Proves the overlay survives the reverse-lookup path.
    expect(translateCopy("Date Range", "th")).toBe("ช่วงวันที่");
  });

  it("translates customer coupon actions and details", () => {
    expect(translateCopy("Use coupon", "th")).toBe("ใช้คูปอง");
    expect(translateCopy("Read terms & conditions", "th")).toBe(
      "อ่านข้อกำหนดและเงื่อนไข",
    );
    expect(translateCopy("Valid from", "th")).toBe("ใช้ได้ตั้งแต่");
    expect(translateCopy("Coupon link unavailable", "th")).toBe(
      "ลิงก์คูปองไม่พร้อมใช้งาน",
    );
    expect(translateCopy("Coupon code unavailable", "th")).toBe(
      "รหัสคูปองไม่พร้อมใช้งาน",
    );
  });
});
