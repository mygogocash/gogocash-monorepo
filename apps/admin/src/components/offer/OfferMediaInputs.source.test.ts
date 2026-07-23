import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const sourceDir = dirname(fileURLToPath(import.meta.url));
const editSource = readFileSync(resolve(sourceDir, "FormOffer.tsx"), "utf8");
const createSource = readFileSync(
  resolve(sourceDir, "CreateBrandForm.tsx"),
  "utf8",
);

function countFileInputs(source: string): number {
  return source.match(/type="file"/g)?.length ?? 0;
}

describe("offer media inputs (#317, source signals)", () => {
  it("create form has exactly one logo and one banner file input", () => {
    const mediaSection = createSource.slice(
      createSource.indexOf('id="create-brand-section-media"'),
      createSource.indexOf('id="create-brand-section-internal"'),
    );

    expect(countFileInputs(mediaSection)).toBe(2);
    expect(mediaSection).toContain('name="logo_desktop"');
    expect(mediaSection).toContain('name="banner"');
    expect(mediaSection).not.toContain('name="logo_mobile"');
    expect(mediaSection).not.toContain('name="banner_mobile"');
    expect(mediaSection).not.toContain('name="logo_circle"');
  });

  it("edit form has exactly one logo and one banner file input", () => {
    const mediaSection = editSource.slice(
      editSource.indexOf('id="offer-section-media"'),
      editSource.indexOf('id="offer-section-policy"'),
    );

    expect(countFileInputs(mediaSection)).toBe(2);
    expect(mediaSection).toContain('name="logo_desktop"');
    expect(mediaSection).toContain('name="banner"');
    expect(mediaSection).not.toContain('name="logo_circle"');
  });

  it("both forms submit only canonical physical assets", () => {
    expect(createSource).not.toContain(
      'formData.append("logo_mobile", logoMobile)',
    );
    expect(createSource).not.toContain(
      'formData.append("banner_mobile", bannerMobile)',
    );
    expect(createSource).not.toContain(
      'formData.append("logo_circle", logoCircle)',
    );

    expect(editSource).not.toContain(
      'fd.append("logo_mobile", form.logo_mobile)',
    );
    expect(editSource).not.toContain(
      'fd.append("banner_mobile", form.banner_mobile)',
    );
    expect(editSource).not.toContain(
      'fd.append("logo_circle", form.logo_circle)',
    );
  });

  it("keeps two live previews and preserves brand-level create assets across country resets", () => {
    expect(createSource).toContain("useObjectPreviewUrl(logoFile)");
    expect(createSource).toContain("useObjectPreviewUrl(bannerFile)");
    expect(createSource).toContain('alt="Brand logo preview"');
    expect(createSource).toContain('alt="Brand banner preview"');

    const resetCountryFields = createSource.slice(
      createSource.indexOf("const resetCountryVariantFields"),
      createSource.indexOf("const [logoFile"),
    );
    expect(resetCountryFields).not.toContain("setLogoFile");
    expect(resetCountryFields).not.toContain("setBannerFile");
  });

  // #427 — admin copy must say where each asset appears.
  it("labels logo for cards and banner for brand/shop detail hero", () => {
    expect(editSource).toContain(
      "Square (1:1) — shown on product/brand cards across the app.",
    );
    expect(editSource).toContain(
      "Wide hero — shown as the banner on the brand/shop detail page.",
    );
    expect(createSource).toContain(
      "Square (1:1) — shown on product/brand cards across the app.",
    );
    expect(createSource).toContain(
      "Wide hero — shown as the banner on the brand/shop detail page.",
    );
  });

  it("edit Cancel restores the media snapshot", () => {
    const cancelMedia = editSource.slice(
      editSource.indexOf("const cancelEditMedia"),
      editSource.indexOf("const saveMediaEdit"),
    );
    expect(cancelMedia).toContain("...mediaSnapshot");
  });
});
