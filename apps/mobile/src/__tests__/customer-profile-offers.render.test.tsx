import { createElement } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CustomerProfileOffersScreen } from "@mobile/screens/CustomerProfileOffersScreen";

// Render coverage for the "My Offer" screen — an AccountPageShell screen backed by
// useCustomerAccountResource. That hook calls useQuery unconditionally (even though
// it returns fixture data synchronously when env.accountDataSource === "fixtures",
// the default under the harness), so the screen must be mounted inside a
// QueryClientProvider — the same provider AppProviders supplies in the real app.
// We render the ready state and assert the real strings: title "My Offer", the
// subheading, the three column headers (offer_id / offer_name / createdAt), and both
// seeded myOfferRows. Each value is its own <Text>, so exact getByText works.
function renderScreen() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    createElement(
      QueryClientProvider,
      { client: queryClient },
      createElement(CustomerProfileOffersScreen),
    ),
  );
}

describe("CustomerProfileOffersScreen (render)", () => {
  it("renders the title and subheading", () => {
    renderScreen();
    // "My Offer" is both the topbar title and the section heading
    expect(screen.getAllByText("My Offer").length).toBeGreaterThanOrEqual(2);
    expect(
      screen.getByText(
        "Activated cashback offers from your GoGoCash account, including each deeplink and created date.",
      ),
    ).toBeTruthy();
  });

  it("renders the three table column headers", () => {
    renderScreen();
    expect(screen.getByText("offer_id")).toBeTruthy();
    expect(screen.getByText("offer_name")).toBeTruthy();
    expect(screen.getByText("createdAt")).toBeTruthy();
  });

  it("renders both seeded offer rows (id, name, date, deeplink)", () => {
    renderScreen();
    expect(screen.getByText("OFFER-1024")).toBeTruthy();
    expect(screen.getByText("Agoda Summer Cashback")).toBeTruthy();
    expect(screen.getByText("28 Mar 2026")).toBeTruthy();
    expect(screen.getByText("https://gogoca.sh/offer/agoda-summer")).toBeTruthy();
    expect(screen.getByText("OFFER-1008")).toBeTruthy();
    expect(screen.getByText("Shopee Daily Deal")).toBeTruthy();
    expect(screen.getByText("22 Mar 2026")).toBeTruthy();
  });

  it("exposes a Copy Link control per offer row", () => {
    renderScreen();
    expect(screen.getAllByLabelText("Copy Link").length).toBe(2);
  });

  it("mounts without throwing inside a QueryClientProvider", () => {
    expect(() => renderScreen()).not.toThrow();
  });
});
