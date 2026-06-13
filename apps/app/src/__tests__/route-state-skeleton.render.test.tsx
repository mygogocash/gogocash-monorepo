import { createElement } from "react";
import { Text, View } from "react-native";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CustomerRouteState } from "@mobile/components/CustomerRouteState";
import { CustomerAccountResourceState } from "@mobile/account/CustomerAccountResourceState";

// Wave B (B3) — the shared loading path can now render a content-shaped skeleton instead of the
// generic centered spinner. `loadingSkeleton` is opt-in: when omitted, the existing spinner card is
// preserved (backward compatible); when provided on the loading variant, it replaces the card so data
// screens (Wallet, etc.) show a perceived-performance placeholder. CustomerAccountResourceState forwards
// the prop on its loading status so screens delegate loading without losing the skeleton.

describe("CustomerRouteState loading skeleton", () => {
  it("renders the provided loadingSkeleton instead of the spinner card on the loading variant", () => {
    render(
      createElement(CustomerRouteState, {
        variant: "loading",
        loadingSkeleton: createElement(
          View,
          { testID: "wallet-skeleton" },
          createElement(Text, {}, "skeleton")
        ),
      })
    );
    expect(screen.getByTestId("wallet-skeleton")).toBeTruthy();
    // In skeleton mode the spinner-card title must NOT render.
    expect(screen.queryByText("Loading GoGoCash")).toBeNull();
  });

  it("falls back to the spinner card when no loadingSkeleton is provided (backward compatible)", () => {
    render(createElement(CustomerRouteState, { variant: "loading" }));
    expect(screen.getByText("Loading GoGoCash")).toBeTruthy();
  });
});

describe("CustomerAccountResourceState forwards the loading skeleton", () => {
  it("renders loadingSkeleton when the resource is loading", () => {
    render(
      createElement(CustomerAccountResourceState, {
        loadingSkeleton: createElement(View, { testID: "acct-skeleton" }),
        resource: { status: "loading" } as never,
        resourceLabel: "wallet",
      })
    );
    expect(screen.getByTestId("acct-skeleton")).toBeTruthy();
  });

  it("still shows the spinner-card loading copy when no skeleton is passed", () => {
    render(
      createElement(CustomerAccountResourceState, {
        resource: { status: "loading" } as never,
        resourceLabel: "wallet",
      })
    );
    expect(screen.getByText(/Loading/)).toBeTruthy();
  });
});
