import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const mobileRoot = path.resolve(testDir, "../..");

function readMobileFile(relativePath: string) {
  return fs.readFileSync(path.join(mobileRoot, relativePath), "utf8");
}

describe("Account resource state parity", () => {
  it("account_resource_contract__given_backend_mode__then_priority_routes_have_backend_endpoints", () => {
    const resourceFile = readMobileFile("src/account/customerAccountResource.ts");

    for (const endpoint of [
      "/user/profile",
      "/withdraw/check",
      "/point/referral-list",
      "/offer/my-offers?limit=10&page=1",
      "/offer/${merchantId}",
      "/customer-billing/subscription",
    ]) {
      expect(resourceFile).toContain(endpoint);
    }

    expect(resourceFile).toContain("createMobileApiClient");
    expect(resourceFile).toContain("createAvailableSessionStore");
    expect(resourceFile).toContain("EXPO_PUBLIC_ACCOUNT_DATA_SOURCE");
    expect(resourceFile).toContain("isCustomerAccountResourcePayloadEmpty");
  });

  it("account_resource_states__given_loading_empty_error_offline__then_shared_route_state_renders", () => {
    const stateFile = readMobileFile("src/account/CustomerAccountResourceState.tsx");

    expect(stateFile).toContain("CustomerRouteState");
    expect(stateFile).toContain('variant="loading"');
    expect(stateFile).toContain('variant="empty"');
    expect(stateFile).toContain('variant="error"');
    expect(stateFile).toContain('variant="offline"');
    expect(stateFile).toContain("Try again");
  });

  it("account_routes__given_fixture_backed_priority_flows__then_backend_state_gates_are_wired", () => {
    const routeFiles = [
      "src/screens/CustomerProfileScreen.tsx",
      "src/screens/CustomerWalletScreen.tsx",
      "src/screens/CustomerReferralScreen.tsx",
      "src/screens/CustomerProfileOffersScreen.tsx",
      "src/screens/CustomerShopDetailScreen.tsx",
      "src/screens/CustomerSubscriptionScreen.tsx",
    ];

    for (const file of routeFiles) {
      const source = readMobileFile(file);

      expect(source, `${file} missing resource hook`).toContain("useCustomerAccountResource");
      expect(source, `${file} missing route-state gate`).toContain("CustomerAccountResourceState");
    }
  });
});
