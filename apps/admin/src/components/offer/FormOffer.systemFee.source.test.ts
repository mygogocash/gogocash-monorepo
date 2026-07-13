import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const formSource = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), "FormOffer.tsx"),
  "utf8",
);

describe("FormOffer — configurable platform fee (source signals)", () => {
  it("reads the fee from Fee Structure via useSystemFeePercent", () => {
    expect(formSource).toContain(
      'import { useSystemFeePercent } from "@/hooks/useSystemFeePercent"',
    );
    expect(formSource).toContain(
      "const { feePercent } = useSystemFeePercent()",
    );
  });

  it("uses the fee-parameterized helpers everywhere (no fixed 30% wrappers left)", () => {
    expect(formSource).not.toContain("applyThirtyPercentFee");
    expect(formSource).not.toContain("reverseThirtyPercentFee");
    expect(formSource).toContain("applyPlatformFee(n, feePercent)");
    expect(formSource).toContain(
      "commissionFieldsFromPartnerRaw(rawPercent, feePercent)",
    );
    expect(formSource).toContain(
      "productTypeDraftToEntry(productTypeDraft, feePercent)",
    );
    expect(formSource).toContain("productTypeEntryToDraft(entry, feePercent)");
    // No single-argument netCommissionFromRaw calls (all pass the fee).
    expect(formSource).not.toMatch(/netCommissionFromRaw\(\s*[^,()]*\s*\)/);
  });

  it("re-derives the raw inputs from the saved nets when the fee resolves", () => {
    expect(formSource).toMatch(
      /seededFeePercent !== feePercent[\s\S]{0,600}?reversePlatformFee\(form\.commission_store, feePercent\)/,
    );
  });

  it("auto button and derived box labels show the configured fee, not 30", () => {
    expect(formSource).toContain("Auto applying with ${feePercent}% fee");
    expect(formSource).toContain("% after {feePercent}% fee");
    expect(formSource).toContain("% after ${feePercent}% fee");
    expect(formSource).not.toContain("Auto apply 30% fee");
    expect(formSource).not.toContain("% after 30% fee");
    expect(formSource).not.toContain("after 30% fee");
  });
});
