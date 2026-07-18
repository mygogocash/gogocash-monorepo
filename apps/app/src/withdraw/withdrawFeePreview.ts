export type WithdrawFeePreview = {
  available_balance: number;
  min_withdraw: number;
  base_fee: number;
  discount: number;
  final_fee: number;
  you_will_receive: number;
  remaining_cashback: number;
  currency: string;
  coupon?: { code: string; name: string; id?: string };
};

export function localWithdrawFeePreview(input: {
  amount: number;
  availableBalance: number;
  baseFee: number;
  minWithdraw: number;
  discount?: number;
}): WithdrawFeePreview | { ok: false; reason: string } {
  const amount = input.amount;
  if (!(amount > 0) || Number.isNaN(amount)) {
    return { ok: false, reason: "invalid_amount" };
  }
  if (amount < input.minWithdraw) {
    return { ok: false, reason: "below_minimum" };
  }
  if (amount > input.availableBalance) {
    return { ok: false, reason: "insufficient_balance" };
  }
  const discount = Math.min(
    Math.max(0, input.discount ?? 0),
    Math.max(0, input.baseFee),
  );
  const finalFee = Math.max(0, input.baseFee - discount);
  return {
    available_balance: input.availableBalance,
    min_withdraw: input.minWithdraw,
    base_fee: input.baseFee,
    discount,
    final_fee: finalFee,
    you_will_receive: Math.max(0, amount - finalFee),
    remaining_cashback: Math.max(0, input.availableBalance - amount),
    currency: "THB",
  };
}
