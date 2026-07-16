import { describe, expect, it } from "vitest";

import { getOfferAvailabilityDisplay } from "./offerAvailabilityDisplay";

describe("getOfferAvailabilityDisplay (#334)", () => {
  it("explains a global Thailand variant as the default fallback", () => {
    expect(
      getOfferAvailabilityDisplay({
        is_global: true,
        countries: "Thailand",
        default_country: "Thailand",
      }),
    ).toEqual({
      isGlobal: true,
      availabilityLabel: "Global",
      configuredCountry: "Thailand",
      fallbackCountry: "Thailand",
      tableContextLabel: "Default/fallback: Thailand",
      clarification: null,
    });
  });

  it("keeps a legacy International value country-specific", () => {
    expect(
      getOfferAvailabilityDisplay({
        is_global: false,
        countries: "International",
      }),
    ).toEqual({
      isGlobal: false,
      availabilityLabel: "Country-specific",
      configuredCountry: "International",
      fallbackCountry: "Not applicable",
      tableContextLabel: "Configured country / variant",
      clarification: "Legacy “International” value (not global)",
    });
  });

  it("does not infer global availability from International casing or whitespace", () => {
    const display = getOfferAvailabilityDisplay({
      countries: "  INTERNATIONAL  ",
      is_global: undefined,
      default_country: "Thailand",
    });

    expect(display.isGlobal).toBe(false);
    expect(display.availabilityLabel).toBe("Country-specific");
    expect(display.fallbackCountry).toBe("Not applicable");
    expect(display.clarification).toBe(
      "Legacy “International” value (not global)",
    );
  });
});
