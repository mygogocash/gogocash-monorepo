import { describe, expect, it } from "vitest";

import {
  PROFILE_WALLET_AMOUNT_PLACEHOLDER,
  resolveProfileWalletAmount,
} from "@mobile/account/resolveProfileWalletAmount";
import { webProfileWalletSummary } from "@mobile/design/webDesignParity";

describe("resolveProfileWalletAmount", () => {
  it("resolveProfileWalletAmount > given backend mode and session wallet > then prefers session string", () => {
    expect(resolveProfileWalletAmount("backend", "1,234.56", null, false)).toBe("1,234.56");
  });

  it("resolveProfileWalletAmount > given backend mode loading without session wallet > then shows placeholder", () => {
    expect(resolveProfileWalletAmount("backend", null, null, true)).toBe(
      PROFILE_WALLET_AMOUNT_PLACEHOLDER,
    );
  });

  it("resolveProfileWalletAmount > given backend mode with wallet query ready > then formats netAmountTHB", () => {
    expect(
      resolveProfileWalletAmount(
        "backend",
        null,
        { netAmountTHB: 1000, netAmount: 1000, totalPayoutTHB: 1000, totalPayoutUSD: 1000 },
        false,
      ),
    ).toBe("1,000.00");
  });

  it("resolveProfileWalletAmount > given backend mode without session or wallet data > then never returns fixture amount", () => {
    expect(resolveProfileWalletAmount("backend", null, null, false)).toBe(
      PROFILE_WALLET_AMOUNT_PLACEHOLDER,
    );
    expect(resolveProfileWalletAmount("backend", null, null, false)).not.toBe(
      webProfileWalletSummary.amount,
    );
  });

  it("resolveProfileWalletAmount > given fixtures mode without session wallet > then uses fixture amount", () => {
    expect(resolveProfileWalletAmount("fixtures", null, null, false)).toBe(
      webProfileWalletSummary.amount,
    );
  });
});
