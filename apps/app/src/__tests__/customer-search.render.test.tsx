import { createElement, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const replaceMock = vi.fn();
const localSearchParamsMock = vi.fn<() => { q?: string }>(() => ({}));
const useWindowDimensionsMock = vi.fn(() => ({
  fontScale: 1,
  height: 800,
  scale: 1,
  width: 390,
}));

vi.mock("react-native", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-native")>();
  return {
    ...actual,
    useWindowDimensions: () => useWindowDimensionsMock(),
  };
});

vi.mock("expo-router", () => ({
  Link: ({ children }: { children: ReactNode }) => createElement("a", {}, children),
  useLocalSearchParams: () => localSearchParamsMock(),
  useRouter: () => ({
    back: vi.fn(),
    canGoBack: () => true,
    push: vi.fn(),
    replace: replaceMock,
  }),
}));

import { CustomerSearchScreen } from "@mobile/screens/CustomerSearchScreen";

function renderSearchScreen() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    createElement(QueryClientProvider, { client: queryClient }, createElement(CustomerSearchScreen))
  );
}

describe("CustomerSearchScreen (render)", () => {
  beforeEach(() => {
    globalThis.localStorage.clear();
    localSearchParamsMock.mockReturnValue({});
  });

  it("mounts the mobile search page without throwing", () => {
    useWindowDimensionsMock.mockReturnValue({
      fontScale: 1,
      height: 800,
      scale: 1,
      width: 390,
    });
    expect(() => renderSearchScreen()).not.toThrow();
  });

  it("renders the autofocus search input", () => {
    useWindowDimensionsMock.mockReturnValue({
      fontScale: 1,
      height: 800,
      scale: 1,
      width: 390,
    });
    renderSearchScreen();
    const input = screen.getByTestId("mobile-search-input");
    expect(input).toBeTruthy();
    expect(screen.getByPlaceholderText("Search brands")).toBeTruthy();
    expect(
      screen.getByLabelText("Search brands, stores, products, or cashback"),
    ).toBeTruthy();
  });

  it("shows one compact popular panel, trending searches, popular brands, and recent history when the query is empty", async () => {
    useWindowDimensionsMock.mockReturnValue({
      fontScale: 1,
      height: 800,
      scale: 1,
      width: 390,
    });
    globalThis.localStorage.setItem(
      "gogocash.search.recent.v1",
      JSON.stringify(["Traveloka"]),
    );
    renderSearchScreen();

    await waitFor(() => {
      expect(screen.getByText("Recent searches")).toBeTruthy();
    });

    expect(screen.getByText("Popular brands")).toBeTruthy();
    expect(screen.getByText("Explore standout cashback offers.")).toBeTruthy();
    expect(screen.getAllByText("Popular right now")).toHaveLength(1);
    expect(screen.getByText("Trending searches")).toBeTruthy();
    expect(screen.getByLabelText("Clear recent searches")).toBeTruthy();
    expect(screen.getByLabelText("Remove Traveloka from recent searches")).toBeTruthy();
    expect(
      screen.queryByText("Start typing to search brands, stores, products, or cashback."),
    ).toBeNull();
    expect(screen.getAllByText("Grocery Galaxy").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Cashback up to").length).toBeGreaterThan(0);
  });

  it("shows one compact popular panel and popular brands, but no trending searches, for an active query", async () => {
    localSearchParamsMock.mockReturnValue({ q: "Traveloka" });
    useWindowDimensionsMock.mockReturnValue({
      fontScale: 1,
      height: 800,
      scale: 1,
      width: 390,
    });
    globalThis.localStorage.setItem(
      "gogocash.search.recent.v1",
      JSON.stringify(["LG"]),
    );

    renderSearchScreen();

    await waitFor(() => {
      expect(
        screen.getByText(
          "No brands or products match that search—browse popular picks below.",
        ),
      ).toBeTruthy();
      expect(screen.getByText("Recent searches")).toBeTruthy();
    });

    expect(screen.getByDisplayValue("Traveloka")).toBeTruthy();
    expect(screen.getAllByText("Popular right now")).toHaveLength(1);
    expect(screen.getByText("Popular brands")).toBeTruthy();
    expect(screen.queryByText("Trending searches")).toBeNull();
    expect(screen.queryByText("Searching brands and shops…")).toBeNull();
    expect(screen.getByLabelText("Remove LG from recent searches")).toBeTruthy();
  });

  it("given desktop width > then redirects to home", () => {
    replaceMock.mockClear();
    useWindowDimensionsMock.mockReturnValue({
      fontScale: 1,
      height: 900,
      scale: 1,
      width: 1280,
    });
    renderSearchScreen();
    expect(replaceMock).toHaveBeenCalled();
    expect(screen.queryByTestId("mobile-search-input")).toBeNull();
  });
});

describe("CustomerSearchScreen — design feedback (source signals)", () => {
  it("'See all' reads normal weight — it is a link, not a heading", () => {
    // Design feedback 2026-07-10.
    const { readFileSync } = require("node:fs") as typeof import("node:fs");
    const { resolve, dirname } = require("node:path") as typeof import("node:path");
    const { fileURLToPath } = require("node:url") as typeof import("node:url");
    const stylesSource = readFileSync(
      resolve(
        dirname(fileURLToPath(import.meta.url)),
        "../screens/search/createSearchScreenStyles.ts",
      ),
      "utf8",
    );
    expect(stylesSource).toMatch(/seeAllLabel:[\s\S]*?fontWeight: "400"/);
  });

  it("keeps the compact mobile targets and popular-card hierarchy", () => {
    const { readFileSync } = require("node:fs") as typeof import("node:fs");
    const { resolve, dirname } = require("node:path") as typeof import("node:path");
    const { fileURLToPath } = require("node:url") as typeof import("node:url");
    const stylesSource = readFileSync(
      resolve(
        dirname(fileURLToPath(import.meta.url)),
        "../screens/search/createSearchScreenStyles.ts",
      ),
      "utf8",
    );
    const recentChipsSource = readFileSync(
      resolve(
        dirname(fileURLToPath(import.meta.url)),
        "../screens/search/SearchRecentChips.tsx",
      ),
      "utf8",
    );
    const popularIntroSource = readFileSync(
      resolve(
        dirname(fileURLToPath(import.meta.url)),
        "../screens/search/SearchPopularIntro.tsx",
      ),
      "utf8",
    );

    expect(stylesSource).toMatch(/backButton:[\s\S]*?height: 44,[\s\S]*?width: 44/);
    expect(stylesSource).toMatch(/searchFieldShell:[\s\S]*?minHeight: 48/);
    expect(stylesSource).toMatch(/submitButton:[\s\S]*?height: 48,[\s\S]*?width: 48/);
    expect(stylesSource).toMatch(/popularIntro:[\s\S]*?minHeight: 68/);
    expect(stylesSource).toMatch(/popularIntroIcon:[\s\S]*?height: 44,[\s\S]*?width: 44/);
    expect(stylesSource).toMatch(
      /popularIntroTitle:[\s\S]*?fontSize: 15,[\s\S]*?lineHeight: 19/,
    );
    expect(stylesSource).toMatch(
      /popularIntroSubtitle:[\s\S]*?fontSize: 12,[\s\S]*?lineHeight: 18/,
    );
    expect(stylesSource).not.toMatch(
      /popularIntro(?:Icon|Title|Subtitle)?Compact:/,
    );
    expect(popularIntroSource).not.toContain("variant");
    expect(stylesSource).toMatch(/clearHistoryButton:[\s\S]*?minHeight: 44/);
    expect(stylesSource).toMatch(/recentChipSelect:[\s\S]*?minHeight: 44/);
    expect(recentChipsSource).toContain("style={styles.recentChipSelect}");
    expect(stylesSource).toMatch(/trendingChip:[\s\S]*?minHeight: 44/);
  });
});
