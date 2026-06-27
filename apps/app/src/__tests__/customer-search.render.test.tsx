import { createElement, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("expo-router", () => ({
  Link: ({ children }: { children: ReactNode }) => createElement("a", {}, children),
  useLocalSearchParams: () => ({}),
  useRouter: () => ({
    back: vi.fn(),
    canGoBack: () => true,
    push: vi.fn(),
    replace: vi.fn(),
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
    expect(() => renderSearchScreen()).not.toThrow();
  });

  it("renders the autofocus search input", () => {
    renderSearchScreen();
    expect(screen.getByTestId("mobile-search-input")).toBeTruthy();
  });

  it("shows search suggestions when the query is empty", () => {
    renderSearchScreen();
    expect(screen.getByText("Search suggestions")).toBeTruthy();
    expect(screen.getByText("Popular right now")).toBeTruthy();
    expect(screen.getByText("Trending searches")).toBeTruthy();
    expect(screen.getAllByText("Grocery Galaxy").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Cashback upto").length).toBeGreaterThan(0);
  });
});
