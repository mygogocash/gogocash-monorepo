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

  it("#103 > commission auto mode button uses the configurable fee copy", () => {
    expect(formSource).toContain("Auto applying with ${feePercent}% fee");
  });

  it("#104 > product type section is hidden when all product types is on", () => {
    // Space between SCROLL_CLASS and the conditional class — without it the
    // "hidden" token glues onto the scroll class and never applies.
    expect(formSource).toMatch(
      /\$\{SCROLL_CLASS\} \$\{\s*allProductTypes \? "hidden" : ""\s*\}/,
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

describe("CreateBrandForm — #274/#275/#276 (source signals)", () => {
  it("#275 > auto mode renders a raw % input beside a disabled derived net box", () => {
    expect(formSource).toContain('name="commission_raw"');
    expect(formSource).toContain("% after {feePercent}% fee");
    expect(formSource).toMatch(/name="commission_store"[\s\S]{0,200}?disabled/);
  });

  it("#275 > auto-mode submit appends the computed net as commission_store", () => {
    expect(formSource).toContain("applyPlatformFee(n, feePercent)");
    expect(formSource).toMatch(
      /if \(commission_store != null\) \{\s*formData\.append\("commission_store", String\(commission_store\)\);/,
    );
  });

  it("#275 > switching commission modes clears the other mode's input", () => {
    expect(formSource).toMatch(
      /setCommissionEntryMode\("manual"\);\s*setCommissionRawInput\(""\)/,
    );
    expect(formSource).toMatch(
      /setCommissionEntryMode\("auto"\);\s*setCommissionPercentInput\(""\)/,
    );
  });

  it("#276 > turning off all-product-types seeds one empty row", () => {
    expect(formSource).toMatch(
      /setAllProductTypes\(on\);[\s\S]{0,400}?prev\.length === 0\s*\?/,
    );
  });

  it("#276 > product type header renders Add before Save changes", () => {
    const productSection = formSource.slice(
      formSource.indexOf('id="create-brand-section-product"'),
      formSource.indexOf('id="create-brand-section-offer-copy"'),
    );
    expect(productSection).toMatch(
      />\s*Add\s*<\/Button>[\s\S]*?>\s*Save changes\s*<\/Button>/,
    );
  });

  it("#276 > per-row auto mode writes the net percent string into commission_info", () => {
    expect(formSource).toContain("netCommissionFromRaw(v, feePercent)");
    expect(formSource).toContain('net === "" ? "" : `${net}%`');
  });

  it("#274 > default-country picker and state are gone", () => {
    expect(formSource).not.toContain("create-brand-default-country");
    expect(formSource).not.toContain("defaultCountry");
  });

  it("#274 > global brands still send the fixed Thailand default_country with rationale", () => {
    expect(formSource).toMatch(
      /formData\.append\("default_country", "Thailand"\)/,
    );
    expect(formSource).toContain("BrandService requires it");
  });
});
