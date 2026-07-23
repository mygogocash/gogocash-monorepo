import { describe, it, expect } from "vitest";
import {
  netCommissionFromRaw,
  rawCommissionFromNet,
  finalizeProductTypeRows,
} from "@/lib/productTypeCommission";

describe("netCommissionFromRaw", () => {
  it("applies the 30% fee (raw × 0.7) and returns a string", () => {
    expect(netCommissionFromRaw("10")).toBe("7");
  });

  it("rounds to 2 decimals", () => {
    expect(netCommissionFromRaw("12.5")).toBe("8.75");
  });

  it("returns '' for blank or non-numeric input", () => {
    expect(netCommissionFromRaw("")).toBe("");
    expect(netCommissionFromRaw("abc")).toBe("");
  });

  it("rejects negative and non-finite values (not valid commission rates)", () => {
    expect(netCommissionFromRaw("-5")).toBe("");
    expect(netCommissionFromRaw("Infinity")).toBe("");
    expect(netCommissionFromRaw("-Infinity")).toBe("");
  });

  it("accepts zero", () => {
    expect(netCommissionFromRaw("0")).toBe("0");
  });
});

describe("rawCommissionFromNet", () => {
  it("reverses the 30% fee (net ÷ 0.7)", () => {
    expect(rawCommissionFromNet("7")).toBe("10");
  });

  it("returns '' for blank or non-numeric input", () => {
    expect(rawCommissionFromNet("")).toBe("");
    expect(rawCommissionFromNet("abc")).toBe("");
  });

  it("rejects negative and non-finite values", () => {
    expect(rawCommissionFromNet("-3.5")).toBe("");
    expect(rawCommissionFromNet("Infinity")).toBe("");
  });
});

describe("explicit fee percent (Fee Structure rate)", () => {
  it("netCommissionFromRaw nets with the given fee instead of 30", () => {
    expect(netCommissionFromRaw("10", 20)).toBe("8");
    expect(netCommissionFromRaw("10", 0)).toBe("10");
  });

  it("rawCommissionFromNet reverses the given fee instead of 30", () => {
    expect(rawCommissionFromNet("8", 20)).toBe("10");
    expect(rawCommissionFromNet("10", 0)).toBe("10");
  });

  it("round-trips at a non-default fee", () => {
    expect(rawCommissionFromNet(netCommissionFromRaw("12.5", 20), 20)).toBe(
      "12.5",
    );
  });
});

describe("raw → net → raw round-trip", () => {
  it("recovers the original clean raw number", () => {
    expect(rawCommissionFromNet(netCommissionFromRaw("10"))).toBe("10");
    expect(rawCommissionFromNet(netCommissionFromRaw("12.5"))).toBe("12.5");
  });

  // The 2-decimal rounding makes the inverse lossy for values whose net is not
  // exactly representable — pin that so the round-trip isn't mistaken for an identity.
  it("is lossy when rounding drifts (documents the boundary)", () => {
    expect(rawCommissionFromNet(netCommissionFromRaw("0.05"))).not.toBe("0.05");
  });
});

describe("finalizeProductTypeRows (PR #283 review HIGH-1)", () => {
  // The per-row auto net was frozen into commission_info at typing time with
  // whatever fee was current (possibly the 30% fallback before the Fee
  // Structure fetch resolved). Submit must recompute auto rows from their raw
  // with the fee that is current AT SUBMIT.
  it("recomputes auto rows from raw with the submit-time fee", () => {
    const rows = finalizeProductTypeRows(
      [
        {
          name: " Electronics ",
          commission_info: "7%", // baked at the 30% fallback
          deeplink: "",
          entry_mode: "auto",
          commission_raw: "10",
        },
      ],
      20,
    );
    expect(rows).toEqual([
      { name: "Electronics", commission_info: "8%", deeplink: "" },
    ]);
  });

  it("leaves manual rows untouched and strips UI-only fields", () => {
    const rows = finalizeProductTypeRows(
      [
        {
          name: "Fashion",
          commission_info: " up to 5% ",
          deeplink: " https://x ",
          entry_mode: "manual",
          commission_raw: "999",
        },
      ],
      20,
    );
    expect(rows).toEqual([
      { name: "Fashion", commission_info: "up to 5%", deeplink: "https://x" },
    ]);
  });

  it("filters rows that are entirely empty (incl. the seeded blank frame)", () => {
    expect(
      finalizeProductTypeRows(
        [{ name: "", commission_info: "", deeplink: "", entry_mode: "auto", commission_raw: "" }],
        20,
      ),
    ).toEqual([]);
  });
});
