import { describe, expect, it } from "vitest";

import {
  PROFILE_WALLET_AMOUNT_PLACEHOLDER,
  resolveProfileCurrency,
  resolveProfileWalletAmount,
} from "@mobile/account/resolveProfileWalletAmount";
import { webProfileWalletSummary } from "@mobile/design/webDesignParity";

describe("resolveProfileWalletAmount", () => {
  it("resolveProfileWalletAmount > given backend mode and session wallet > then prefers session string", () => {
    expect(resolveProfileWalletAmount("backend", "1,234.56", null)).toBe("1,234.56");
  });

  it("resolveProfileWalletAmount > given backend mode without session wallet or wallet query > then shows placeholder", () => {
    expect(resolveProfileWalletAmount("backend", null, null)).toBe(
      PROFILE_WALLET_AMOUNT_PLACEHOLDER,
    );
  });

  it("resolveProfileWalletAmount > given backend mode with wallet query ready > then formats netAmountTHB", () => {
    expect(
      resolveProfileWalletAmount("backend", null, {
        netAmountTHB: 1000,
        netAmount: 1000,
        totalPayoutTHB: 1000,
        totalPayoutUSD: 1000,
      }),
    ).toBe("1,000.00");
  });

  it("resolveProfileWalletAmount > given a stale zero session wallet and a ready live wallet query > then prefers the live wallet balance", () => {
    // Regression: GET /user/profile's cached `wallet` field can lag or hold an
    // unrelated value (e.g. "0.00") while the same wallet-check resource the
    // Wallet screen renders from has already resolved the real balance. The
    // live, authoritative resource must win over the stale session value.
    expect(
      resolveProfileWalletAmount("backend", "0.00", {
        netAmountTHB: 3180.24,
        netAmount: 3180.24,
        totalPayoutTHB: 3180.24,
        totalPayoutUSD: 3180.24,
      }),
    ).toBe("3,180.24");
  });

  it("resolveProfileWalletAmount > given backend mode without session or wallet data > then never returns fixture amount", () => {
    expect(resolveProfileWalletAmount("backend", null, null)).toBe(
      PROFILE_WALLET_AMOUNT_PLACEHOLDER,
    );
    expect(resolveProfileWalletAmount("backend", null, null)).not.toBe(
      webProfileWalletSummary.amount,
    );
  });

  it("resolveProfileWalletAmount > given fixtures mode without session wallet > then uses fixture amount", () => {
    expect(resolveProfileWalletAmount("fixtures", null, null)).toBe(webProfileWalletSummary.amount);
  });
});

describe("resolveProfileCurrency", () => {
  it("resolveProfileCurrency > given Thailand's ISO-3166-1 alpha-2 code > then returns THB", () => {
    // Regression: the backend canonicalizes country to ISO-2 (toIso2Server in
    // apps/api/src/utils/country.ts), so session.region is "TH", never the
    // English display name "Thailand" — comparing against "Thailand" always
    // failed and every backend session showed "USD".
    expect(resolveProfileCurrency("TH")).toBe("THB");
  });

  it("resolveProfileCurrency > given a lowercase Thailand code > then returns THB case-insensitively", () => {
    expect(resolveProfileCurrency("th")).toBe("THB");
  });

  it("resolveProfileCurrency > given a non-Thailand ISO-2 code > then returns USD", () => {
    expect(resolveProfileCurrency("US")).toBe("USD");
  });

  it("resolveProfileCurrency > given no region > then defaults to THB", () => {
    expect(resolveProfileCurrency(undefined)).toBe(webProfileWalletSummary.currency);
    expect(resolveProfileCurrency(null)).toBe(webProfileWalletSummary.currency);
  });
});
