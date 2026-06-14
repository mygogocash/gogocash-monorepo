import { createElement, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("expo-router", () => ({
  Link: ({ children }: { children: ReactNode }) => children,
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), navigate: vi.fn() }),
  usePathname: () => "/billing",
}));

// Seam mock: the shared client resolves the live subscription payload, so the
// hook exercises its real backend branch without any network.
const clientGet = vi.fn();
vi.mock("@mobile/api/sharedClient", () => ({
  getSharedMobileApiClient: async () => ({ get: clientGet, post: vi.fn() }),
  resetSharedMobileApiClientForTests: () => {},
}));

import { CustomerSubscriptionScreen } from "@mobile/screens/CustomerSubscriptionScreen";

function renderScreen() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    createElement(
      QueryClientProvider,
      { client: queryClient },
      createElement(CustomerSubscriptionScreen, { mode: "billing" })
    )
  );
}

describe("CustomerSubscriptionScreen — live subscription status", () => {
  beforeEach(() => {
    vi.stubEnv("EXPO_PUBLIC_ACCOUNT_DATA_SOURCE", "backend");
    clientGet.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("given an active subscription > then the plans CTA is hidden (don't re-sell the plan)", async () => {
    clientGet.mockResolvedValue({ enabled: true, status: "active" });

    renderScreen();

    await waitFor(() => {
      expect(screen.getByText("My Subscription")).toBeTruthy();
    });
    // Two "View Plans" links exist normally (hero CTA + BillingPanel); an
    // active subscription hides the hero one.
    expect(screen.getAllByRole("link", { name: "View Plans" })).toHaveLength(1);
  });

  it("given billing is disabled (staging today) > then the CTA renders unchanged", async () => {
    clientGet.mockResolvedValue({ enabled: false, status: "disabled" });

    renderScreen();

    await waitFor(() => {
      expect(screen.getAllByRole("link", { name: "View Plans" })).toHaveLength(2);
    });
  });
});
