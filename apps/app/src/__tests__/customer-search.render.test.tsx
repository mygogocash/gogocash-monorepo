import { createElement, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const replaceMock = vi.fn();
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
  useLocalSearchParams: () => ({}),
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

  it("shows search suggestions when the query is empty", () => {
    useWindowDimensionsMock.mockReturnValue({
      fontScale: 1,
      height: 800,
      scale: 1,
      width: 390,
    });
    renderSearchScreen();
    expect(screen.getByText("Popular brands")).toBeTruthy();
    expect(screen.getByText("Explore standout cashback offers.")).toBeTruthy();
    expect(screen.getByText("Popular right now")).toBeTruthy();
    expect(screen.getByText("Trending searches")).toBeTruthy();
    expect(
      screen.queryByText("Start typing to search brands, stores, products, or cashback."),
    ).toBeNull();
    expect(screen.getAllByText("Grocery Galaxy").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Cashback up to").length).toBeGreaterThan(0);
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

    expect(stylesSource).toMatch(/backButton:[\s\S]*?height: 44,[\s\S]*?width: 44/);
    expect(stylesSource).toMatch(/searchFieldShell:[\s\S]*?minHeight: 48/);
    expect(stylesSource).toMatch(/submitButton:[\s\S]*?height: 48,[\s\S]*?width: 48/);
    expect(stylesSource).toMatch(/popularIntroIcon:[\s\S]*?height: 48,[\s\S]*?width: 48/);
    expect(stylesSource).toMatch(/popularIntroTitle:[\s\S]*?fontSize: 18/);
    expect(stylesSource).toMatch(/popularIntroSubtitle:[\s\S]*?fontSize: 14/);
    expect(stylesSource).toMatch(/clearHistoryButton:[\s\S]*?minHeight: 44/);
    expect(stylesSource).toMatch(/recentChipSelect:[\s\S]*?minHeight: 44/);
    expect(recentChipsSource).toContain("style={styles.recentChipSelect}");
    expect(stylesSource).toMatch(/trendingChip:[\s\S]*?minHeight: 44/);
  });
});
