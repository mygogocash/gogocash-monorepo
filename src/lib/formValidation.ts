/**
 * Shared, pure validators for money/identifier form fields. Kept framework-free
 * so they can be unit-tested and reused across admin forms (conversions,
 * withdrawals, coupons, credit scores).
 */

/** True for a well-formed on-chain transaction hash (0x followed by 64 hex). */
export function isValidTxHash(hash: string | null | undefined): boolean {
  return /^0x[0-9a-fA-F]{64}$/.test((hash ?? "").trim());
}

/** Parse a user-entered amount to a finite number, or null if empty/invalid. */
export function parseAmount(raw: unknown): number | null {
  if (raw === "" || raw == null) return null;
  const n = typeof raw === "number" ? raw : Number(String(raw).trim());
  return Number.isFinite(n) ? n : null;
}

/**
 * Validate an optional money field. Returns an error message, or null when the
 * field is empty (untouched) or valid. `allowZero` distinguishes a payout
 * (>= 0) from a sale amount (> 0).
 */
export function validateOptionalAmount(
  raw: unknown,
  label: string,
  allowZero = false,
): string | null {
  if (raw === "" || raw == null) return null;
  const n = parseAmount(raw);
  if (n == null) return `${label} must be a number.`;
  if (n < 0 || (!allowZero && n === 0)) {
    return `${label} must be ${allowZero ? "zero or greater" : "greater than 0"}.`;
  }
  return null;
}

/**
 * Validate a required amount within an inclusive range. Returns an error
 * message or null. Useful for bounded values like a credit-score override.
 */
export function validateBoundedAmount(
  raw: unknown,
  label: string,
  min: number,
  max: number,
): string | null {
  const n = parseAmount(raw);
  if (n == null) return `${label} must be a number.`;
  if (n < min || n > max) return `${label} must be between ${min} and ${max}.`;
  return null;
}
