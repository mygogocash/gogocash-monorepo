import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createElement } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// CustomerDiscoveryScreen reaches i18n/LocaleProvider (-> CustomerLocaleRegionControl ->
// expo-localization -> expo-modules-core, which touches the native `expo` global that does
// not exist under happy-dom: "__DEV__ is not defined"). Device locale is not under test, so
// mock the module at the seam — the same pattern the wallet/auth/profile render tests use.
// (No @mobile/observability mock needed: this screen does not import Sentry.)
vi.mock("expo-localization", () => ({
  getLocales: () => [{ languageTag: "en-US", languageCode: "en" }],
}));

import { CustomerDiscoveryScreen } from "@mobile/screens/CustomerDiscoveryScreen";
import { readDiscoverySources } from "../test-support/discoverySource";

function renderDiscovery(routeId: "brand" | "category" | "discover" | "shops") {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    createElement(
      QueryClientProvider,
      { client: queryClient },
      createElement(CustomerDiscoveryScreen, { routeId }),
    ),
  );
}

// Wave B (B4) per-screen UX adoption for the discovery DIRECTORY (categories, brand/shop/
// product cards). RENDER suite: it MOUNTS each directory variant (react-native ->
// react-native-web, happy-dom) to prove the directories still render after the additive
// changes, AND reads the screen source to assert a behavior/source signal for each applied
// Wave A foundation.
//
// Applied here:
//  - Pull-to-refresh: a RefreshControl on each variant's mobile vertical ScrollView, wired
//    to a local refresh handler. NOTE (reviewer): this directory is backed by SYNCHRONOUS
//    design-parity data (getBrandDirectoryResults / getCategoryDirectoryPage / ...), so there
//    is no async refetch to await — the refresh handler re-seeds the directory by resetting
//    to page 1 (the meaningful "refresh" action available) and clears the refreshing flag.
//    We do NOT invent a fake network round-trip.
//  - Thai-truncation: numberOfLines added to the sort labels + promo/sidebar titles that can
//    overflow in Thai (the card titles/pills already cap their lines). Additive prop only.
//  - haptics.impact() on category selection (a selection cue), wired onto the existing
//    onSelectCategory handlers — not a duplicated path.
//
// Intentionally NOT adopted:
//  - Skeleton: loading is NOT delegated to CustomerAccountResourceState and the screen owns
//    no async loading branch (data is in-memory/synchronous) — there is no loading state to
//    render a skeleton into. Skipped by design.
//  - KeyboardAwareScreen: the search fields are inline filter inputs inside scrollable
//    directories, not focus-and-submit forms — no keyboard-avoidance target.
const discoverySource = readDiscoverySources(
  resolve(dirname(fileURLToPath(import.meta.url)), "../.."),
);

describe("CustomerDiscoveryScreen (render)", () => {
  it("mounts the brand directory without throwing", () => {
    expect(() => renderDiscovery("brand")).not.toThrow();
  });

  it("mounts the category directory without throwing", () => {
    expect(() => renderDiscovery("category")).not.toThrow();
  });

  it("mounts the product discovery directory without throwing", () => {
    expect(() => renderDiscovery("discover")).not.toThrow();
  });

  it("mounts the shop directory without throwing", () => {
    expect(() => renderDiscovery("shops")).not.toThrow();
  });

  it.each([
    ["brand", "All Brands"],
    ["shops", "All Shops"],
    ["discover", "Product Discovery"],
  ] as const)("renders the shared specific-page banner before the %s directory", (routeId, title) => {
    renderDiscovery(routeId);

    expect(screen.getByText("Promotion by Brands")).toBeTruthy();
    expect(screen.getByText(title)).toBeTruthy();
  });
});

describe("CustomerDiscoveryScreen — Wave B (B4) foundations adopted (source signals)", () => {
  it("adds pull-to-refresh (RefreshControl) to the directory scroll views", () => {
    // RefreshControl comes from react-native (aliased to react-native-web in the render
    // harness). It must be mounted on the vertical directory ScrollView and wired to a
    // refresh handler that resets the directory.
    expect(discoverySource).toContain("RefreshControl");
    expect(discoverySource).toContain("<RefreshControl");
    expect(discoverySource).toContain("refreshControl=");
    expect(discoverySource).toContain("onRefresh=");
  });

  it("fires haptics.impact() on category selection", () => {
    // Wired onto the EXISTING onSelectCategory handlers (selection cue), not a new path.
    expect(discoverySource).toContain('from "@mobile/lib/haptics"');
    expect(discoverySource).toContain("haptics.impact(");
  });

  it("caps the sort labels with numberOfLines so they don't overflow in Thai", () => {
    // The sort labels ("Sort by") grow in Thai; cap them to a single line. The card titles
    // and pills already carry numberOfLines (verified in source), so this is the remaining
    // truncation gap on the directory chrome.
    expect(discoverySource).toContain("shopDirectorySortLabel");
    expect(discoverySource).toContain("productDiscoverySortLabel");
    // Each sort-label <Text> must now declare numberOfLines (additive prop).
    expect(discoverySource).toMatch(/numberOfLines=\{1\}\s*\n\s*style=\{styles\.shopDirectorySortLabel\}/);
    expect(
      discoverySource
    ).toMatch(/numberOfLines=\{1\}\s*\n\s*style=\{styles\.productDiscoverySortLabel\}/);
  });

  it("directory chrome > given dark mode > then background secondary copy uses muted ink", () => {
    expect(discoverySource).toMatch(/searchText:[\s\S]*?color: colors\.muted/);
    expect(discoverySource).toMatch(/shopDirectoryResultsCount:[\s\S]*?color: colors\.muted/);
    expect(discoverySource).toMatch(/productDiscoveryResultsCount:[\s\S]*?color: colors\.muted/);
    expect(discoverySource).not.toMatch(/placeholderTextColor=\{colors\.textSoft\}/);
  });

  it("gives the sub-44px pagination buttons a hitSlop so the tap target reaches 44px", () => {
    expect(discoverySource).toContain("shopDirectoryPageButton");
    expect(discoverySource).toMatch(/hitSlop=\{6\}[\s\S]*?styles\.shopDirectoryPageButton/);
  });

  it("caps category directory count and card CTA labels with numberOfLines", () => {
    expect(discoverySource).toMatch(
      /numberOfLines=\{1\}(?:(?!<Text)[\s\S])*?style=\{styles\.categoryDirectoryCount\}/,
    );
    expect(discoverySource).toMatch(
      /numberOfLines=\{1\}(?:(?!<Text)[\s\S])*?style=\{styles\.categoryDirectoryCardCta\}/,
    );
  });
});
