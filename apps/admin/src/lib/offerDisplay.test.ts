import { describe, expect, it } from "vitest";
import {
  brandSearchOptionLabel,
  formatOfferCountries,
  getOfferDisplayName,
} from "./offerDisplay";

describe("offerDisplay", () => {
  it("formatOfferCountries > given comma codes > joins trimmed values", () => {
    expect(formatOfferCountries("TH, US")).toBe("TH, US");
  });

  it("formatOfferCountries > given empty > returns em dash", () => {
    expect(formatOfferCountries("")).toBe("—");
  });

  it("getOfferDisplayName > prefers offer_name_display", () => {
    expect(
      getOfferDisplayName({
        _id: "o1",
        offer_name: "Internal",
        offer_name_display: "Banana IT (TH)",
      }),
    ).toBe("Banana IT (TH)");
  });

  it("brandSearchOptionLabel > appends unique offer suffix", () => {
    expect(
      brandSearchOptionLabel({
        _id: "o5",
        offer_name: "Banana IT TH - CPS #5",
        offer_name_display: "Banana IT (TH)",
        countries: "TH",
      }),
    ).toBe("Banana IT (TH) · TH · #5");
  });
});
