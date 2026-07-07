import { isCheckWithdrawResponse } from "@mobile/api/walletTypes";
import type { AccountDataSource } from "@mobile/auth/routeGuard";
import { webProfileWalletSummary } from "@mobile/design/webDesignParity";

export const PROFILE_WALLET_AMOUNT_PLACEHOLDER = "—";

function readSessionWalletAmount(sessionWallet: string | null | undefined): string | null {
  if (typeof sessionWallet !== "string") {
    return null;
  }

  const trimmed = sessionWallet.trim();
  return trimmed ? trimmed : null;
}

export function formatProfileWalletAmountTHB(amount: number): string {
  return amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function resolveProfileWalletAmount(
  accountDataSource: AccountDataSource,
  sessionWallet: string | null | undefined,
  walletData: unknown,
  walletLoading: boolean,
): string {
  const sessionAmount = readSessionWalletAmount(sessionWallet);
  if (sessionAmount) {
    return sessionAmount;
  }

  if (accountDataSource === "backend") {
    if (walletLoading) {
      return PROFILE_WALLET_AMOUNT_PLACEHOLDER;
    }

    if (isCheckWithdrawResponse(walletData)) {
      return formatProfileWalletAmountTHB(walletData.netAmountTHB);
    }

    return PROFILE_WALLET_AMOUNT_PLACEHOLDER;
  }

  return webProfileWalletSummary.amount;
}
