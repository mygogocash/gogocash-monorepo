import { describe, expect, it } from "vitest";
import {
  conversionAdvSummary,
  conversionGgcEarning,
  conversionUserEarning,
} from "@/lib/conversionFormat";

describe("conversionAdvSummary", () => {
  it("given all parts present > then joins them with ' , '", () => {
    expect(
      conversionAdvSummary({
        adv_sub1: "banana_it",
        adv_sub2: "order_0001",
        adv_sub3: "TH",
        adv_sub4: "flash_sale",
      }),
    ).toBe("banana_it , order_0001 , TH , flash_sale");
  });

  it("given trailing parts empty/null > then drops them (no dangling separator)", () => {
    expect(
      conversionAdvSummary({
        adv_sub1: "banana_it",
        adv_sub2: "order_0001",
        adv_sub3: "TH",
        adv_sub4: "",
      }),
    ).toBe("banana_it , order_0001 , TH");
  });

  it("given gaps in the middle > then keeps order and skips blanks", () => {
    expect(
      conversionAdvSummary({
        adv_sub1: "banana_it",
        adv_sub2: null,
        adv_sub3: "TH",
      }),
    ).toBe("banana_it , TH");
  });

  it("given all empty > then returns an empty string", () => {
    expect(conversionAdvSummary({})).toBe("");
  });

  it("trims surrounding whitespace on each part", () => {
    expect(conversionAdvSummary({ adv_sub1: "  a  ", adv_sub2: " b " })).toBe(
      "a , b",
    );
  });
});

describe("conversionUserEarning", () => {
  it("given a normal conversion with a system fee > then deducts the fee", () => {
    expect(
      conversionUserEarning({
        payout: 100,
        systemFeePct: 10,
        offer_name: "AirAsia Travel - CPS",
      }),
    ).toBeCloseTo(90, 5);
  });

  it("given a normal conversion with no fee > then equals the full payout", () => {
    expect(
      conversionUserEarning({
        payout: 75,
        systemFeePct: 0,
        offer_name: "AirAsia Travel - CPS",
      }),
    ).toBe(75);
  });

  it("given an Extra cashback conversion > then equals the full payout (no fee)", () => {
    expect(
      conversionUserEarning({
        payout: 75,
        systemFeePct: 5,
        offer_name: "Extra cashback",
      }),
    ).toBe(75);
  });

  it("given an Extra cashback conversion with a string payout > then parses it and applies no fee", () => {
    expect(
      conversionUserEarning({
        payout: "120.00",
        systemFeePct: 5,
        offer_name: "Extra cashback",
      }),
    ).toBe(120);
  });

  it("given a non-finite or non-positive payout > then returns 0", () => {
    expect(conversionUserEarning({ payout: "abc", systemFeePct: 5 })).toBe(0);
    expect(
      conversionUserEarning({
        payout: 0,
        systemFeePct: 5,
        offer_name: "Extra cashback",
      }),
    ).toBe(0);
  });
});

describe("conversionGgcEarning", () => {
  it("given a payout > then returns 30% of it", () => {
    expect(conversionGgcEarning({ payout: 100 })).toBeCloseTo(30, 5);
  });

  it("given a larger payout > then returns 30%", () => {
    expect(conversionGgcEarning({ payout: 200 })).toBeCloseTo(60, 5);
  });

  it("given a string payout > then parses it and returns 30%", () => {
    expect(conversionGgcEarning({ payout: "50.00" })).toBeCloseTo(15, 5);
  });

  it("given a non-finite or non-positive payout > then returns 0", () => {
    expect(conversionGgcEarning({ payout: "abc" })).toBe(0);
    expect(conversionGgcEarning({ payout: 0 })).toBe(0);
    expect(conversionGgcEarning({ payout: -10 })).toBe(0);
  });
});
