import { describe, expect, it } from "vitest";

import {
  MOBILE_BACKEND_EXCLUDED_API_PREFIXES,
  MOBILE_BACKEND_EXCLUDED_INTEGRATIONS,
  resolveAuthSocialProviders,
  resolvePayoutMethodTabs,
} from "@mobile/api/backendIntegrationScope";
import { webAuthPage } from "@mobile/design/webDesignParity";

describe("backendIntegrationScope", () => {
  it("lists Crossmint and Web3 as out of scope for mobile backend", () => {
    expect(MOBILE_BACKEND_EXCLUDED_INTEGRATIONS).toEqual(
      expect.arrayContaining(["crossmint-auth", "web3-on-chain-withdraw"]),
    );
    expect(MOBILE_BACKEND_EXCLUDED_API_PREFIXES).toEqual(
      expect.arrayContaining(["/auth/minipay-siwe", "/auth/siwe-nonce"]),
    );
  });

  it("resolveAuthSocialProviders > backend > omits Connect Wallet", () => {
    expect(
      resolveAuthSocialProviders(webAuthPage.socialProviders, "backend").map((p) => p.id),
    ).toEqual(["facebook", "google", "telegram", "apple", "x", "microsoft"]);
  });

  it("resolveAuthSocialProviders > fixtures > keeps Connect Wallet for parity UI", () => {
    expect(
      resolveAuthSocialProviders(webAuthPage.socialProviders, "fixtures").map((p) => p.id),
    ).toContain("wallet");
  });

  it("resolvePayoutMethodTabs > backend > omits crypto payout tab", () => {
    expect(resolvePayoutMethodTabs("backend")).toEqual(["promptpay", "bank"]);
  });

  it("resolvePayoutMethodTabs > fixtures > keeps crypto tab", () => {
    expect(resolvePayoutMethodTabs("fixtures")).toEqual(["promptpay", "bank", "crypto"]);
  });
});
