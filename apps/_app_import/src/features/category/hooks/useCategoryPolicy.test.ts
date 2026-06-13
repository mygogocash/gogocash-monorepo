import { describe, expect, it } from "vitest";
import { pickPolicyText, type PolicyContent } from "./useCategoryPolicy";

/**
 * Pure tests for the locale fallback chain that drives the customer-side
 * Terms and Banner sections. The chain is:
 *   1. user's actual locale
 *   2. policy's primary_locale (admin-marked canonical source)
 *   3. Thai (the primary market default)
 *   4. English (international fallback)
 *   5. "" → renderer hides the section
 */

const content = (overrides: Partial<PolicyContent>): PolicyContent => ({
  primary_locale: "th",
  translations: {},
  ...overrides,
});

describe("pickPolicyText", () => {
  it("given user locale present in translations > returns that locale's text", () => {
    const c = content({ translations: { th: "ไทย", en: "English", ja: "日本語" } });
    expect(pickPolicyText(c, "ja")).toBe("日本語");
  });

  it("given user locale missing but primary_locale present > falls back to primary", () => {
    const c = content({
      primary_locale: "th",
      translations: { th: "ไทย", en: "English" },
    });
    expect(pickPolicyText(c, "ko")).toBe("ไทย");
  });

  it("given user locale + primary missing but th present > falls back to th", () => {
    const c = content({
      primary_locale: "ja", // primary doesn't exist in translations
      translations: { th: "ไทย", en: "English" },
    });
    expect(pickPolicyText(c, "ko")).toBe("ไทย");
  });

  it("given only en present > falls back to en for any other locale", () => {
    const c = content({ primary_locale: "ja", translations: { en: "English" } });
    expect(pickPolicyText(c, "ko")).toBe("English");
    expect(pickPolicyText(c, "ja")).toBe("English");
    expect(pickPolicyText(c, "th")).toBe("English");
  });

  it("given empty translations object > returns empty string (renderer hides)", () => {
    const c = content({ translations: {} });
    expect(pickPolicyText(c, "th")).toBe("");
  });

  it("given undefined content > returns empty string", () => {
    expect(pickPolicyText(undefined, "th")).toBe("");
  });

  it("given content with primary_locale matching user locale > returns it (no double-lookup)", () => {
    const c = content({ primary_locale: "th", translations: { th: "ไทย" } });
    expect(pickPolicyText(c, "th")).toBe("ไทย");
  });
});
