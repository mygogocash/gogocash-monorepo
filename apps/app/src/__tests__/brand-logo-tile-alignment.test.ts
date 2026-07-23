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

  it("given the Quest explore section > then it renders the shared section, not a clone", () => {
    const quest = read("src/screens/CustomerQuestScreen.tsx");
    expect(quest).toContain("<ExploreOtherShopsSection");
    expect(quest).not.toContain("CompactExploreShopCard");
    expect(quest).not.toContain('from "expo-image"');
  });

  it("given the shared Explore other Shops section > then it renders BrandCard rows", () => {
    // Founder feedback 2026-07-11 (referral screenshot): a THIRD explore-shops
    // clone (single-letter monogram, heart beside the name, truncating
    // cashback caption). The section is now ONE component used by Quest and
    // Referral; new screens must render it, not re-clone it.
    const section = read("src/screens/ExploreOtherShopsSection.tsx");
    expect(section).toContain("<BrandCard");
    expect(section).toContain("getShopDirectoryGridMetrics");
    expect(section).toContain("resolveLiveBrandCards");
  });

  it("given the Referral explore section > then it renders the shared section, not a clone", () => {
    const referral = read("src/screens/CustomerReferralScreen.tsx");
    expect(referral).toContain("<ExploreOtherShopsSection");
    expect(referral).not.toContain("ExploreShopCard");
    expect(referral).not.toContain("charAt(0)");
  });

  it("given the Favorite Brands grid > then it renders the shared BrandCard, not a clone", () => {
    // Founder feedback 2026-07-11 (round 2): the favorites cards must BE the
    // standard BrandCard — same tile, spacing, and typography — with the
    // category chip and favorite heart as BrandCard options.
    const favorites = read("src/screens/CustomerFavoriteBrandsScreen.tsx");
    expect(favorites).toContain("<BrandCard");
    expect(favorites).not.toContain("FavoriteBrandCard");
    expect(favorites).not.toContain("logoFailed");
  });

  it("given the shop-detail related rail > then it renders the shared BrandCard, not a clone", () => {
    // Founder follow-up 2026-07-11: the FOURTH clone — a horizontal rail with
    // a bespoke card, a direct expo-image (no bounded retry, no Android-safe
    // radius), and a decorative heart that was a plain View. The rail keeps
    // its horizontal scroll but the cards are the standard compact BrandCard
    // with the provider-backed heart.
    const shopDetail = read("src/screens/CustomerShopDetailScreen.tsx");
    expect(shopDetail).toContain("<BrandCard");
    expect(shopDetail).toContain("showFavoriteHeart");
    expect(shopDetail).not.toContain("relatedLogoImage");
    expect(shopDetail).not.toContain("relatedFavoriteButton");
    expect(shopDetail).not.toContain("relatedCouponBadge");
  });

  it("given the compact BrandCard > then it offers the favorite heart but no category chip", () => {
    // Founder feedback 2026-07-11 (round 3): drop the category chip (Others,
    // Finance, ...) from favorites cards — cards match the standard BrandCard
    // exactly, with only the heart as the favorites-specific option.
    const brandCard = read("src/components/BrandCard.tsx");
    expect(brandCard).not.toContain("categoryLabel");
    expect(brandCard).toContain("showFavoriteHeart");
  });
});
