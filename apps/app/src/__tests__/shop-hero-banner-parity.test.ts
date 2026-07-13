import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const screenSource = readFileSync(
  resolve(__dirname, "../screens/CustomerShopDetailScreen.tsx"),
  "utf8",
);

/** Extract the heroBanner style block from the screen source. */
function heroBannerStyleBlock(): string {
  const match = screenSource.match(/heroBanner:\s*\{[\s\S]*?\},/);
  expect(match, "heroBanner style block not found").toBeTruthy();
  return match![0];
}

describe("shop hero banner", () => {
  it("keeps the 1200/410 design aspect ratio on the banner frame", () => {
    expect(heroBannerStyleBlock()).toContain("aspectRatio: 1200 / 410");
  });

  it("never fights the aspect ratio with a minimum height", () => {
    // Regression: minHeight: 220 overrode the 2.93:1 aspect ratio on phone
    // widths (~375px → 128px natural height), squaring the frame. With
    // contentFit="cover", brand banner art (authored at 2400x820 = the same
    // 2.93:1) was cropped hard on both sides — the Shopee cover rendered with
    // the logo chopped at the left edge. The frame must follow the design
    // ratio at every width; cover then maps same-ratio art 1:1 with no crop.
    expect(heroBannerStyleBlock()).not.toContain("minHeight");
  });
});
