import { describe, it, expect } from "vitest";
import { normalizeOfferProductTypes } from "@/types/api";

describe("normalizeOfferProductTypes > description", () => {
  it("preserves and trims a description on object rows", () => {
    const [row] = normalizeOfferProductTypes([
      {
        name: "Electronics",
        commission_info: "7",
        description: "  Phones & laptops  ",
      },
    ]);
    expect(row.description).toBe("Phones & laptops");
  });

  it("defaults a missing description to an empty string on object rows", () => {
    const [row] = normalizeOfferProductTypes([
      { name: "Electronics", commission_info: "7" },
    ]);
    expect(row.description).toBe("");
  });

  it("normalizes a whitespace-only description to an empty string", () => {
    const [row] = normalizeOfferProductTypes([
      { name: "Electronics", commission_info: "7", description: "   " },
    ]);
    expect(row.description).toBe("");
  });
});

describe("normalizeOfferProductTypes > is_tagline (heading rows)", () => {
  it("preserves is_tagline:true and the heading text", () => {
    const [row] = normalizeOfferProductTypes([
      { name: "Cashback excludes China & Japan", is_tagline: true },
    ]);
    expect(row.is_tagline).toBe(true);
    expect(row.name).toBe("Cashback excludes China & Japan");
  });

  it("leaves is_tagline undefined on normal product rows", () => {
    const [row] = normalizeOfferProductTypes([
      { name: "Electronics", commission_info: "7" },
    ]);
    expect(row.is_tagline).toBeUndefined();
  });
});
