import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createElement } from "react";
import { render } from "@testing-library/react";
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
const homeSource = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), "../screens/CustomerHomeScreen.tsx"),
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

afterEach(() => {
  setViewportWidth(DEFAULT_WINDOW_WIDTH);
});

describe("CustomerHomeScreen (render)", () => {
  it("mounts the mobile layout without throwing", () => {
    // < 1024 => getResponsiveHomeLayoutMetrics().isDesktop === false: sticky search,
    // BrowseShortcuts pills, Top Brands / promo sections, and the bottom nav render.
    setViewportWidth(390);
    expect(() => render(createElement(CustomerHomeScreen))).not.toThrow();
  });

  it("mounts the desktop layout without throwing", () => {
    // >= 1024 => isDesktop branch: desktop header chrome + capped content sections.
    setViewportWidth(1280);
    expect(() => render(createElement(CustomerHomeScreen))).not.toThrow();
  });
});

describe("CustomerHomeScreen — Wave B Thai-truncation pass (source signals)", () => {
  it("caps the previously-unbounded section titles and category pills with numberOfLines", () => {
    // Before this pass, sectionTitle / sectionTitleSmall / shortcutText /
    // desktopCategoryNavText rendered with no line cap, so a longer Thai translation
    // could overflow its single-line row. Each gets a numberOfLines cap. The screen
    // already had 9 numberOfLines props (brand/promo card titles, cashback captions,
    // coupon + bottom-nav labels); the truncation pass adds at least 4 more.
    const numberOfLinesCount = (homeSource.match(/numberOfLines=\{/g) ?? []).length;
    expect(numberOfLinesCount).toBeGreaterThanOrEqual(13);
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
