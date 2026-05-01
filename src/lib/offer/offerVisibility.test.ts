import { describe, expect, it } from "vitest";
import type { DataOffer } from "@/interfaces/offer";
import { filterOffersByCountry, isOfferVisibleToCountry } from "./offerVisibility";

const offer = (overrides: Partial<DataOffer>): DataOffer =>
  ({
    _id: "x",
    countries: "",
    is_global: false,
    ...overrides,
  }) as DataOffer;

describe("isOfferVisibleToCountry", () => {
  it("hides single-country brands from users in other countries", () => {
    const o = offer({ countries: "Singapore" });
    expect(isOfferVisibleToCountry(o, "Thailand")).toBe(false);
  });

  it("shows a country-matched brand to that country's users", () => {
    const o = offer({ countries: "Thailand" });
    expect(isOfferVisibleToCountry(o, "Thailand")).toBe(true);
  });

  it("matches case-insensitively and ignores whitespace", () => {
    const o = offer({ countries: "  THAILAND , Indonesia " });
    expect(isOfferVisibleToCountry(o, "thailand")).toBe(true);
    expect(isOfferVisibleToCountry(o, "indonesia")).toBe(true);
  });

  it("supports comma-separated multi-country lines", () => {
    const o = offer({ countries: "Thailand,Singapore,Malaysia" });
    expect(isOfferVisibleToCountry(o, "Singapore")).toBe(true);
    expect(isOfferVisibleToCountry(o, "Vietnam")).toBe(false);
  });

  it("shows global brands to every country, including users with no country set", () => {
    const o = offer({ countries: "Thailand", is_global: true });
    expect(isOfferVisibleToCountry(o, "Thailand")).toBe(true);
    expect(isOfferVisibleToCountry(o, "Singapore")).toBe(true);
    expect(isOfferVisibleToCountry(o, null)).toBe(true);
    expect(isOfferVisibleToCountry(o, "")).toBe(true);
  });

  it("hides country-specific brands from guests with unknown country", () => {
    const o = offer({ countries: "Thailand" });
    expect(isOfferVisibleToCountry(o, null)).toBe(false);
    expect(isOfferVisibleToCountry(o, "")).toBe(false);
    expect(isOfferVisibleToCountry(o, "   ")).toBe(false);
  });

  it("hides offers with no countries when not global", () => {
    const o = offer({ countries: "" });
    expect(isOfferVisibleToCountry(o, "Thailand")).toBe(false);
  });
});

describe("filterOffersByCountry", () => {
  it("returns only offers visible to the given country", () => {
    const offers = [
      offer({ _id: "th-only", countries: "Thailand" }),
      offer({ _id: "sg-only", countries: "Singapore" }),
      offer({ _id: "global", countries: "Thailand", is_global: true }),
      offer({ _id: "multi", countries: "Singapore,Malaysia" }),
    ];
    const visible = filterOffersByCountry(offers, "Singapore");
    expect(visible.map((o) => o._id).sort()).toEqual(["global", "multi", "sg-only"]);
  });

  it("returns global-only set when user country is missing", () => {
    const offers = [
      offer({ _id: "th-only", countries: "Thailand" }),
      offer({ _id: "global", is_global: true }),
    ];
    const visible = filterOffersByCountry(offers, null);
    expect(visible.map((o) => o._id)).toEqual(["global"]);
  });
});
