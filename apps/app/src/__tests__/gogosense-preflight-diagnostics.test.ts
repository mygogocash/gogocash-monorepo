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

  it("explains Usage Access as blocked by a missing dev-client install", () => {
    expect(
      preflight.usageAccessResult(false, { ok: false, stdout: "", stderr: "" }, "co.gogocash.app"),
    ).toEqual({
      status: "fail",
      name: "Usage Access grant",
      detail: "co.gogocash.app is not installed; install the GoGoCash dev client before granting Android Usage Access",
    });
  });

  it("keeps Usage Access grant guidance when the installed app lacks permission", () => {
    expect(
      preflight.usageAccessResult(true, { ok: false, stdout: "", stderr: "" }, "co.gogocash.app"),
    ).toEqual({
      status: "fail",
      name: "Usage Access grant",
      detail: "grant with: adb shell appops set co.gogocash.app GET_USAGE_STATS allow",
    });
  });

  it("explains that merchant install checks need a catalog or controlled package list", () => {
    expect(preflight.supportedMerchantInstallResult([], [])).toEqual({
      status: "fail",
      name: "supported merchant app installed",
      detail: "no merchant packages to check; fix the merchant catalog or pass --merchant-packages for controlled QA",
    });
  });

  it("keeps the supported merchant install package summary when a catalog is available", () => {
    expect(preflight.supportedMerchantInstallResult([], ["com.shopee.th", "com.lazada.android"])).toEqual({
      status: "fail",
      name: "supported merchant app installed",
      detail: "none installed from: com.shopee.th, com.lazada.android",
    });
  });
});
