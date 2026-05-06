import { describe, expect, it } from "vitest";
import type { DataOffer } from "@/interfaces/offer";
import {
  dedupeOffersByBrand,
  filterOffersByCountry,
  isOfferVisibleToCountry,
  pickBrandVariant,
} from "./offerVisibility";

// `Partial<DataOffer>` is too strict for our test-doubles because some fields are typed
// as enums (e.g. LookupValue). Treat the input as a loose record and cast the result —
// the visibility helpers only read string-shaped fields.
const offer = (overrides: Record<string, unknown>): DataOffer =>
  ({
    _id: "x",
    countries: "",
    is_global: false,
    ...overrides,
  }) as unknown as DataOffer;

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

  // The bug that motivated this helper: user profile stores `country` as the
  // full English name ("Thailand") set from the country picker label, while
  // affiliate feeds (Involve Asia, etc.) ship `countries` as ISO-2 ("TH").
  // The two MUST compare equal or every brand card disappears.
  it("matches full English name on the user side against ISO-2 on the offer side", () => {
    const o = offer({ countries: "TH" });
    expect(isOfferVisibleToCountry(o, "Thailand")).toBe(true);
    expect(isOfferVisibleToCountry(o, "thailand")).toBe(true);
    expect(isOfferVisibleToCountry(o, "  THAILAND  ")).toBe(true);
  });

  it("matches ISO-2 on the user side against full English name on the offer side", () => {
    const o = offer({ countries: "Thailand" });
    expect(isOfferVisibleToCountry(o, "TH")).toBe(true);
    expect(isOfferVisibleToCountry(o, "th")).toBe(true);
  });

  it("treats mixed-format multi-country lists correctly", () => {
    const o = offer({ countries: "TH, Singapore, MY" });
    expect(isOfferVisibleToCountry(o, "Thailand")).toBe(true);
    expect(isOfferVisibleToCountry(o, "SG")).toBe(true);
    expect(isOfferVisibleToCountry(o, "Malaysia")).toBe(true);
    expect(isOfferVisibleToCountry(o, "Vietnam")).toBe(false);
    expect(isOfferVisibleToCountry(o, "VN")).toBe(false);
  });

  it("still works for unmapped countries when both sides agree", () => {
    // Country not in the lookup table — falls back to literal trimmed-uppercased compare.
    const o = offer({ countries: "Mongolia" });
    expect(isOfferVisibleToCountry(o, "Mongolia")).toBe(true);
    expect(isOfferVisibleToCountry(o, "  mongolia  ")).toBe(true);
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

describe("pickBrandVariant", () => {
  it("prefers an exact country match over global / default", () => {
    const variants = [
      offer({ _id: "th", countries: "Thailand", is_global: true, default_country: "Singapore" }),
      offer({ _id: "sg", countries: "Singapore", is_global: true, default_country: "Singapore" }),
    ];
    expect(pickBrandVariant(variants, "Thailand")?._id).toBe("th");
  });

  it("falls back to default_country when no exact country match", () => {
    const variants = [
      offer({ _id: "th", countries: "Thailand", is_global: true, default_country: "Thailand" }),
      offer({ _id: "sg", countries: "Singapore", is_global: true, default_country: "Thailand" }),
    ];
    // US user — neither variant matches; should pick the one whose `countries` matches default_country=Thailand.
    expect(pickBrandVariant(variants, "United States")?._id).toBe("th");
  });

  it("falls back to first global variant when user country is missing and no default match", () => {
    const variants = [
      offer({ _id: "th", countries: "Thailand" }),
      offer({ _id: "sg", countries: "Singapore", is_global: true }),
    ];
    expect(pickBrandVariant(variants, null)?._id).toBe("sg");
  });

  it("returns first variant as last resort", () => {
    const variants = [offer({ _id: "a" }), offer({ _id: "b" })];
    expect(pickBrandVariant(variants, "Vietnam")?._id).toBe("a");
  });

  it("returns null for empty input", () => {
    expect(pickBrandVariant([], "Thailand")).toBeNull();
  });

  it("matches user full-name country against ISO-2 variant.countries", () => {
    const variants = [
      offer({ _id: "th-iso", countries: "TH" }),
      offer({ _id: "sg-iso", countries: "SG" }),
    ];
    expect(pickBrandVariant(variants, "Thailand")?._id).toBe("th-iso");
    expect(pickBrandVariant(variants, "Singapore")?._id).toBe("sg-iso");
  });

  it("matches user full-name against ISO-2 default_country", () => {
    const variants = [
      offer({ _id: "th-iso", countries: "TH", default_country: "TH" }),
      offer({ _id: "sg-iso", countries: "SG", default_country: "TH" }),
    ];
    // User in Vietnam — no exact match; both have default_country=TH; pick the
    // variant whose `countries` contains TH.
    expect(pickBrandVariant(variants, "Vietnam")?._id).toBe("th-iso");
  });
});

describe("dedupeOffersByBrand", () => {
  it("collapses multiple country variants of the same brand to one", () => {
    const offers = [
      offer({ _id: "apple-th", merchant_id: 100, countries: "Thailand", is_global: true, default_country: "Thailand" }),
      offer({ _id: "apple-sg", merchant_id: 100, countries: "Singapore", is_global: true, default_country: "Thailand" }),
      offer({ _id: "lazada-th", merchant_id: 200, countries: "Thailand" }),
    ];
    const out = dedupeOffersByBrand(offers, "Thailand");
    expect(out.map((o) => o._id)).toEqual(["apple-th", "lazada-th"]);
  });

  it("hides country-specific brands the user can't see and keeps one row per visible brand", () => {
    const offers = [
      offer({ _id: "apple-th", merchant_id: 100, countries: "Thailand" }),
      offer({ _id: "apple-sg", merchant_id: 100, countries: "Singapore" }),
      // Apple TH and SG are NOT global — TH user sees only Apple TH; SG variant is hidden.
      offer({ _id: "spotify", merchant_id: 300, countries: "Thailand", is_global: true, default_country: "Thailand" }),
    ];
    const out = dedupeOffersByBrand(offers, "Thailand");
    expect(out.map((o) => o._id)).toEqual(["apple-th", "spotify"]);
  });

  it("groups by lookup_value stem when merchant_id is missing", () => {
    const offers = [
      offer({ _id: "1", lookup_value: "nike_th", countries: "Thailand", is_global: true, default_country: "Thailand" }),
      offer({ _id: "2", lookup_value: "nike_sg", countries: "Singapore", is_global: true, default_country: "Thailand" }),
    ];
    const out = dedupeOffersByBrand(offers, "Vietnam"); // no exact match → falls to default_country=TH
    expect(out).toHaveLength(1);
    expect(out[0]?._id).toBe("1");
  });

  it("preserves order based on first occurrence per brand", () => {
    const offers = [
      offer({ _id: "b-th", merchant_id: 2, countries: "Thailand" }),
      offer({ _id: "a-th", merchant_id: 1, countries: "Thailand" }),
      offer({ _id: "b-sg", merchant_id: 2, countries: "Singapore", is_global: true }),
    ];
    const out = dedupeOffersByBrand(offers, "Thailand");
    expect(out.map((o) => o._id)).toEqual(["b-th", "a-th"]);
  });
});
