import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createElement } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ToastProvider } from "@mobile/components/Toast";
import { CustomerProfileOffersScreen } from "@mobile/screens/CustomerProfileOffersScreen";

// Render coverage for the "My Offer" screen — an AccountPageShell screen backed by
// useCustomerAccountResource. That hook calls useQuery unconditionally (even though
// it returns fixture data synchronously when env.accountDataSource === "fixtures",
// the default under the harness), so the screen must be mounted inside a
// QueryClientProvider — the same provider AppProviders supplies in the real app.
// The screen also consumes useToast() for copy confirmation (Wave B2), so we wrap in
// ToastProvider too — exactly as AppProviders does — otherwise useToast throws.
// We render the ready state and assert the real strings: title "My Offer", the
// subheading, the three column headers (offer_id / offer_name / createdAt), and both
// seeded myOfferRows. Each value is its own <Text>, so exact getByText works.
function renderScreen() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    createElement(
      QueryClientProvider,
      { client: queryClient },
      createElement(ToastProvider, {}, createElement(CustomerProfileOffersScreen)),
    ),
  );
}

// Wave B (B2) per-screen UX adoption for the activated-offers list. Beyond MOUNTING the
// screen, we read the screen source to assert a behavior/source signal for each applied
// Wave A foundation: a toast + success haptic fire on copy-to-clipboard, and the small
// (34px) icon-only copy button gets a hitSlop so its tap target reaches 44px. The toast
// REUSES the existing translated "Copied to clipboard" string (reverse-looked-up by tc()
// to the walletTransactionsCopied catalog key → Thai), so no new copy is introduced.
// Skeleton/RefreshControl are intentionally NOT adopted here: the table renders from a
// static fixture const (not offersResource.data), and the loading/empty/error spinner is
// owned by the shared CustomerAccountResourceState component, not this screen.
const offersSource = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), "../screens/CustomerProfileOffersScreen.tsx"),
  "utf8",
);

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

describe("CustomerProfileOffersScreen — Wave B foundations adopted (source signals)", () => {
  it("imports useToast and shows a copy-confirmation toast on copy-to-clipboard", () => {
    expect(offersSource).toContain('from "@mobile/hooks/useToast"');
    expect(offersSource).toContain("useToast(");
    expect(offersSource).toContain(".show(");
  });

  it("reuses the existing translated 'Copied to clipboard' string for the toast (no new copy)", () => {
    // tc("Copied to clipboard") reverse-looks-up the walletTransactionsCopied catalog key,
    // which already has a Thai translation — so the toast localizes without a new string.
    expect(offersSource).toContain('tc("Copied to clipboard")');
  });

  it("imports haptics and fires success feedback on copy", () => {
    expect(offersSource).toContain('from "@mobile/lib/haptics"');
    expect(offersSource).toContain("haptics.success(");
  });

  it("gives the 34px icon-only copy button a hitSlop so the tap target reaches 44px", () => {
    expect(offersSource).toContain("hitSlop=");
  });
});
