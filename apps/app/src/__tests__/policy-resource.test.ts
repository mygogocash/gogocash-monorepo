import { describe, expect, it } from "vitest";
import {
  mapBackendCategoryPolicy,
  resolveShopTerms,
  resolveShopTermsBullets,
} from "../account/policyResource";

describe("mapBackendCategoryPolicy", () => {
  it("given terms translations > then picks the requested locale with en fallback", () => {
    const policy = mapBackendCategoryPolicy({
      category_id: "cat-1",
      terms: {
        primary_locale: "th",
        translations: {
          th: "1. ข้อกำหนดภาษาไทย\n2. ห้ามใช้คูปองภายนอก",
          en: "1. English term one\n2. External coupons excluded",
        },
      },
    });

    expect(policy?.termsText).toBe("1. English term one\n2. External coupons excluded");
    expect(policy?.bullets).toEqual([
      "1. English term one",
      "2. External coupons excluded",
    ]);
  });

  it("given null payload > then returns null", () => {
    expect(mapBackendCategoryPolicy(null)).toBeNull();
  });
});

describe("resolveShopTerms", () => {
  it("given backend policy payload > then prefers custom terms over policy bullets", () => {
    const terms = resolveShopTerms({
      customTerms: "Custom line",
      fallback: {
        bullets: ["fixture"],
        eyebrow: "💡",
        exclusionsTitle: "Exclusions",
        subtitle: "fixture subtitle",
        title: "Terms & Conditions",
      },
      noteToUser: "Heads up",
      policyPayload: {
        terms: { translations: { en: "Policy line" } },
      },
      source: "backend",
    });

    expect(terms.bullets).toEqual(["Custom line"]);
    expect(terms.subtitle).toBe("Heads up");
  });
});

describe("resolveShopTermsBullets", () => {
  it("given custom_terms on the offer > then splits them into bullets", () => {
    expect(
      resolveShopTermsBullets({
        customTerms: "Line one\nLine two",
        fixtureBullets: ["fixture"],
        policyBullets: ["policy bullet"],
      })
    ).toEqual(["Line one", "Line two"]);
  });

  it("given no custom_terms > then uses policy bullets", () => {
    expect(
      resolveShopTermsBullets({
        customTerms: "",
        fixtureBullets: ["fixture"],
        policyBullets: ["policy bullet"],
      })
    ).toEqual(["policy bullet"]);
  });
});
