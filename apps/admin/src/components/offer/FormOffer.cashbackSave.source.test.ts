import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const formSource = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), "FormOffer.tsx"),
  "utf8",
);

describe("FormOffer cashback save (#428 / #429)", () => {
  it("surfaces the real API error via getApiErrorMessage instead of a hard-coded generic", () => {
    expect(formSource).toContain('from "@/lib/getApiErrorMessage"');
    expect(formSource).toMatch(
      /saveCashbackEdit[\s\S]*?getApiErrorMessage\(\s*err,\s*"Could not update cashback\. Please try again\."\s*,?\s*\)/,
    );
    // Hard-coded-only catch (without getApiErrorMessage) must not remain.
    expect(formSource).not.toMatch(
      /setCashbackSaveError\(\s*"Could not update cashback\. Please try again\."\s*\)/,
    );
  });

  it("patches cashback via appendCashbackPatchFields (product_types + all_product_types)", () => {
    expect(formSource).toContain("appendCashbackPatchFields");
    expect(formSource).toContain("all_product_types: form.all_product_types");
    expect(formSource).toContain("product_types: form.product_types");
  });
});
