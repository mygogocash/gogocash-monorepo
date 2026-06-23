import { describe, expect, it } from "vitest";

const preflight = await import("../../scripts/gogosense-preflight.mjs");

describe("GoGoSense preflight diagnostics", () => {
  it("explains a missing merchant catalog route as stale API deployment or wrong base URL", () => {
    const message = preflight.merchantCatalogFetchError(
      404,
      "<html><title>404 Page not found</title><body>Page not found</body></html>",
    );

    expect(message).toContain("GET /gogosense/merchants returned 404");
    expect(message).toContain("GoGoSense API route is missing at this base URL");
    expect(message).toContain("Verify GOGOSENSE_API_URL/EXPO_PUBLIC_API_URL");
    expect(message).toContain("deploy the current API to staging");
    expect(message).toContain("npm run gogosense:seed-merchants -w apps/api");
  });

  it("keeps non-404 catalog failures compact with the upstream status and body", () => {
    expect(preflight.merchantCatalogFetchError(503, "upstream unavailable")).toBe(
      "GET /gogosense/merchants returned 503: upstream unavailable",
    );
  });
});
