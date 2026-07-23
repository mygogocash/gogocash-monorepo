/** Suggested bank payout = amount_net − final fee when fee fields exist. */

export function resolveBankPayoutAmount(withdraw: {
  amount_net?: number | null;
  withdraw_fee_final?: number | null;
}): number {
  const amountNet = Number(withdraw.amount_net ?? 0);
  if (!Number.isFinite(amountNet)) {
    return 0;
  }
  if (
    typeof withdraw.withdraw_fee_final === "number" &&
    Number.isFinite(withdraw.withdraw_fee_final)
  ) {
    return Math.max(0, amountNet - withdraw.withdraw_fee_final);
  }
  return amountNet;
}
