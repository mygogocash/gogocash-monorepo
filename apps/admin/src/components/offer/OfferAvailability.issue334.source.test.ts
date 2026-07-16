import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const componentDir = dirname(fileURLToPath(import.meta.url));
const offersTableSource = readFileSync(
  resolve(componentDir, "OffersTable.tsx"),
  "utf8",
);
const formOfferSource = readFileSync(
  resolve(componentDir, "FormOffer.tsx"),
  "utf8",
);

describe("brand availability display contract (#334)", () => {
  it("uses the shared availability helper in both list and detail views", () => {
    expect(offersTableSource).toContain("getOfferAvailabilityDisplay(offer)");
    expect(formOfferSource).toContain("getOfferAvailabilityDisplay(offer)");
  });

  it("clarifies fallback routing in flat and grouped brand rows", () => {
    expect(offersTableSource).toContain("Availability / country");
    expect(offersTableSource).toContain("availability.tableContextLabel");
    expect(offersTableSource).toContain("availability.clarification");
    expect(offersTableSource).toContain("group.globalFallbackCountry");
    expect(offersTableSource).toContain("group.availabilityClarification");
  });

  it("shows the complete availability contract in the brand reference view", () => {
    expect(formOfferSource).toContain('label: "Availability"');
    expect(formOfferSource).toContain('label: "Configured country / variant"');
    expect(formOfferSource).toContain('label: "Default / fallback country"');
    expect(formOfferSource).toContain("availability.clarification");
  });
});
