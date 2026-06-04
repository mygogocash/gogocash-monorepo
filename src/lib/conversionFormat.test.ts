import { describe, expect, it } from "vitest";
import { conversionAdvSummary } from "@/lib/conversionFormat";

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
