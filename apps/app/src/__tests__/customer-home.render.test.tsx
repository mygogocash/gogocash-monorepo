import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createElement } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// CustomerHomeScreen reaches expo-localization (via the desktop header ->
// CustomerLocaleRegionControl -> i18n/LocaleProvider) and statically pulls in
// @mobile/observability/client (-> @sentry/react-native -> the real Flow-typed
// react-native that the render harness aliases away everywhere EXCEPT that
// un-aliased Sentry path). Neither device locale nor observability is the
// behavior under test, so mock both at the seam — the same pattern the
// customer-auth / customer-profile render tests use.
vi.mock("expo-localization", () => ({
  getLocales: () => [{ languageTag: "en-US", languageCode: "en" }],
}));

vi.mock("@mobile/observability/client", () => ({
  resetObservabilityIdentity: vi.fn(),
}));

import { readHomeSources } from "../test-support/homeSource";

import { CustomerHomeScreen } from "@mobile/screens/CustomerHomeScreen";

// Wave B (B4) per-screen UX adoption for the discovery/home landing screen. This is
// the RENDER suite: it MOUNTS the screen (react-native -> react-native-web, happy-dom)
// at BOTH the mobile and desktop layout widths to prove the highest-parity-risk screen
// still renders after the additive changes, AND reads the screen source to assert the
// applied Wave-A-aligned treatment.
//
// ONLY the Thai-truncation pass is adopted here (additive `numberOfLines` +
// `ellipsizeMode` props on overflow-prone titles/pills). Pull-to-refresh, Skeleton,
// KeyboardAwareScreen, and copy haptics/toast are intentionally NOT adopted — see the
// agent report for the per-treatment rationale (no resource/refetch, no
// CustomerAccountResourceState loading delegation, no text-input form, no copy action).
const testDir = dirname(fileURLToPath(import.meta.url));
const mobileRoot = resolve(testDir, "../..");
const homeSource = readHomeSources(mobileRoot);
const brandCardSource = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), "../components/BrandCard.tsx"),
  "utf8"
);

const DEFAULT_WINDOW_WIDTH = window.innerWidth;

function setViewportWidth(width: number) {
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    value: width,
    writable: true,
  });
}

// HomeHeroBanners now reads banners via useCustomerAccountResource (useQuery),
// so the screen must mount inside a QueryClientProvider. In fixtures mode (default)
// the query stays disabled and banners come from webHomeHeroBanners.
function renderHome() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    createElement(QueryClientProvider, { client: queryClient }, createElement(CustomerHomeScreen))
  );
}

afterEach(() => {
  setViewportWidth(DEFAULT_WINDOW_WIDTH);
});

describe("CustomerHomeScreen (render)", () => {
  it("mounts the mobile layout without throwing", () => {
    // < 1024 => getResponsiveHomeLayoutMetrics().isDesktop === false: sticky search,
    // BrowseShortcuts pills, Top Brands / promo sections, and the bottom nav render.
    setViewportWidth(390);
    expect(() => renderHome()).not.toThrow();
  });

  it("mounts the desktop layout without throwing", () => {
    // >= 1024 => isDesktop branch: desktop header chrome + capped content sections.
    setViewportWidth(1280);
    expect(() => renderHome()).not.toThrow();
  });

  it("favorites a Top Brands card on heart press (and the press does not navigate)", () => {
    // The large (size="L") Top Brands card exposes a heart 'Save brand' toggle; the
    // compact (size="S") rails have no heart. Pressing it flips the brand to favorited
    // (label changes) in place — it must NOT bubble to the card's <Link> navigation.
    setViewportWidth(1280);
    renderHome();
    const saveButtons = screen.queryAllByRole("button", { name: /^Save brand:/ });
    expect(saveButtons.length).toBeGreaterThan(0);
    const brand = (saveButtons[0].getAttribute("aria-label") ?? "").replace(/^Save brand:\s*/, "");
    fireEvent.click(saveButtons[0]);
    expect(screen.getByRole("button", { name: `Remove from saved brands: ${brand}` })).toBeTruthy();
  });
});

describe("CustomerHomeScreen — Wave B Thai-truncation pass (source signals)", () => {
  it("caps the previously-unbounded section titles and category pills with numberOfLines", () => {
    // Before this pass, sectionTitle / sectionTitleSmall / shortcutText /
    // desktopCategoryNavText rendered with no line cap, so a longer Thai translation
    // could overflow its single-line row. Each gets a numberOfLines cap. The screen
    // has 7 baseline numberOfLines props (shared BrandCard title + cashback caption,
    // coupon label, compact logo-fallback, plus bottom-nav labels); the truncation
    // pass adds at least 4 more (the four styles named above). Baseline dropped from
    // 9 to 7 when the large/compact cards were unified into one BrandCard, which
    // de-duplicated the title + caption markup without changing runtime capping.
    const numberOfLinesCount =
      (homeSource.match(/numberOfLines=\{/g) ?? []).length +
      (brandCardSource.match(/numberOfLines=\{/g) ?? []).length;
    expect(numberOfLinesCount).toBeGreaterThanOrEqual(11);
  });

  it("sets ellipsizeMode so clamped Thai labels show a trailing ellipsis", () => {
    expect(homeSource).toContain('ellipsizeMode="tail"');
  });

  it("caps the Top Brands / promo section titles specifically", () => {
    // styles.sectionTitle is the "Top Brands" heading; styles.sectionTitleSmall is each
    // promo section heading. The numberOfLines prop must sit on the SAME <Text> as the
    // style (no intervening "<Text" between them) so the assertion can't be satisfied by
    // an unrelated capped Text earlier in the file.
    expect(homeSource).toMatch(/numberOfLines=\{1\}(?:(?!<Text)[\s\S])*?style=\{styles\.sectionTitle\}/);
    expect(homeSource).toMatch(
      /numberOfLines=\{1\}(?:(?!<Text)[\s\S])*?style=\{styles\.sectionTitleSmall\}/
    );
  });

  it("caps the browse/category shortcut pill label", () => {
    expect(homeSource).toMatch(/numberOfLines=\{1\}(?:(?!<Text)[\s\S])*?style=\{styles\.shortcutText\}/);
  });
});

describe("CustomerHomeScreen — Wave 2 mobile-friendly P0 (source signals)", () => {
  it("home search chrome > given dark mode > then placeholder and pill copy use muted ink", () => {
    expect(homeSource).toMatch(/searchText:[\s\S]*?color: colors\.muted/);
    expect(homeSource).toContain("placeholderTextColor={colors.muted}");
    expect(homeSource).not.toMatch(
      /placeholderTextColor=\{pickThemed\(colors, "rgba\(92, 114, 107, 0\.55\)", colors\.textSoft\)\}/,
    );
  });

  it("gives the sub-44px GoLink info icon button a hitSlop so the tap target reaches 44px", () => {
    expect(homeSource).toMatch(/hitSlop=\{10\}[\s\S]*?styles\.desktopGoLinkInfoButton/);
  });
});
