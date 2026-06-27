import { describe, expect, it } from "vitest";

import { buildFeaturedSearchPath } from "@mobile/account/searchResource";

describe("useFeaturedSearch > buildFeaturedSearchPath", () => {
  it("given backend featured search > then uses the public offer featured endpoint", () => {
    expect(buildFeaturedSearchPath()).toBe("/offer/search/featured");
  });
});
