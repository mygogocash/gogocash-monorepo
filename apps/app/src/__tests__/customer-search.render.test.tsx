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
    expect(screen.getByTestId("mobile-search-input")).toBeTruthy();
  });

  it("shows search suggestions when the query is empty", () => {
    useWindowDimensionsMock.mockReturnValue({
      fontScale: 1,
      height: 800,
      scale: 1,
      width: 390,
    });
    renderSearchScreen();
    expect(screen.getByText("Search suggestions")).toBeTruthy();
    expect(screen.getByText("Popular right now")).toBeTruthy();
    expect(screen.getByText("Trending searches")).toBeTruthy();
    expect(screen.getAllByText("Grocery Galaxy").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Cashback upto").length).toBeGreaterThan(0);
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
