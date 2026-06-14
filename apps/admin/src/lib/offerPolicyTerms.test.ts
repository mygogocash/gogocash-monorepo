import { describe, it, expect } from "vitest";
import {
  OFFER_MOCK_TERMS,
  CATEGORY_MOCK_TERMS,
  resolveOfferPolicyBaseTerms,
} from "./offerPolicyTerms";

describe("resolveOfferPolicyBaseTerms", () => {
  const cats = [
    { _id: "cat1", name: "Shopping" },
    { _id: "elec", name: "Electronics" },
  ];

  it("given custom mode > returns empty so the admin writes their own", () => {
    expect(
      resolveOfferPolicyBaseTerms("custom", "Electronics", cats, {
        cat1: "x",
      }),
    ).toBe("");
  });

  it("given a pinned category with configured text > returns that text", () => {
    expect(
      resolveOfferPolicyBaseTerms("cat1", "Electronics", cats, {
        cat1: "Shopping terms",
      }),
    ).toBe("Shopping terms");
  });

  it("given automatic + offer category matches a configured policy > returns it", () => {
    expect(
      resolveOfferPolicyBaseTerms("", "Electronics", cats, {
        elec: "Elec terms",
      }),
    ).toBe("Elec terms");
  });

  it("given a pinned category with no configured text > returns that category's default sample", () => {
    expect(resolveOfferPolicyBaseTerms("cat1", "Electronics", cats, {})).toBe(
      CATEGORY_MOCK_TERMS.shopping,
    );
  });

  it("given automatic + offer category has a known default > returns that category default", () => {
    expect(resolveOfferPolicyBaseTerms("", "Electronics", cats, {})).toBe(
      CATEGORY_MOCK_TERMS.electronics,
    );
  });

  it("given an unknown category with nothing configured > falls back to the generic sample", () => {
    expect(resolveOfferPolicyBaseTerms("", "Unknown", cats, {})).toBe(
      OFFER_MOCK_TERMS,
    );
  });

  it("every known category has a multi-line default sample", () => {
    for (const text of Object.values(CATEGORY_MOCK_TERMS)) {
      expect(text.split("\n").length).toBeGreaterThanOrEqual(4);
    }
  });
});
