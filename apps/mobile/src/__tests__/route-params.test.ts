import { describe, expect, it } from "vitest";

import { normalizeRouteParam } from "@mobile/navigation/routeParams";

describe("Expo route param normalization", () => {
  it("route params > given dynamic route ids > then unsafe values are bounded and normalized", () => {
    expect(normalizeRouteParam("brand-grocery-galaxy-1001")).toBe("brand-grocery-galaxy-1001");
    expect(normalizeRouteParam(["Health%20%26%20Beauty"])).toBe("Health & Beauty");
    expect(normalizeRouteParam("grocery%2Fgalaxy")).toBe("grocery-galaxy");
    expect(normalizeRouteParam("../wallet")).toBe("wallet");
    expect(normalizeRouteParam("<script>alert(1)</script>")).toBe("script-alert-1-script");
    expect(normalizeRouteParam("a".repeat(160))).toHaveLength(96);
  });

  it("route params > given empty or control-character values > then fallback is used", () => {
    expect(normalizeRouteParam(undefined, "fallback")).toBe("fallback");
    expect(normalizeRouteParam("", "fallback")).toBe("fallback");
    expect(normalizeRouteParam("\n\r\t", "fallback")).toBe("fallback");
  });
});
