import { describe, expect, it } from "vitest";

import { resolveOfferSearchResult } from "../account/resolveOfferSearchResult";

describe("resolveOfferSearchResult", () => {
  it("given backend mode and pending query > then returns loading with no matches", () => {
    expect(
      resolveOfferSearchResult("shopee", "backend", {
        data: undefined,
        isError: false,
        isPending: true,
      })
    ).toEqual({ matches: [], status: "loading" });
  });

  it("given backend mode and failed query > then returns error without fixture fallback", () => {
    expect(
      resolveOfferSearchResult("shopee", "backend", {
        data: undefined,
        isError: true,
        isPending: false,
      })
    ).toEqual({ matches: [], status: "error" });
  });

  it("given fixtures mode > then returns local fixture matches", () => {
    const result = resolveOfferSearchResult("grocery", "fixtures", {
      data: undefined,
      isError: false,
      isPending: false,
    });

    expect(result.status).toBe("ready");
    expect(result.matches.length).toBeGreaterThan(0);
    expect(result.matches.some((match) => match.brand.toLowerCase().includes("grocery"))).toBe(true);
  });
});
