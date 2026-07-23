import { describe, expect, it } from "vitest";

import {
  CUSTOM_POLICY_CATEGORY_ID,
  inferOfferPolicyMode,
} from "./offerPolicyMode";
import {
  policyTermsMapFromCategoryList,
  resolveConfiguredOfferPolicyTerms,
} from "./offerPolicyTerms";
import { DEFAULT_POLICY_TEMPLATES, parseStoredPolicy } from "./policyPayload";

describe("offer policy authoring mode (#310)", () => {
  it("infers Custom Writing only from the persisted custom sentinel", () => {
    expect(inferOfferPolicyMode(CUSTOM_POLICY_CATEGORY_ID)).toBe("custom");
    expect(inferOfferPolicyMode("68345f00aa11bb22cc33dd99")).toBe("template");
    expect(inferOfferPolicyMode("")).toBe("template");
  });

  it("returns configured template text without substituting mock terms", () => {
    const categories = [{ _id: "shopping-id", name: "Shopping" }];

    expect(
      resolveConfiguredOfferPolicyTerms("shopping-id", "Shopping", categories, {
        "shopping-id": "  Configured shopping policy  ",
      }),
    ).toBe("Configured shopping policy");
    expect(
      resolveConfiguredOfferPolicyTerms(
        "shopping-id",
        "Shopping",
        categories,
        {},
      ),
    ).toBe("");
  });

  it("indexes the current category-list policy response by primary locale", () => {
    expect(
      policyTermsMapFromCategoryList([
        {
          category_id: "shopping-id",
          terms: {
            primary_locale: "th",
            translations: {
              th: "เงื่อนไขหลัก",
              en: "Primary terms",
            },
            additional_terms: { th: "เงื่อนไขเพิ่มเติม" },
          },
        },
        {
          category_id: "travel-id",
          terms: {
            primary_locale: "ja",
            translations: { en: "Travel fallback" },
            additional_terms: { ja: "日本語の追加条件" },
          },
        },
      ]),
    ).toEqual({
      "shopping-id": "เงื่อนไขหลัก\n\nเงื่อนไขเพิ่มเติม",
      "travel-id": "Travel fallback",
    });
  });

  it("does not append legacy template-plus additional terms twice", () => {
    const stored = `${DEFAULT_POLICY_TEMPLATES[0].body}\n\n--- Additional terms ---\n\nLegacy additional terms`;
    expect(parseStoredPolicy(stored).additionalTerms.th).toBe(
      "Legacy additional terms",
    );

    expect(
      policyTermsMapFromCategoryList([
        { category_id: "legacy-id", terms: stored },
      ]),
    ).toEqual({ "legacy-id": stored });
  });
});
