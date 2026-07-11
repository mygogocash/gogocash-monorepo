import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const mobileRoot = path.resolve(testDir, "../..");

function read(relativePath: string) {
  return fs.readFileSync(path.join(mobileRoot, relativePath), "utf8");
}

// Founder feedback 2026-07-11: brand cards on Quest ("Explore other Shops")
// and Favorite Brands ("Recently Visited") did not align with the shared
// BrandCard — they were hand-copied clones, so the logo-tile fixes (bounded
// retry, square image viewport, Android corner clipping) never reached them.
// The tile is now ONE component (BrandLogoTile) and Quest's clone card is
// replaced by the real BrandCard.
describe("brand logo tile convergence", () => {
  it("given the shared tile > then it owns the retry policy, square image, and radius", () => {
    const tile = read("src/components/BrandLogoTile.tsx");
    expect(tile).toContain("shouldScheduleLogoRetry(");
    expect(tile).toContain("LOGO_RETRY_DELAY_MS");
    expect(tile).toContain("clearTimeout(");
    expect(tile).toContain("borderRadius: radii.sm");
    expect(tile).toContain("imageSquare");
  });

  it("given BrandCard > then both tiers render through BrandLogoTile (no bespoke Image)", () => {
    const brandCard = read("src/components/BrandCard.tsx");
    expect(brandCard).toContain("<BrandLogoTile");
    expect(brandCard).not.toContain('from "expo-image"');
    expect(brandCard).not.toContain("onLogoError");
  });

  it("given the Quest explore section > then it renders the shared BrandCard, not a clone", () => {
    const quest = read("src/screens/CustomerQuestScreen.tsx");
    expect(quest).toContain("<BrandCard");
    expect(quest).not.toContain("CompactExploreShopCard");
    expect(quest).not.toContain('from "expo-image"');
  });

  it("given the Favorite Brands card > then its logo visual is the shared tile", () => {
    const favorites = read("src/screens/CustomerFavoriteBrandsScreen.tsx");
    expect(favorites).toContain("<BrandLogoTile");
    // No hand-rolled logo failure handling — the tile owns retry/fallback.
    // (expo-image stays imported for the hero illustrations only.)
    expect(favorites).not.toContain("logoFailed");
    // Wide 272:153 tile: the image must be a centered square or square
    // bitmaps keep their sharp corners inside the viewport.
    expect(favorites).toContain("imageSquare=");
  });
});
