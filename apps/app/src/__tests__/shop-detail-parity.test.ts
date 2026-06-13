import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { webShopDetailGroceryGalaxy } from "@mobile/design/webDesignParity";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const mobileRoot = path.resolve(testDir, "../..");

function readMobileFile(relativePath: string) {
  return fs.readFileSync(path.join(mobileRoot, relativePath), "utf8");
}

describe("Shop detail parity", () => {
  it("shop detail parity > given selected staging Grocery Galaxy route > then shared merchant contract matches", () => {
    expect(webShopDetailGroceryGalaxy).toMatchObject({
      id: "brand-grocery-galaxy-1001",
      brand: "Grocery Galaxy",
      bannerAsset: "home-side-watch",
      logoText: "GO",
      category: "others",
      cashback: "26.5%",
      extraCashback: "14%",
      shopNowLabel: "Shop Now",
      maxPerTransaction: "Cashback maximum up to 50 THB per transaction.",
      rateSummary: {
        from: "0%",
        upTo: "0%",
      },
    });
    expect(webShopDetailGroceryGalaxy.productRates).toEqual([
      { name: "Groceries", rate: "0%" },
      { name: "Lifestyle", rate: "0%" },
    ]);
    expect(webShopDetailGroceryGalaxy.note).toContain("Promo stack");
    expect(webShopDetailGroceryGalaxy.disclaimer).toContain("maximum possible amounts");
  });

  it("shop detail parity > given selected staging GoGoQuest banner > then shared banner contract matches", () => {
    expect(webShopDetailGroceryGalaxy.questBanner).toEqual({
      href: "/quest",
      imageAsset: "quest-banner-en",
      imageWidth: 720,
      imageHeight: 405,
      radius: 24,
      gapAfter: 56,
      accessibilityLabel: "GoGoQuest bonus banner",
    });
  });

  it("shop detail parity > given selected staging Cashback Tips > then shared tips illustration contract matches", () => {
    expect(webShopDetailGroceryGalaxy.cashbackTips).toEqual({
      title: "Cashback Tips",
      illustrationAsset: "merchant-cashback-tips-terms",
      illustrationWidth: 368,
      illustrationHeight: 1337,
      illustrationAlt:
        "Cashback tips: excluded Live and Video cart items; check terms and caps; start from this platform; avoid ad blockers and third-party links; empty cart when required; restart if payment fails; accept store cookies.",
    });
  });

  it("shop detail parity > given selected staging shop detail > then Expo renders hero summary, cashback rail, tracking, deals, terms, and bottom nav", () => {
    const shopFile = readMobileFile("src/screens/CustomerShopDetailScreen.tsx");

    expect(shopFile).toContain("webShopDetailGroceryGalaxy");
    expect(shopFile).toContain("ShopHeroSummaryCard");
    expect(shopFile).toContain("ShopCashbackRail");
    expect(shopFile).toContain("ShopTrackingPeriod");
    expect(shopFile).toContain("ShopReferralCard");
    expect(shopFile).toContain("ShopDealsEmptyState");
    expect(shopFile).toContain("ShopCashbackTips");
    expect(shopFile).toContain("ShopTermsPanel");
    expect(shopFile).toContain("CustomerMobileBottomNav");
    expect(shopFile).toContain("activeRouteId={undefined}");
    expect(shopFile).toContain("home-side-watch");
    expect(shopFile).toContain("Cashback up to");
    expect(shopFile).toContain("Extra Cashback");
    expect(shopFile).toContain("Cashback starting from");
    expect(shopFile).toContain("Cashback Tracking Period");
    expect(shopFile).toContain("shop.deals.title");
    expect(shopFile).toContain("shop.deals.emptyTitle");
    expect(shopFile).not.toContain("Shop detail");
    expect(shopFile).not.toContain("Activate cashback");
    expect(shopFile).not.toContain("Back to shops");
  });

  it("shop detail parity > given selected staging GoGoQuest banner > then Expo locks the clickable image frame to 16:9 before deals", () => {
    const shopFile = readMobileFile("src/screens/CustomerShopDetailScreen.tsx");

    expect(shopFile).toContain("shop.questBanner.href");
    expect(shopFile).toContain("shop.questBanner.accessibilityLabel");
    expect(shopFile).toContain("StyleSheet.flatten");
    expect(shopFile).toContain("styles.questBannerFrame");
    expect(shopFile).toContain("styles.questBannerImage");
    expect(shopFile).toContain("aspectRatio: shop.questBanner.imageWidth / shop.questBanner.imageHeight");
    expect(shopFile).toContain("height: \"100%\"");
    expect(shopFile).toContain("resizeMode=\"cover\"");
    expect(shopFile).toContain("<ShopQuestBanner shop={shop} />\n              <ShopDealsEmptyState");
  });

  it("shop detail parity > given selected staging Cashback Tips > then Expo renders illustration card after deals", () => {
    const shopFile = readMobileFile("src/screens/CustomerShopDetailScreen.tsx");

    expect(shopFile).toContain("merchantCashbackTipsImage");
    expect(shopFile).toContain("function ShopCashbackTips");
    expect(shopFile).toContain("<ShopDealsEmptyState shop={shop} />\n              <ShopCashbackTips shop={shop} />");
    expect(shopFile).toContain("shop.cashbackTips.title");
    expect(shopFile).toContain("shop.cashbackTips.illustrationAlt");
    expect(shopFile).toContain("styles.cashbackTipsFigure");
    expect(shopFile).toContain("styles.cashbackTipsImage");
  });
});
