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
    expect(webShopDetailGroceryGalaxy.disclaimer).toContain(
      "maximum possible amounts",
    );
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
      webShopDetailGroceryGalaxy.category,
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
    expect(shopFile).toContain("ShopCouponDeals");
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
    expect(shopFile).toContain(
      "aspectRatio: shop.questBanner.imageWidth / shop.questBanner.imageHeight",
    );
    expect(shopFile).toContain('height: "100%"');
    expect(shopFile).toContain('resizeMode="cover"');
    expect(shopFile).toContain("<ShopQuestBanner shop={shop} />");
    expect(shopFile).toContain("<ShopCouponDeals");
  });

  it("shop detail parity > given selected staging Cashback Tips > then Expo renders structured panel after deals", () => {
    const shopFile = readMobileFile("src/screens/CustomerShopDetailScreen.tsx");
    const panelFile = readMobileFile(
      "src/components/shop/ShopCashbackTipsPanel.tsx",
    );

    expect(shopFile).not.toContain("merchantCashbackTipsImage");
    expect(shopFile).not.toContain("merchant-cashback-tips-terms");
    expect(shopFile).toContain("<ShopCouponDeals");
    expect(shopFile).toContain("<ShopCashbackTipsPanel shop={shop} />");
    expect(panelFile).toContain("filterShopCashbackTipsForCategory");
    expect(panelFile).toContain("CashbackTipHighlightCard");
    expect(panelFile).toContain("CashbackTipTextCard");
    expect(panelFile).toContain('tc("Cashback Tips")');
  });

  it("shop detail parity > given cashback tips > then each tip renders a friendly illustration", () => {
    const illustrationFile = readMobileFile(
      "src/components/shop/CashbackTipIllustration.tsx",
    );
    const highlightFile = readMobileFile(
      "src/components/shop/CashbackTipHighlightCard.tsx",
    );
    const textFile = readMobileFile(
      "src/components/shop/CashbackTipTextCard.tsx",
    );

    expect(illustrationFile).toContain('"excluded-products"');
    expect(illustrationFile).toContain('"check-terms"');
    expect(illustrationFile).toContain('"accept-cookies"');
    expect(highlightFile).toContain(
      "<CashbackTipIllustration tipId={tip.id} />",
    );
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
    expect(shopFile).toContain(
      "horizontalPadding={desktopFooterHorizontalOffset}",
    );
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

  // #432 — Favorite is hidden (not login-gated) when the user is logged out.
  it("shop detail parity > given an unsigned user > then favorite is hidden until auth", () => {
    const shopFile = readMobileFile("src/screens/CustomerShopDetailScreen.tsx");

    expect(shopFile).toContain("handleToggleFavorite");
    expect(shopFile).toContain("const showFavorite = authReady && isAuthed");
    expect(shopFile).toContain("{showFavorite ? favoriteButton : null}");
    expect(shopFile).toContain("onPress={handleToggleFavorite}");
    // Must not redirect unsigned users into login from the favorite control.
    expect(shopFile).not.toMatch(
      /handleToggleFavorite[\s\S]*?buildLoginRedirectWithCallback/,
    );
  });

  it("shop detail parity > given shop media URI changes > then logo and banner failure state resets", () => {
    const shopFile = readMobileFile("src/screens/CustomerShopDetailScreen.tsx");

    expect(shopFile).toMatch(
      /setBannerFailed\(false\)[\s\S]*?\[shop\.bannerUri\]/,
    );
    expect(shopFile).toMatch(/setLogoFailed\(false\)[\s\S]*?\[shop\.logoUri\]/);
  });

  it("shop detail parity > given hero summary card > then mobile lays identity and actions on one row", () => {
    // Design feedback 2026-07-10: the stacked mobile layout (identity row, then
    // a right-aligned actions row) left a dead zone bottom-left for short brand
    // names like "Shopee". Mobile now renders one row: name (flex) → heart →
    // Shop Now. The logo circle is DESKTOP-only — on mobile the banner above
    // already carries the brand, so the pill drops the redundant logo and the
    // name keeps the room.
    const shopFile = readMobileFile("src/screens/CustomerShopDetailScreen.tsx");

    expect(shopFile).toContain('testID="shop-detail-brand-name"');
    expect(shopFile).toContain('testID="shop-detail-brand-logo"');
    expect((shopFile.match(/\{brandLogo\}/g) ?? []).length).toBe(1);
    expect(shopFile).toContain("styles.summaryTitleMobile");
    expect(shopFile).toContain("styles.summaryMobileRow");
    expect(shopFile).not.toContain("styles.summaryActionsRow");
    expect(shopFile).toMatch(/summaryMobileRow:[\s\S]*?flexDirection: "row"/);
    expect(shopFile).toMatch(/summaryCardDesktop:[\s\S]*?flexDirection: "row"/);
    expect(shopFile).toMatch(/summaryTitleWrap:[\s\S]*?flex: 1/);
    expect(shopFile).toMatch(/summaryTitleWrap:[\s\S]*?minWidth: 0/);
    expect(shopFile).toMatch(/favoriteButton:[\s\S]*?flexShrink: 0/);
    expect(shopFile).toMatch(/shopNowButton:[\s\S]*?flexShrink: 0/);
  });

  it("shop detail parity > given rate breakdown rows > then they read as quiet secondary info", () => {
    // Design feedback 2026-07-10: "Cashback starting from X / up to Y" and the
    // per-product rate rows rendered in bright 16-20px ink — louder than the
    // disclaimers around them and competing with the mint hero rate above.
    // They are secondary detail: muted 14px labels, 16px values.
    const shopFile = readMobileFile("src/screens/CustomerShopDetailScreen.tsx");
    expect(shopFile).toMatch(/rateSummaryText: \{[^}]*color: colors\.muted/);
    expect(shopFile).toMatch(/rateSummaryText: \{[^}]*fontSize: 14/);
    expect(shopFile).toMatch(/productRateName: \{[^}]*color: colors\.muted/);
    expect(shopFile).toMatch(/productRateName: \{[^}]*fontSize: 14/);
    expect(shopFile).toMatch(/productRateValue: \{[^}]*fontSize: 16/);
  });

  it("shop detail parity > given cashback headline row > then label and value align on baseline", () => {
    const shopFile = readMobileFile("src/screens/CustomerShopDetailScreen.tsx");

    expect(shopFile).toMatch(/cashbackHeader:[\s\S]*?alignItems: "baseline"/);
  });

  it("shop detail parity > given Explore other shops rail > then it renders shared BrandCards over the live catalog", () => {
    const shopFile = readMobileFile("src/screens/CustomerShopDetailScreen.tsx");

    expect(shopFile).toContain("resolveLiveDirectoryStores");
    expect(shopFile).toContain("getFixtureShopDirectoryResults");
    expect(shopFile).toContain(
      "<ShopExploreRelated excludeShopId={shop.id} />",
    );
    // Final-form alignment 2026-07-11: rail cards ARE the compact BrandCard
    // (fixed 144pt like the home carousels); the bespoke card is gone.
    expect(shopFile).toContain("<BrandCard");
    expect(shopFile).toMatch(
      /getScaledCompactBrandCardMetrics\(\s*FIXED_RELATED_CARD_WIDTH\s*,?\s*\)/,
    );
    expect(shopFile).not.toContain("relatedVisual");
  });

  it("mobile hero > given the reference cover overlay > then a floating circular back button is present", () => {
    // Founder 2026-07-13 (competitor reference): brand pages need a top-left
    // back control on mobile; the bottom nav was the only way out.
    const shopFile = readMobileFile("src/screens/CustomerShopDetailScreen.tsx");

    // canGoBack-guarded handler — same contract as CustomerSearchScreen.
    expect(shopFile).toContain("router.canGoBack()");
    expect(shopFile).toContain('router.replace("/" as never)');
    expect(shopFile).toContain("onBack={handleBack}");
    // Mobile-only overlay control with the shared translated label.
    expect(shopFile).toContain('accessibilityLabel={tc("Back")}');
    expect(shopFile).toContain("ChevronLeft as ChevronLeftIcon");
    expect(shopFile).toMatch(/\{!isDesktop \? \(\s*<MotionPressable/);

    // Style pins (presence checks); the pinned heroBanner block stays untouched.
    const backBlock = shopFile.match(/heroBackButton:\s*\{[\s\S]*?\},/)?.[0];
    expect(backBlock, "heroBackButton style block").toBeDefined();
    for (const snippet of [
      'position: "absolute"',
      "backgroundColor: colors.card",
      "borderRadius: radii.chip",
      "height: 40",
      "width: 40",
      "left: 12",
      "top: 12",
    ]) {
      expect(backBlock).toContain(snippet);
    }
  });
});
