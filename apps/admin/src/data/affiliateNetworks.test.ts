import { describe, it, expect } from "vitest";

import {
  networkIdFromSource,
  resolveAffiliateNetworkIdForOffer,
} from "@/data/affiliateNetworks";

// #516/#517/#518 — the network shown for an offer must be its REAL network, not a
// modulo-3 mock. Precedence:
//   1. persisted affiliate_network_id (what the admin saved / #533 wrote)
//   2. affiliate_partner display name (legacy)
//   3. offer.source (involve / optimise / accesstrade / manual) — the import
//      network, which every real offer has
//   4. only then the old id-rotation mock, so pure-mock offers still resolve
describe("networkIdFromSource", () => {
  it("maps involve to involve_asia", () => {
    expect(networkIdFromSource("involve")).toBe("involve_asia");
  });

  it("passes optimise and accesstrade through unchanged", () => {
    expect(networkIdFromSource("optimise")).toBe("optimise");
    expect(networkIdFromSource("accesstrade")).toBe("accesstrade");
  });

  it("returns null for manual and unknown sources", () => {
    expect(networkIdFromSource("manual")).toBeNull();
    expect(networkIdFromSource(undefined)).toBeNull();
    expect(networkIdFromSource("whatever")).toBeNull();
  });
});

describe("resolveAffiliateNetworkIdForOffer precedence (#516)", () => {
  it("prefers the persisted affiliate_network_id above everything", () => {
    expect(
      resolveAffiliateNetworkIdForOffer({
        _id: "68e360b7d1a55e0e7f455b87",
        affiliate_network_id: "accesstrade",
        affiliate_partner: "Involve Asia",
        source: "involve",
      }),
    ).toBe("accesstrade");
  });

  it("falls back to affiliate_partner when no id is saved", () => {
    expect(
      resolveAffiliateNetworkIdForOffer({
        _id: "abc123",
        affiliate_partner: "Optimise",
        source: "involve",
      }),
    ).toBe("optimise");
  });

  it("falls back to source when neither id nor partner is present", () => {
    // This is the real-data case: 61 of 62 beta offers are source=involve with
    // affiliate_partner null and no saved id — they must resolve to Involve Asia,
    // NOT the id-rotation mock.
    expect(
      resolveAffiliateNetworkIdForOffer({
        _id: "68e360b7d1a55e0e7f455b8f",
        source: "involve",
      }),
    ).toBe("involve_asia");
  });

  it("does not use the rotation mock for a real involve offer whose id maps to another slot", () => {
    // id ending in a digit that % 3 lands on optimise/accesstrade must still
    // resolve by source, proving the mock no longer wins for real offers.
    const involveOffer = { _id: "o2", source: "involve" as const };
    expect(resolveAffiliateNetworkIdForOffer(involveOffer)).toBe("involve_asia");
  });

  it("still resolves a pure-mock offer with no source via id rotation", () => {
    // Mock fixtures have ids like o1/o2/o3 and no source; the old behaviour must
    // survive for them so mock-mode tooling keeps working.
    const id = resolveAffiliateNetworkIdForOffer({ _id: "o1" });
    expect(["involve_asia", "optimise", "accesstrade"]).toContain(id);
  });
});
