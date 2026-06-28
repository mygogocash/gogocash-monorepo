import { describe, expect, it } from "vitest";
import {
  bestPercentFromPartnerRates,
  formatPartnerRatesMinMax,
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
