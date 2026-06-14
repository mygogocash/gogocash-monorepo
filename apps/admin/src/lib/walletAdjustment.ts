/**
 * Guards an "add cashback" request before it credits a user's wallet:
 * the amount must parse to a positive (finite) number, and a reason is required.
 */
export function isValidCashbackAddition(
  amount: string,
  reason: string,
): boolean {
  const value = Number(amount);
  return Number.isFinite(value) && value > 0 && reason.trim().length > 0;
}
