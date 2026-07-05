import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { filterShopCashbackTipsForCategory } from "@mobile/components/shop/shopCashbackTipsTypes";
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

  it("shop detail parity > given selected staging Cashback Tips > then shared structured tips contract matches", () => {
    expect(webShopDetailGroceryGalaxy.cashbackTips.title).toBe("Cashback Tips");
    expect(webShopDetailGroceryGalaxy.cashbackTips.tips).toHaveLength(7);

    expect(webShopDetailGroceryGalaxy.cashbackTips.tips[0]).toEqual({
      id: "excluded-products",
      kind: "highlight",
      badgeKey: "excludedProductsLabel",
      leadKey: "excludedProductsTipLead",
      emphasisKey: "excludedProductsTipEmphasis",
      showLiveVideoLabels: true,
    });

    expect(webShopDetailGroceryGalaxy.cashbackTips.tips.slice(1, 4)).toEqual([
      {
        id: "check-terms",
        kind: "text",
        titleKey: "merchantCashbackTipCheckTermsTitle",
        bodyKey: "merchantCashbackTipCheckTermsBody",
      },
      {
        id: "restart-platform",
        kind: "text",
        titleKey: "merchantCashbackTipRestartPlatformTitle",
        bodyKey: "merchantCashbackTipRestartPlatformBody",
      },
      {
        id: "no-adblock",
        kind: "text",
        titleKey: "merchantCashbackTipNoAdblockTitle",
        bodyKey: "merchantCashbackTipNoAdblockBody",
      },
    ]);

    const travelTips = webShopDetailGroceryGalaxy.cashbackTips.tips.slice(4);
    expect(travelTips).toEqual([
      {
        id: "empty-cart",
        kind: "text",
        titleKey: "merchantCashbackTipEmptyCartTitle",
        bodyKey: "merchantCashbackTipEmptyCartBody",
        merchantCategories: ["travel"],
      },
      {
        id: "payment-fail",
        kind: "text",
        titleKey: "merchantCashbackTipPaymentFailTitle",
        bodyKey: "merchantCashbackTipPaymentFailBody",
        merchantCategories: ["travel"],
      },
      {
        id: "accept-cookies",
        kind: "text",
        titleKey: "merchantCashbackTipAcceptCookiesTitle",
        bodyKey: "merchantCashbackTipAcceptCookiesBody",
        merchantCategories: ["travel"],
      },
    ]);
  });

  it("shop detail parity > given Grocery Galaxy category others > then travel-only tips are filtered out", () => {
    const visibleTips = filterShopCashbackTipsForCategory(
      webShopDetailGroceryGalaxy.cashbackTips.tips,
      webShopDetailGroceryGalaxy.category
    );

    expect(visibleTips).toHaveLength(4);
    expect(visibleTips.map((tip) => tip.id)).toEqual([
      "excluded-products",
      "check-terms",
      "restart-platform",
      "no-adblock",
    ]);
  });

  it("shop detail parity > given selected staging shop detail > then Expo renders hero summary, cashback rail, tracking, deals, terms, and bottom nav", () => {
    const shopFile = readMobileFile("src/screens/CustomerShopDetailScreen.tsx");

    expect(shopFile).toContain("webShopDetailGroceryGalaxy");
    expect(shopFile).toContain("ShopHeroSummaryCard");
    expect(shopFile).toContain("ShopCashbackRail");
    expect(shopFile).toContain("ShopTrackingPeriod");
    expect(shopFile).toContain("ShopReferralCard");
    expect(shopFile).toContain("ShopDealsEmptyState");
    expect(shopFile).toContain("ShopCashbackTipsPanel");
    expect(shopFile).toContain("ShopTermsPanel");
    expect(shopFile).toContain("CustomerMobileBottomNav");
    expect(shopFile).toContain("activeRouteId={undefined}");
    expect(shopFile).toContain("home-side-watch");
    expect(shopFile).not.toContain("logoBadge");
    expect(shopFile).toContain("Cashback upto");
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
    expect(shopFile).toContain("<ShopQuestBanner shop={shop} />");
    expect(shopFile).toContain("<ShopDealsEmptyState shop={shop} />");
  });

  it("shop detail parity > given selected staging Cashback Tips > then Expo renders structured panel after deals", () => {
    const shopFile = readMobileFile("src/screens/CustomerShopDetailScreen.tsx");
    const panelFile = readMobileFile("src/components/shop/ShopCashbackTipsPanel.tsx");

    expect(shopFile).not.toContain("merchantCashbackTipsImage");
    expect(shopFile).not.toContain("merchant-cashback-tips-terms");
    expect(shopFile).toContain("<ShopDealsEmptyState shop={shop} />");
    expect(shopFile).toContain("<ShopCashbackTipsPanel shop={shop} />");
    expect(panelFile).toContain("filterShopCashbackTipsForCategory");
    expect(panelFile).toContain("CashbackTipHighlightCard");
    expect(panelFile).toContain("CashbackTipTextCard");
    expect(panelFile).toContain('tc("Cashback Tips")');
  });

  it("shop detail parity > given cashback tips > then each tip renders a friendly illustration", () => {
    const illustrationFile = readMobileFile("src/components/shop/CashbackTipIllustration.tsx");
    const highlightFile = readMobileFile("src/components/shop/CashbackTipHighlightCard.tsx");
    const textFile = readMobileFile("src/components/shop/CashbackTipTextCard.tsx");

    expect(illustrationFile).toContain('"excluded-products"');
    expect(illustrationFile).toContain('"check-terms"');
    expect(illustrationFile).toContain('"accept-cookies"');
    expect(highlightFile).toContain("<CashbackTipIllustration tipId={tip.id} />");
    expect(textFile).toContain("<CashbackTipIllustration tipId={tip.id} />");
    expect(textFile).not.toContain("numberBadge");
  });

  it("shop detail parity > given dark mode > then Shop Now CTA keeps contrast via pickThemed", () => {
    const shopFile = readMobileFile("src/screens/CustomerShopDetailScreen.tsx");

    expect(shopFile).toMatch(
      /shopNowButton:\s*\{[\s\S]*?backgroundColor: pickThemed\(colors, colors\.ink, colors\.primary\)/,
    );
    expect(shopFile).toMatch(/shopNowText:\s*\{[\s\S]*?color: colors\.white/);
  });

  it("shop detail parity > given desktop web > then content uses full-bleed shell cap like category pages", () => {
    const shopFile = readMobileFile("src/screens/CustomerShopDetailScreen.tsx");

    expect(shopFile).toContain("desktopShellFrame");
    expect(shopFile).toContain("desktopContentCap");
    expect(shopFile).toContain("getDesktopShellOffset");
    expect(shopFile).toContain("horizontalPadding={desktopFooterHorizontalOffset}");
    expect(shopFile).toContain("summaryCardDesktop");
  });

  it("shop detail parity > given an unsigned user taps Shop Now > then login is required before redirect overlay", () => {
    const shopFile = readMobileFile("src/screens/CustomerShopDetailScreen.tsx");

    expect(shopFile).toContain("useAuthGuardSession");
    expect(shopFile).toContain("buildLoginRedirectWithCallback");
    expect(shopFile).toContain("setPendingShopNowIntent");
    expect(shopFile).toContain("consumePendingShopNowIntent");
    expect(shopFile).toContain("handleShopNow");
    expect(shopFile).toContain("ShopRedirectOverlay");
  });

  it("shop detail parity > given Explore other shops rail > then live catalog logos use expo-image contain", () => {
    const shopFile = readMobileFile("src/screens/CustomerShopDetailScreen.tsx");

    expect(shopFile).toContain('from "expo-image"');
    expect(shopFile).toContain("resolveLiveDirectoryStores");
    expect(shopFile).toContain("getFixtureShopDirectoryResults");
    expect(shopFile).toContain("<ShopExploreRelated excludeShopId={shop.id} />");
    expect(shopFile).toContain('contentFit="contain"');
    expect(shopFile).toContain("store.logoUri ? colors.card : store.tint");
    expect(shopFile).toMatch(/relatedCashbackValue:[\s\S]*flexShrink: 0/);
  });
});
