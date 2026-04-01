import { describe, expect, it } from "vitest";
import { mergeMerchantCashbackTipsMessages } from "./merchantCashbackTipsMerge";

describe("mergeMerchantCashbackTipsMessages", () => {
  it("injects merchantCashbackTipsIllustrationAlt from static catalog", () => {
    const base = { someOtherKey: "x" } as Record<string, unknown>;
    const en = mergeMerchantCashbackTipsMessages(base, "en");
    expect(typeof en.merchantCashbackTipsIllustrationAlt).toBe("string");
    expect(String(en.merchantCashbackTipsIllustrationAlt)).toContain("Cashback tips");
    const th = mergeMerchantCashbackTipsMessages(base, "th");
    expect(String(th.merchantCashbackTipsIllustrationAlt).length).toBeGreaterThan(10);
  });
});
