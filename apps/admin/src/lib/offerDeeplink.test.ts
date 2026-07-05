import { describe, expect, it } from "vitest";
import {
  bestPercentFromPartnerRates,
  formatOfferCashbackLabel,
  formatPartnerRatesMinMax,
  resolveTopBrandCashbackLabel,
} from "./offerDeeplink";

describe("formatPartnerRatesMinMax", () => {
  it("returns dash when commissions are empty", () => {
    expect(formatPartnerRatesMinMax({ commissions: [] })).toBe("—");
    expect(formatPartnerRatesMinMax(null)).toBe("—");
  });

  it("summarizes string commission arrays", () => {
    expect(
      formatPartnerRatesMinMax({ commissions: ["3% CPA", "7%"] }),
    ).toBe("Min 3% · Max 7%");
    expect(formatPartnerRatesMinMax({ commissions: ["5%"] })).toBe("5%");
  });

  it("summarizes Involve-style commission objects from the real API", () => {
    expect(
      formatPartnerRatesMinMax({
        commissions: [{ Commission: "2.80%" }, { Commission: "6.50%" }],
      }),
    ).toBe("Min 2.8% · Max 6.5%");
  });
});

describe("bestPercentFromPartnerRates", () => {
  it("reads percentages from Involve-style commission objects", () => {
    expect(
      bestPercentFromPartnerRates([{ Commission: "2.80%" }, { Commission: "6.50%" }]),
    ).toBe(6.5);
  });
});

describe("formatOfferCashbackLabel", () => {
  it("given commission_store > then formats as percent", () => {
    expect(formatOfferCashbackLabel({ commission_store: 7 })).toBe("7%");
  });

  it("given Involve commissions without commission_store > then uses up-to max percent after 30% fee", () => {
    expect(
      formatOfferCashbackLabel({
        commission_store: null,
        commissions: [{ Commission: "2.80%" }, { Commission: "6.50%" }],
      }),
    ).toBe("Up to 4.55%");
  });

  it("given commission_store zero > then falls back to partner rates", () => {
    expect(
      formatOfferCashbackLabel({
        commission_store: 0,
        commissions: [{ Commission: "10%" }],
      }),
    ).toBe("7%");
  });
});

describe("resolveTopBrandCashbackLabel", () => {
  it("given saved cashback > then prefers the saved label", () => {
    expect(
      resolveTopBrandCashbackLabel({ commission_store: 7 }, "Custom copy"),
    ).toBe("Custom copy");
  });

  it("given empty saved cashback > then falls back to offer commission", () => {
    expect(
      resolveTopBrandCashbackLabel({ commission_store: 7 }, ""),
    ).toBe("7%");
  });
});
