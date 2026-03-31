import { describe, expect, it } from "vitest";
import { parseRequestGenerateDeeplink, toNumber } from "./helpers";

describe("homeApi helpers", () => {
  it("parseRequestGenerateDeeplink accepts valid body", () => {
    expect(
      parseRequestGenerateDeeplink({
        offer_id: 1,
        merchant_id: 2,
        preview_url: "https://shop.example",
      })
    ).toEqual({
      offer_id: 1,
      merchant_id: 2,
      preview_url: "https://shop.example",
    });
  });

  it("parseRequestGenerateDeeplink rejects incomplete body", () => {
    expect(parseRequestGenerateDeeplink({ offer_id: 1 })).toBeUndefined();
  });

  it("toNumber coerces strings", () => {
    expect(toNumber("42", 0)).toBe(42);
    expect(toNumber("x", 7)).toBe(7);
  });
});
