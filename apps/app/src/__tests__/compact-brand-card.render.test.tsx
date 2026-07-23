import { createElement } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { BrandCard } from "@mobile/components/BrandCard";

// #496 — compact (size="S") cards should carry the same affordances as the large card.
// The heart already existed; the offer/tag chip did not, and the S prop union had no
// `label`/`showGrabCoupon` to pass one.
//
// Scope note: compact cards no longer appear on home (that moved to size="L" and
// home-design-parity actively forbids size="S" there). They survive on five screens —
// Shop detail, Category detail, Favorites, Search suggestions, Explore-other-shops.
function renderCompact(extra: Record<string, unknown> = {}) {
  return render(
    createElement(BrandCard, {
      size: "S",
      brand: "Supersports",
      cashback: "4.1%",
      cardHeight: 176,
      cardWidth: 140,
      logoVisualHeight: 106,
      ...extra,
    } as never),
  );
}

describe("compact BrandCard (#496)", () => {
  it("given a coupon label > then the compact card renders the same tag chip as the large card", () => {
    renderCompact({ label: "Grab Coupon", showGrabCoupon: true });

    expect(screen.getByText("Grab Coupon")).toBeTruthy();
  });

  it("given no coupon label > then no chip is rendered", () => {
    renderCompact();

    expect(screen.queryByText("Grab Coupon")).toBeNull();
    expect(screen.getByText("Cashback upto")).toBeTruthy();
  });

  it("given a surface-specific caption > then it leaves the shared default unchanged", () => {
    renderCompact({ cashbackCaption: "Cashback up to" });

    expect(screen.getByText("Cashback up to")).toBeTruthy();
    expect(screen.queryByText("Cashback upto")).toBeNull();
  });

  it("given the favorite heart is requested > then it renders alongside the chip", () => {
    renderCompact({ label: "Grab Coupon", showGrabCoupon: true, showFavoriteHeart: true });

    expect(screen.getByText("Grab Coupon")).toBeTruthy();
    expect(screen.getByLabelText(/Save brand: Supersports/)).toBeTruthy();
  });
});
