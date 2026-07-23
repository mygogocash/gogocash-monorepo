import { isCheckWithdrawResponse } from "@mobile/api/walletTypes";
import type { AccountDataSource } from "@mobile/auth/routeGuard";
import { webProfileWalletSummary } from "@mobile/design/webDesignParity";

export const PROFILE_WALLET_AMOUNT_PLACEHOLDER = "—";

function readSessionWalletAmount(sessionWallet: string | null | undefined): string | null {
  if (typeof sessionWallet !== "string") {
    return null;
  }

  const trimmed = sessionWallet.trim();
  // Whole-baht session strings ("0.00", "125.00") drop the noise decimals —
  // founder feedback 2026-07-11: a zero balance reads "0", not "0.00".
  return trimmed ? trimmed.replace(/\.0+$/, "") : null;
}

export function formatProfileWalletAmountTHB(amount: number): string {
  return amount.toLocaleString("en-US", {
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

/**
 * The profile "BALANCE BREAKDOWN" rows are design fixtures; the backend has no
 * per-source split endpoint. In live mode the section hides rather than fakes
 * one — fixture demo numbers must never render as a real balance.
 */
export function resolveProfileCashbackBreakdownRows<T>(
  accountDataSource: AccountDataSource,
  fixtureRows: ReadonlyArray<T>,
): ReadonlyArray<T> {
  return accountDataSource === "backend" ? [] : fixtureRows;
}

export function resolveProfileWalletAmount(
  accountDataSource: AccountDataSource,
  sessionWallet: string | null | undefined,
  walletData: unknown,
): string {
  if (accountDataSource === "backend") {
    // The live wallet-check resource is the same authoritative source the
    // Wallet screen renders from — it must win over `session.wallet`, which
    // is synced from GET /user/profile and can lag behind or hold an
    // unrelated cached value (e.g. a stale "0.00").
    if (isCheckWithdrawResponse(walletData)) {
      return formatProfileWalletAmountTHB(walletData.netAmountTHB);
    }

    return readSessionWalletAmount(sessionWallet) ?? PROFILE_WALLET_AMOUNT_PLACEHOLDER;
  }

  return readSessionWalletAmount(sessionWallet) ?? webProfileWalletSummary.amount;
}

/**
 * Resolve the currency label shown next to the profile wallet amount.
 * `session.region` is the backend's canonicalized ISO-3166-1 alpha-2 country
 * code (see apps/api/src/utils/country.ts toIso2Server), e.g. "TH" — never
 * the English display name "Thailand".
 */
export function resolveProfileCurrency(region: unknown): string {
  if (typeof region !== "string" || !region.trim()) {
    return webProfileWalletSummary.currency;
  }

  return region.trim().toUpperCase() === "TH" ? webProfileWalletSummary.currency : "USD";
}
