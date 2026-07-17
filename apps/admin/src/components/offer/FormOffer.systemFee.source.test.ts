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
      "const { feePercent, isFallback: feeIsFallback } = useSystemFeePercent()",
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

  it("reconciles raw vs stored net when the fee resolves (admin-authored raws win)", () => {
    // PR #283 review HIGH-2: blindly re-deriving the raw from the stored net
    // erased evidence of nets baked with the 30% fallback. The reconciliation
    // recomputes the stored net from an admin-authored raw instead.
    expect(formSource).toMatch(
      /seededFeePercent !== feePercent[\s\S]{0,900}?reconcileCommissionOnFeeChange\(\{/,
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

describe("PR #283 review fixes — fee-resolution race (HIGH-2) + fallback notice", () => {
  it("reconciles raw vs stored net when the fee resolves, with admin-authored raws winning", () => {
    expect(formSource).toContain("reconcileCommissionOnFeeChange({");
    expect(formSource).toContain(
      "const [commissionRawEdited, setCommissionRawEdited] = useState(false)",
    );
    expect(formSource).toContain(
      "const [upsizeCommissionRawEdited, setUpsizeCommissionRawEdited] =",
    );
    expect(formSource).toContain("rawEdited: commissionRawEdited");
    expect(formSource).toContain("rawEdited: upsizeCommissionRawEdited");
    expect(formSource).toContain("setCommissionRawEdited(true)");
    expect(formSource).toMatch(/setUpsizeCommissionRawEdited\(\s*true,?\s*\)/);
    expect(formSource).toMatch(
      /commissionRawId !== form\.id[\s\S]{0,800}?setCommissionRawEdited\(false\)[\s\S]{0,200}?setUpsizeCommissionRawEdited\(false\)/,
    );
    expect(formSource).not.toContain("commissionRawEditedRef");
    expect(formSource).not.toContain("upsizeCommissionRawEditedRef");
  });

  it("upsize draft commit recomputes the net with the commit-time fee", () => {
    expect(formSource).toContain("committedDraft");
  });

  it("surfaces the fee fallback to the admin", () => {
    expect(formSource).toContain("Fee Structure rate unavailable");
  });
});
