import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createElement } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// CustomerCategoryDetailScreen reaches CustomerMobileBottomNav -> useCopy and
// expo-router (both aliased to stubs by vitest.render.config). It does NOT import
// Sentry/observability. Device locale is not under test, so mock expo-localization
// at the seam — the same defensive pattern customer-wallet/customer-auth render
// tests use — so a stray native-module load can't break the mount under happy-dom.
vi.mock("expo-localization", () => ({
  getLocales: () => [{ languageTag: "en-US", languageCode: "en" }],
}));

import { CustomerCategoryDetailScreen } from "@mobile/screens/CustomerCategoryDetailScreen";

// Wave B (cluster B4) per-screen UX adoption for the category-detail directory list
// (brands/shops within a category). RENDER suite: it MOUNTS the screen (react-native ->
// react-native-web, happy-dom) to prove the list still renders after the additive
// changes, AND reads the screen source to assert a behavior/source signal for each
// APPLIED Wave A foundation.
//
// APPLIED here:
//  - Thai-truncation: numberOfLines on the dynamic category header (title + subtitle),
//    which interpolate a possibly-Thai `category` and previously had no line clamp, so
//    a long Thai category name could overflow at 320px.
//  - haptics.impact() on sort-pill selection (the in-screen "item selection"); fire-and-
//    forget, web no-op.
//
// SKIPPED (NOTEs, see the report): pull-to-refresh + skeleton (data is the synchronous
// pure getCategoryExploreResults — no async resource / refetch seam, no loading branch,
// no CustomerAccountResourceState delegation); toast (no copy/clipboard action on this
// screen); KeyboardAwareScreen (the lone TextInput is a filter, not a submit form);
// hitSlop (no icon-only Pressable controls under 44px on this screen after BrandCard adoption).
const categorySource = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), "../screens/CustomerCategoryDetailScreen.tsx"),
  "utf8"
);

function renderScreen() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    createElement(
      QueryClientProvider,
      { client: queryClient },
      createElement(CustomerCategoryDetailScreen, { categoryName: "Health & Beauty" }),
    ),
  );
}

describe("CustomerCategoryDetailScreen (render)", () => {
  it("mounts the category-detail directory list without throwing", () => {
    expect(() => renderScreen()).not.toThrow();
  });
});

describe("CustomerCategoryDetailScreen — Wave B foundations adopted (source signals)", () => {
  it("clamps the dynamic category header (title + subtitle) so a long Thai category can't overflow", () => {
    // The header title and subtitle interpolate a dynamic, possibly-Thai `category`
    // (e.g. "Explore your Favorite <category>"). They previously had no line clamp.
    // numberOfLines bounds them so a long Thai category name truncates instead of
    // pushing the layout. Adds NO new strings (coverage-gated screen).
    expect(categorySource).toContain("styles.title");
    expect(categorySource).toContain("styles.subtitle");
    // Assert the clamp is co-located with each header Text element (the JSX writes
    // `numberOfLines={n}` adjacent to `style={...styles.title}` / `styles.subtitle`,
    // prop order aside). These are the only title/subtitle Text nodes in the header.
    expect(categorySource).toMatch(/numberOfLines=\{\d+\}[\s\S]{0,80}styles\.title/);
    expect(categorySource).toMatch(/numberOfLines=\{\d+\}[\s\S]{0,80}styles\.subtitle/);
  });

  it("fires haptics.impact() on sort-pill selection (in-screen item selection)", () => {
    // The sort pills are the screen's selectable items; selecting one should give a
    // medium-impact haptic (web no-op via the shared lib's Platform guard). The lib is
    // imported from @mobile/lib/haptics and called inside the pill's onPress.
    expect(categorySource).toContain("@mobile/lib/haptics");
    expect(categorySource).toContain("haptics.impact()");
    // Wired into the sort selection handler that also sets sortBy. The pills now live
    // in the shared DirectorySearchPanel, so the handler is its onSelectSort prop
    // rather than an inline onPress.
    expect(categorySource).toMatch(
      /onSelectSort=\{\([\s\S]*?\)\s*=>\s*\{[\s\S]*haptics\.impact\(\)[\s\S]*setSortBy\(/,
    );
  });

  it("uses canonical shop hrefs for brand cards instead of deriving display-name slugs", () => {
    const brandCardFile = readFileSync(
      resolve(dirname(fileURLToPath(import.meta.url)), "../components/BrandCard.tsx"),
      "utf8",
    );

    expect(categorySource).toContain('import { BrandCard } from "@mobile/components/BrandCard"');
    expect(brandCardFile).toContain("getTopBrandHref");
    expect(brandCardFile).toContain("href ?? brandHref(brand)");
    expect(categorySource).not.toContain("href={brandHref(store.brand)");
  });
});
