import { describe, expect, it } from "vitest";
import en from "../messages/en.json";
import { buildMessagesForLocale } from "./buildMessagesForLocale";

describe("buildMessagesForLocale", () => {
  it("applies pipeline so fragile keys exist on the merged catalog", () => {
    const base = { ...(en as Record<string, unknown>) };
    delete base.merchantCashbackTipsIllustrationAlt;
    delete base.withdrawFormCtaTitle;
    const out = buildMessagesForLocale(base, "en");
    expect(typeof out.merchantCashbackTipsIllustrationAlt).toBe("string");
    expect(String(out.merchantCashbackTipsIllustrationAlt).length).toBeGreaterThan(10);
    expect(out.withdrawFormCtaTitle).toBe("Confirm");
  });

  it("preserves Thai withdraw CTA merge", () => {
    const base = {} as Record<string, unknown>;
    const out = buildMessagesForLocale(base, "th");
    expect(out.withdrawFormCtaTitle).toBe("ยืนยัน");
  });
});
