import { describe, expect, it, vi } from "vitest";

import {
  ANALYTICS_EVENTS,
  trackXtraShopClick,
  trackXtraShopView,
  type MobileAnalyticsClient,
} from "@mobile/analytics/events";

// #586 REQ-OBS-1 — Involve Xtra shop analytics. Coarse, PDPA-safe props only
// (numeric-ish shop id / rate string, no PII). Helpers never throw.
function makeClient() {
  const capture = vi.fn();
  const client: MobileAnalyticsClient = { capture };
  return { client, capture };
}

describe("Involve Xtra analytics events", () => {
  it("declares shop_view / shop_click event names", () => {
    expect(ANALYTICS_EVENTS.xtraShopView).toBe("shop_view");
    expect(ANALYTICS_EVENTS.xtraShopClick).toBe("shop_click");
  });

  it("trackXtraShopView emits shop_view with a count + source (undefined dropped)", () => {
    const { client, capture } = makeClient();
    trackXtraShopView(client, { count: 12, source: "shop_directory" });
    expect(capture).toHaveBeenCalledWith("shop_view", {
      shop_count: 12,
      source_section: "shop_directory",
    });
  });

  it("trackXtraShopClick emits shop_click with coarse props", () => {
    const { client, capture } = makeClient();
    trackXtraShopClick(client, {
      shopId: "xtra-1001",
      cashback: "1.5%",
      position: 3,
      source: "shop_directory",
    });
    expect(capture).toHaveBeenCalledWith("shop_click", {
      shop_id: "xtra-1001",
      cashback: "1.5%",
      shop_position: 3,
      source_section: "shop_directory",
    });
  });

  it("never throws on a null client", () => {
    expect(() =>
      trackXtraShopView(null, { count: 1, source: "shop_directory" }),
    ).not.toThrow();
    expect(() =>
      trackXtraShopClick(undefined, { shopId: "xtra-1", source: "x" }),
    ).not.toThrow();
  });
});
