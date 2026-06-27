import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const formSource = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), "CreateBrandForm.tsx"),
  "utf8",
);

describe("CreateBrandForm — bug cluster #102–#105 (source signals)", () => {
  it("#102 > Active offer switch inverts disabledOffer (on = visible)", () => {
    expect(formSource).toContain('label="Active offer"');
    expect(formSource).toMatch(
      /defaultChecked=\{!disabledOffer\}[\s\S]*?setDisabledOffer\(!checked\)/,
    );
  });

  it("#103 > commission auto mode button uses 30% fee copy", () => {
    expect(formSource).toContain("Auto applying with 30% fee");
  });

  it("#104 > product type section is hidden when all product types is on", () => {
    expect(formSource).toMatch(
      /allProductTypes \? "hidden" : ""/,
    );
    expect(formSource).toMatch(
      /link\.id !== "create-brand-section-product" \|\| !allProductTypes/,
    );
  });

  it("#105 > required fields validated client-side before API call", () => {
    expect(formSource).toContain('toast.error("Brand name is required.")');
    expect(formSource).toContain(
      'toast.error("Affiliate tracking URL is required.")',
    );
    expect(formSource).toMatch(
      /if \(!name\)[\s\S]*?if \(!link\)/,
    );
  });

  it("#105 > API errors surface via getApiErrorMessage", () => {
    expect(formSource).toContain("getApiErrorMessage");
    expect(formSource).toContain(
      'getApiErrorMessage(err, "Could not create brand.")',
    );
  });
});
