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
    const o = offer({ countries: "SG" });
    expect(isOfferVisibleToCountry(o, "TH")).toBe(false);
  });

  it("shows a country-matched brand to that country's users", () => {
    const o = offer({ countries: "TH" });
    expect(isOfferVisibleToCountry(o, "TH")).toBe(true);
  });

  it("matches case-insensitively and ignores whitespace", () => {
    const o = offer({ countries: "  TH , ID " });
    expect(isOfferVisibleToCountry(o, "th")).toBe(true);
    expect(isOfferVisibleToCountry(o, "id")).toBe(true);
  });

  it("supports comma-separated multi-country lines", () => {
    const o = offer({ countries: "TH,SG,MY" });
    expect(isOfferVisibleToCountry(o, "SG")).toBe(true);
    expect(isOfferVisibleToCountry(o, "VN")).toBe(false);
  });

  it("shows global brands to every country, including users with no country set", () => {
    const o = offer({ countries: "TH", is_global: true });
    expect(isOfferVisibleToCountry(o, "TH")).toBe(true);
    expect(isOfferVisibleToCountry(o, "SG")).toBe(true);
    expect(isOfferVisibleToCountry(o, null)).toBe(true);
    expect(isOfferVisibleToCountry(o, "")).toBe(true);
  });

  it("hides country-specific brands from guests with unknown country", () => {
    const o = offer({ countries: "TH" });
    expect(isOfferVisibleToCountry(o, null)).toBe(false);
    expect(isOfferVisibleToCountry(o, "")).toBe(false);
    expect(isOfferVisibleToCountry(o, "   ")).toBe(false);
  });

  it("hides offers with no countries when not global", () => {
    const o = offer({ countries: "" });
    expect(isOfferVisibleToCountry(o, "TH")).toBe(false);
  });

  // Both sides are now canonical ISO-2: the customer app normalises user
  // country at the read boundary (`useUserCountry`) and the backend writers
  // persist ISO-2 directly. The helper is intentionally a literal lowercase
  // compare — these tests pin that contract so a regression in
  // `useUserCountry` (e.g. someone deleting the `toIso2` call) shows up here
  // instead of silently zeroing every brand card.
  it("does NOT auto-canonicalise full English names — relies on upstream normalisation", () => {
    const o = offer({ countries: "TH" });
    // Caller would have to pass the canonical form; the helper does not look up "Thailand".
    expect(isOfferVisibleToCountry(o, "Thailand")).toBe(false);
  });

  it("matches when both sides use the same canonical ISO-2", () => {
    const o = offer({ countries: "TH" });
    expect(isOfferVisibleToCountry(o, "TH")).toBe(true);
    expect(isOfferVisibleToCountry(o, "th")).toBe(true);
    expect(isOfferVisibleToCountry(o, "  TH  ")).toBe(true);
  });

  it("treats mixed-format multi-country lists by literal compare", () => {
    // If a feed ever ships mixed formats, only the entries matching the user's
    // canonical key match. Documents the failure mode rather than papering over it.
    const o = offer({ countries: "TH, Singapore, MY" });
    expect(isOfferVisibleToCountry(o, "TH")).toBe(true);
    expect(isOfferVisibleToCountry(o, "SG")).toBe(false); // "Singapore" entry is non-canonical
    expect(isOfferVisibleToCountry(o, "MY")).toBe(true);
  });

  it("works for unmapped markets when both sides agree", () => {
    const o = offer({ countries: "MN" });
    expect(isOfferVisibleToCountry(o, "MN")).toBe(true);
    expect(isOfferVisibleToCountry(o, "  mn  ")).toBe(true);
  });
});

describe("filterOffersByCountry", () => {
  it("returns only offers visible to the given country", () => {
    const offers = [
      offer({ _id: "th-only", countries: "TH" }),
      offer({ _id: "sg-only", countries: "SG" }),
      offer({ _id: "global", countries: "TH", is_global: true }),
      offer({ _id: "multi", countries: "SG,MY" }),
    ];
    const visible = filterOffersByCountry(offers, "SG");
    expect(visible.map((o) => o._id).sort()).toEqual(["global", "multi", "sg-only"]);
  });

  it("returns global-only set when user country is missing", () => {
    const offers = [
      offer({ _id: "th-only", countries: "TH" }),
      offer({ _id: "global", is_global: true }),
    ];
    const visible = filterOffersByCountry(offers, null);
    expect(visible.map((o) => o._id)).toEqual(["global"]);
  });
});

describe("pickBrandVariant", () => {
  it("prefers an exact country match over global / default", () => {
    const variants = [
      offer({ _id: "th", countries: "TH", is_global: true, default_country: "SG" }),
      offer({ _id: "sg", countries: "SG", is_global: true, default_country: "SG" }),
    ];
    expect(pickBrandVariant(variants, "TH")?._id).toBe("th");
  });

  it("falls back to default_country when no exact country match", () => {
    const variants = [
      offer({ _id: "th", countries: "TH", is_global: true, default_country: "TH" }),
      offer({ _id: "sg", countries: "SG", is_global: true, default_country: "TH" }),
    ];
    // US user — neither variant matches; should pick the one whose `countries` matches default_country=TH.
    expect(pickBrandVariant(variants, "US")?._id).toBe("th");
  });

  it("falls back to first global variant when user country is missing and no default match", () => {
    const variants = [
      offer({ _id: "th", countries: "TH" }),
      offer({ _id: "sg", countries: "SG", is_global: true }),
    ];
    expect(pickBrandVariant(variants, null)?._id).toBe("sg");
  });

  it("returns first variant as last resort", () => {
    const variants = [offer({ _id: "a" }), offer({ _id: "b" })];
    expect(pickBrandVariant(variants, "VN")?._id).toBe("a");
  });

  it("returns null for empty input", () => {
    expect(pickBrandVariant([], "TH")).toBeNull();
  });

  it("matches user ISO-2 country against ISO-2 variant.countries", () => {
    const variants = [
      offer({ _id: "th-iso", countries: "TH" }),
      offer({ _id: "sg-iso", countries: "SG" }),
    ];
    expect(pickBrandVariant(variants, "TH")?._id).toBe("th-iso");
    expect(pickBrandVariant(variants, "SG")?._id).toBe("sg-iso");
  });

  it("matches user ISO-2 against ISO-2 default_country", () => {
    const variants = [
      offer({ _id: "th-iso", countries: "TH", default_country: "TH" }),
      offer({ _id: "sg-iso", countries: "SG", default_country: "TH" }),
    ];
    // User in Vietnam — no exact match; both have default_country=TH; pick the
    // variant whose `countries` contains TH.
    expect(pickBrandVariant(variants, "VN")?._id).toBe("th-iso");
  });
});

describe("dedupeOffersByBrand", () => {
  it("collapses multiple country variants of the same brand to one", () => {
    const offers = [
      offer({ _id: "apple-th", merchant_id: 100, countries: "TH", is_global: true, default_country: "TH" }),
      offer({ _id: "apple-sg", merchant_id: 100, countries: "SG", is_global: true, default_country: "TH" }),
      offer({ _id: "lazada-th", merchant_id: 200, countries: "TH" }),
    ];
    const out = dedupeOffersByBrand(offers, "TH");
    expect(out.map((o) => o._id)).toEqual(["apple-th", "lazada-th"]);
  });

  it("hides country-specific brands the user can't see and keeps one row per visible brand", () => {
    const offers = [
      offer({ _id: "apple-th", merchant_id: 100, countries: "TH" }),
      offer({ _id: "apple-sg", merchant_id: 100, countries: "SG" }),
      // Apple TH and SG are NOT global — TH user sees only Apple TH; SG variant is hidden.
      offer({ _id: "spotify", merchant_id: 300, countries: "TH", is_global: true, default_country: "TH" }),
    ];
    const out = dedupeOffersByBrand(offers, "TH");
    expect(out.map((o) => o._id)).toEqual(["apple-th", "spotify"]);
  });

  it("groups by lookup_value stem when merchant_id is missing", () => {
    const offers = [
      offer({ _id: "1", lookup_value: "nike_th", countries: "TH", is_global: true, default_country: "TH" }),
      offer({ _id: "2", lookup_value: "nike_sg", countries: "SG", is_global: true, default_country: "TH" }),
    ];
    const out = dedupeOffersByBrand(offers, "VN"); // no exact match → falls to default_country=TH
    expect(out).toHaveLength(1);
    expect(out[0]?._id).toBe("1");
  });

  it("preserves order based on first occurrence per brand", () => {
    const offers = [
      offer({ _id: "b-th", merchant_id: 2, countries: "TH" }),
      offer({ _id: "a-th", merchant_id: 1, countries: "TH" }),
      offer({ _id: "b-sg", merchant_id: 2, countries: "SG", is_global: true }),
    ];
    const out = dedupeOffersByBrand(offers, "TH");
    expect(out.map((o) => o._id)).toEqual(["b-th", "a-th"]);
  });
});
