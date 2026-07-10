import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createElement, type PropsWithChildren } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("expo-localization", () => ({
  getLocales: () => [{ languageTag: "en-US", languageCode: "en" }],
}));

vi.mock("@mobile/observability/client", () => ({
  resetObservabilityIdentity: vi.fn(),
}));

import { FavoriteBrandsProvider } from "@mobile/account/FavoriteBrandsProvider";
import { LocaleProvider } from "@mobile/i18n/LocaleProvider";
import { CustomerFavoriteBrandsScreen } from "@mobile/screens/CustomerFavoriteBrandsScreen";
import { CustomerHomeScreen } from "@mobile/screens/CustomerHomeScreen";

// Render coverage for the Favorite Brands screen (Wave B4 + live-catalog seam). The brand
// sections now flow through useCustomerAccountResource (resourceId "catalog"): the default
// "fixtures" data source returns webFavoriteBrandsPage.recentBrands synchronously, so every
// assertion below sees the same parity rows as before — but useQuery mounts unconditionally,
// so the screen needs a QueryClientProvider (same pattern as the wallet/referral suites).
// useCopy is stubbed to a passthrough by the render config.
function renderScreen() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    createElement(
      LocaleProvider,
      {},
      createElement(
        FavoriteBrandsProvider,
        {},
        createElement(
          QueryClientProvider,
          { client: queryClient },
          createElement(CustomerFavoriteBrandsScreen),
        ),
      ),
    ),
  );
}

// Beyond MOUNTING, we read the screen source to assert a behavior/source signal for the
// Wave-B treatments that actually apply to THIS screen:
//   * hitSlop on the icon-only back chevron (the ChevronLeft top-bar control) so its tap
//     target is comfortable on touch — matches the B-cluster "icon-only buttons" rule.
//   * numberOfLines on the hero title, which can overflow under Thai (longer strings) —
//     the Thai-truncation pass. (Brand-card names already carry numberOfLines={2}.)
// Treatments intentionally NOT applied here are documented in the assertions below:
//   * NO Skeleton / RefreshControl: the screen renders from a static fixture const, not an
//     async resource with a refetch, so there is nothing to refresh or skeleton.
//   * NO KeyboardAwareScreen: the screen has no text inputs.
// The favorite ♥ toggle IS now interactive (the upgraded brand-color card): tapping a card's
// heart saves/unsaves the brand into the Favorites section via local state — covered by the
// fireEvent tests below (the empty state appears once every saved brand is removed).
const screenSource = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), "../screens/CustomerFavoriteBrandsScreen.tsx"),
  "utf8",
);

describe("CustomerFavoriteBrandsScreen (render)", () => {
  it("mounts without throwing", () => {
    expect(() => renderScreen()).not.toThrow();
  });

  it("renders the page + hero copy from the fixture", () => {
    renderScreen();
    // "Favorite Brands" is the shell topbar title AND the page title -> appears multiple times.
    expect(screen.getAllByText("Favorite Brands").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("Find Your Brands")).toBeTruthy();
    expect(screen.getByText("Recently Visited Brands")).toBeTruthy();
  });

  it("renders seeded brand names from the fixture", () => {
    renderScreen();
    // Grocery Galaxy is in the recent grid AND the favorites section (pre-saved).
    expect(screen.getAllByText("Grocery Galaxy").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Orbit Airways")).toBeTruthy();
  });

  it("heart toggle saves a Recently Visited brand into the Favorites section", () => {
    renderScreen();
    // Pocket Pantry is in Recently Visited but NOT pre-saved → appears once.
    expect(screen.getAllByText("Pocket Pantry").length).toBe(1);
    fireEvent.click(screen.getByLabelText("Save brand: Pocket Pantry"));
    // After saving, it also renders in the Favorites section → twice.
    expect(screen.getAllByText("Pocket Pantry").length).toBe(2);
  });

  it("shows the empty state once every saved brand is removed", () => {
    renderScreen();
    // Two brands are pre-saved (Grocery Galaxy, Glow Theory); remove both via their hearts.
    fireEvent.click(screen.getAllByLabelText("Remove from saved brands: Grocery Galaxy")[0]);
    fireEvent.click(screen.getAllByLabelText("Remove from saved brands: Glow Theory")[0]);
    expect(screen.getByText("No saved brands yet")).toBeTruthy();
  });

  it("reflects a brand saved from home when the favorites screen mounts under the same provider", () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const SharedProviders = ({ children }: PropsWithChildren) =>
      createElement(
        LocaleProvider,
        {},
        createElement(
          FavoriteBrandsProvider,
          {},
          createElement(QueryClientProvider, { client: queryClient }, children),
        ),
      );

    const { rerender } = render(createElement(CustomerHomeScreen), { wrapper: SharedProviders });
    fireEvent.click(screen.getByLabelText("Save brand: Pocket Pantry"));
    rerender(createElement(CustomerFavoriteBrandsScreen));
    expect(screen.getAllByText("Pocket Pantry").length).toBeGreaterThanOrEqual(2);
  });
});

describe("CustomerFavoriteBrandsScreen — Wave B treatments (source signals)", () => {
  it("gives the icon-only back chevron a hitSlop for a comfortable tap target", () => {
    expect(screenSource).toContain("hitSlop");
  });

  it("truncates the hero title with numberOfLines so Thai copy does not overflow", () => {
    // Anchor the assertion to the hero title style so it tracks the real element, not just
    // the brand-card names that already truncate.
    expect(screenSource).toMatch(/numberOfLines=\{1\}[\s\S]*?style=\{styles\.heroTitle\}/);
  });

  it("scales brand-card name/value type down on mobile so names break at word boundaries", () => {
    // Design feedback 2026-07-10: at 2-column phone width (~169px cards) the
    // 18px name shared its row with the 27px cashback value, leaving ~75px —
    // "Grocery Galaxy" broke mid-word ("Grocer / y…"). Compact cards scale the
    // name to 14 and the value to 20 so the name column fits whole words.
    expect(screenSource).toMatch(/compact=\{!isDesktop\}/);
    expect(screenSource).toMatch(/brandNameCompact:[\s\S]*?fontSize: 14/);
    expect(screenSource).toMatch(/cashbackValueCompact:[\s\S]*?fontSize: 20/);
  });
});
