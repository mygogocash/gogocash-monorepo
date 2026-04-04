import type { ResponseWithdrawCheck } from "@/interfaces/withdraw";

/**
 * GoGoCash net + MyCashback available in one currency (THB vs USD), for header / popper display.
 */
export function combineAvailableBalance(
  getCheck: ResponseWithdrawCheck | undefined,
  thai: boolean
): number {
  if (!getCheck) {
    return 0;
  }
  const gogoThb = Number(getCheck.netAmountTHB) || 0;
  const gogoUsd = Number(getCheck.netAmount) || 0;
  const mycbThb = Number(getCheck.MCBCashback?.availableTHB) || 0;
  const mycbUsd = Number(getCheck.MCBCashback?.availableUSD) || 0;
  return thai ? gogoThb + mycbThb : gogoUsd + mycbUsd;
}
