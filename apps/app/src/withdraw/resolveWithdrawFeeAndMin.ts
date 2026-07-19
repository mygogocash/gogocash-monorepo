import type { AccountDataSource } from "@mobile/auth/routeGuard";
import { isCheckWithdrawResponse } from "@mobile/api/walletTypes";

const FIXTURE_WITHDRAW_FEE = 20;
const FIXTURE_MIN_WITHDRAW = 300;

/**
 * Parity with API `resolveBaseWithdrawFee` for THB bank-transfer UI:
 * prefer global_withdraw_* when currency is THB, else lane fee_withdraw_thb.
 */
export function resolveWithdrawFeeAndMin(
  accountDataSource: AccountDataSource,
  walletData: unknown,
): { fee: number; min: number } {
  if (accountDataSource === "backend" && isCheckWithdrawResponse(walletData)) {
    const feeDoc = walletData.fee;
    const globalCurrency = (feeDoc?.global_withdraw_currency || "THB").toUpperCase();
    const useGlobal =
      typeof feeDoc?.global_withdraw_fee === "number" && globalCurrency === "THB";

    const fee = useGlobal
      ? feeDoc.global_withdraw_fee
      : (walletData.feeAmountTHB ??
        feeDoc?.fee_withdraw_thb ??
        FIXTURE_WITHDRAW_FEE);
    const min = useGlobal
      ? (feeDoc.global_minimum_withdraw ?? FIXTURE_MIN_WITHDRAW)
      : (feeDoc?.minimum_withdraw_thb ?? FIXTURE_MIN_WITHDRAW);

    return {
      fee: Number.isFinite(Number(fee)) ? Number(fee) : FIXTURE_WITHDRAW_FEE,
      min: Number.isFinite(Number(min)) ? Number(min) : FIXTURE_MIN_WITHDRAW,
    };
  }
  return { fee: FIXTURE_WITHDRAW_FEE, min: FIXTURE_MIN_WITHDRAW };
}
