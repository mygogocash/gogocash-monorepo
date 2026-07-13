import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { translateCopy } from "@mobile/i18n/messages";
import { webLocaleRegionPanel } from "@mobile/design/webDesignParity";

const read = (rel: string) => readFileSync(resolve(__dirname, "..", rel), "utf8");

// Founder (2026-07-12): switching to Thai still showed English on most screens.
// Two failure modes: (1) strings not tc()-wrapped at the render site, and
// (2) tc()-wrapped strings whose English is not a catalog value (silent
// fallback). This suite pins both for the sweep's scope.
function expectAllTranslatedToThai(strings: readonly string[]): void {
  const untranslated = strings.filter((s) => translateCopy(s, "th") === s);
  expect(untranslated).toEqual([]);
}

describe("Thai locale sweep — catalog coverage", () => {
  it("shop detail prose translates", () => {
    expectAllTranslatedToThai([
      "NOTE",
      "within 30 day",
      "within",
      "day",
      "10% Cashback Bonus",
      "No deals available right now",
      "Please favorite us to stay updated on great deals",
      "No merchant details yet",
      "This merchant does not have active cashback details yet.",
      // Live-mode mapper templates (brand prefix dropped so tc can match)
      "Cashback rates, tracking windows, exclusions, and availability can change. Final approval remains subject to the merchant and partner network.",
      "Cashback is tracked through GoGoCash after you open the merchant link and complete an eligible order.",
    ]);
  });

  it("auth + toast error copy translates", () => {
    expectAllTranslatedToThai([
      "Already have an account",
      "Email or password is incorrect. Check them and try again.",
      "That email already has an account. Sign in instead.",
      "Password must be at least 6 characters.",
      "That email doesn't look valid. Check it and try again.",
      "Too many attempts. Please try again later.",
      "Security check failed. Please refresh the page and try again.",
      "That phone number doesn't look valid. Check it and try again.",
      "Sign-in is temporarily unavailable. Please try again later.",
      "Social sign-in is available on Expo web. Use your browser to continue.",
      "Could not save GoGoTrack settings. Please try again.",
      // Issue #249: search screen headings + idle helper leaked English in Thai mode.
      "Start typing to search brands, stores, products, or cashback.",
      "Trending searches",
      "Search suggestions",
      // Issue #249 follow-up: recent-history chrome also missing from catalogs.
      "Recent searches",
      "Clear all",
      "Clear recent searches",
      // Issue #248: the suggestions grid gets its own subtitle instead of
      // duplicating the popular-banner sentence.
      "Tap a brand to search its cashback deals.",
    ]);
  });

  it("discovery empty states and promo titles translate", () => {
    expectAllTranslatedToThai([
      "No brands match those filters.",
      "Try another search or category.",
      "No shops match those filters.",
      "Try another search, category, or shop type.",
      "No categories match that search.",
      "Try another category name.",
      "Trending Brands",
      "Travel Deals are Here!",
      "Makeup Must Have!",
    ]);
  });

  it("region labels translate (the header banner shows them)", () => {
    expectAllTranslatedToThai(webLocaleRegionPanel.regions.map((r) => r.label));
  });
});

describe("Thai locale sweep — render sites are tc()-wrapped", () => {
  it("shop detail wraps its section chrome", () => {
    const s = read("screens/CustomerShopDetailScreen.tsx");
    for (const needle of [
      'tc("Cashback upto")',
      'tc("Extra Cashback")',
      'tc("Cashback starting from")',
      'tc("up to")',
      'tc("NOTE")',
      'tc("Cashback Tracking Period")',
      'tc("Explore other shops")',
    ]) {
      expect(s).toContain(needle);
    }
    // Tracking steps + fixture-fed copy translate at render.
    expect(s).toContain("tc(step.label)");
    expect(s).toContain("tc(shop.disclaimer)");
  });

  it("the cookie banner and MyCashback sign-in are wrapped", () => {
    expect(read("components/CustomerCookieConsentBanner.tsx")).toContain("useCopy");
    expect(read("screens/CustomerMyCashbackSignInScreen.tsx")).toContain("useCopy");
  });

  it("the region banner translates the country label", () => {
    expect(read("screens/home/DetectedRegionBanner.tsx")).toContain("tc(option.label)");
  });

  it("BrandCard wraps the coupon chip and directories wrap the search pill", () => {
    expect(read("components/BrandCard.tsx")).toMatch(/tc\((props\.label|label)\)/);
    expect(read("screens/discovery/CustomerBrandDirectoryScreen.tsx")).toContain(
      "tc(webHomeSearchPlaceholder)",
    );
  });
});
