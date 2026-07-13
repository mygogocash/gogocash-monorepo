import { createElement, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// Founder 2026-07-13 (competitor reference screenshots): brand pages need a
// floating back button on the mobile hero cover. This suite mounts the mobile
// branch (default happy-dom viewport) and proves the control renders and
// navigates: history pop when possible, home fallback on deep-link entry.

// Same seam mock as customer-shop-detail.render.test.tsx — device locale is
// not under test and expo-localization touches the native `expo` global.
vi.mock("expo-localization", () => ({
  getLocales: () => [{ languageTag: "en-US", languageCode: "en" }],
}));

const backMock = vi.fn();
const replaceMock = vi.fn();
const canGoBackMock = vi.fn(() => true);

// Per-file override of the render-suite expo-router alias stub so the back
// handler's router calls are observable (pattern from customer-search.render).
vi.mock("expo-router", () => ({
  Link: ({ children }: { children?: ReactNode }) => createElement("a", {}, children),
  useLocalSearchParams: () => ({}),
  useRouter: () => ({
    back: backMock,
    canGoBack: canGoBackMock,
    push: vi.fn(),
    replace: replaceMock,
  }),
}));

import { ToastProvider } from "@mobile/components/Toast";
import { CustomerShopDetailScreen } from "@mobile/screens/CustomerShopDetailScreen";

// Fixtures mode: the merchant resource resolves "ready" synchronously, so the
// mobile page (hero included) mounts without extra resource mocks.
function renderScreen() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    createElement(
      QueryClientProvider,
      { client: queryClient },
      createElement(ToastProvider, {}, createElement(CustomerShopDetailScreen, {})),
    ),
  );
}

describe("CustomerShopDetailScreen back button (render)", () => {
  it("renders the floating Back control on the mobile hero", () => {
    renderScreen();
    expect(screen.getByLabelText("Back")).toBeTruthy();
  });

  it("pops history when the router can go back", () => {
    backMock.mockClear();
    replaceMock.mockClear();
    canGoBackMock.mockReturnValue(true);
    renderScreen();
    fireEvent.click(screen.getByLabelText("Back"));
    expect(backMock).toHaveBeenCalled();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("falls back to home on deep-link entry with no history", () => {
    backMock.mockClear();
    replaceMock.mockClear();
    canGoBackMock.mockReturnValue(false);
    renderScreen();
    fireEvent.click(screen.getByLabelText("Back"));
    expect(replaceMock).toHaveBeenCalledWith("/");
    expect(backMock).not.toHaveBeenCalled();
  });
});
