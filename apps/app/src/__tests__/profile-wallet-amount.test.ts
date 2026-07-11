import { describe, expect, it } from "vitest";

import {
  PROFILE_WALLET_AMOUNT_PLACEHOLDER,
  formatProfileWalletAmountTHB,
  resolveProfileCashbackBreakdownRows,
  resolveProfileCurrency,
  resolveProfileWalletAmount,
} from "@mobile/account/resolveProfileWalletAmount";
import { webProfileWalletSummary } from "@mobile/design/webDesignParity";

describe("formatProfileWalletAmountTHB", () => {
  it("given a zero balance > then shows a bare 0 (founder feedback 2026-07-11: not 0.00)", () => {
    expect(formatProfileWalletAmountTHB(0)).toBe("0");
  });

  it("given a whole-baht balance > then drops the .00", () => {
    expect(formatProfileWalletAmountTHB(1250)).toBe("1,250");
  });

  it("given satang precision > then keeps two decimals", () => {
    expect(formatProfileWalletAmountTHB(3180.24)).toBe("3,180.24");
    expect(formatProfileWalletAmountTHB(12.5)).toBe("12.50");
  });

  it("given a stale session wallet string of 0.00 > then normalizes to 0", () => {
    expect(resolveProfileWalletAmount("backend", "0.00", undefined)).toBe("0");
    expect(resolveProfileWalletAmount("backend", "125.00", undefined)).toBe("125");
    expect(resolveProfileWalletAmount("backend", "125.40", undefined)).toBe("125.40");
  });
});

describe("resolveProfileCashbackBreakdownRows", () => {
  const fixtureRows = [
    { amount: "675.00", label: "Linked My Cashback" },
    { amount: "2,505.24", label: "GoGoCash balance" },
  ];

  it("resolveProfileCashbackBreakdownRows > given backend mode > then hides the fixture rows — no per-source data exists", () => {
    // Field bug 2026-07-10: the live /profile panel rendered fixture
    // "675.00" + "2,505.24" as a BALANCE BREAKDOWN next to a real 0.00
    // balance. The backend exposes no per-source split, so the section
    // hides rather than fakes one (money rule: backend-derived or nothing).
    expect(resolveProfileCashbackBreakdownRows("backend", fixtureRows)).toEqual([]);
  });

  it("resolveProfileCashbackBreakdownRows > given fixtures mode > then keeps the design-parity rows", () => {
    expect(resolveProfileCashbackBreakdownRows("fixtures", fixtureRows)).toEqual(fixtureRows);
  });
});

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
    ).toBe("1,000");
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
