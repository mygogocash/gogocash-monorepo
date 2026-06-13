import { createElement } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AccountWalletHeroCard } from "@mobile/components/AccountPageShell";

// Render coverage for the GoGoPass member treatment on the wallet hero card.
// The /profile route is auth-guarded, so this verifies the tier-driven badge + ring
// wiring directly (badge shows for gogopass, hidden for free, card mounts without throwing).
describe("AccountWalletHeroCard GoGoPass treatment (render)", () => {
  it("shows the GOGOPASS badge for a gogopass member", () => {
    render(
      createElement(AccountWalletHeroCard, {
        maskedId: "***0001",
        tier: "gogopass",
        title: "Mock User",
      })
    );
    expect(screen.getByText("GOGOPASS")).toBeTruthy();
    expect(screen.getByText("Mock User")).toBeTruthy();
  });

  it("hides the badge for a free / undefined tier", () => {
    render(createElement(AccountWalletHeroCard, { title: "Mock User" }));
    expect(screen.queryByText("GOGOPASS")).toBeNull();
  });

  it("mounts the gold ring + badge without throwing", () => {
    expect(() =>
      render(createElement(AccountWalletHeroCard, { tier: "gogopass", title: "Mock User" }))
    ).not.toThrow();
  });
});
