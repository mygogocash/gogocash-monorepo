import { BadRequestException } from '@nestjs/common';

/**
 * Parse multipart / JSON product-type rows into an array for Offer.product_type.
 * Accepts an already-parsed array or a JSON string (admin FormData).
 * Returns undefined when the field was not provided (partial updates must not wipe).
 *
 * Soft parse — use {@link requireProductTypeRowsField} on write paths where a
 * present-but-invalid value must 400 instead of being silently ignored.
 */
export function parseProductTypeRowsField(
  value: unknown,
): Array<Record<string, unknown>> | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (Array.isArray(value)) {
    return value as Array<Record<string, unknown>>;
  }
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  if (!trimmed || trimmed === 'undefined') {
    return undefined;
  }
  try {
    const parsed: unknown = JSON.parse(trimmed);
    return Array.isArray(parsed)
      ? (parsed as Array<Record<string, unknown>>)
      : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Like {@link parseProductTypeRowsField}, but a present value that is not a
 * JSON array is a 400 — admins must never see a success toast while their rows
 * were quietly dropped (#428 review).
 */
export function requireProductTypeRowsField(
  value: unknown,
  label: string,
): Array<Record<string, unknown>> | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (Array.isArray(value)) {
    return value as Array<Record<string, unknown>>;
  }
  if (typeof value !== 'string') {
    throw new BadRequestException(`${label} must be a JSON array`);
  }
  const trimmed = value.trim();
  if (!trimmed || trimmed === 'undefined') {
    // Multipart "undefined" sentinel / blank = not supplied (partial update).
    return undefined;
  }
  try {
    const parsed: unknown = JSON.parse(trimmed);
    if (!Array.isArray(parsed)) {
      throw new BadRequestException(`${label} must be a JSON array`);
    }
    return parsed as Array<Record<string, unknown>>;
  } catch (err) {
    if (err instanceof BadRequestException) throw err;
    throw new BadRequestException(`${label} must be a JSON array`);
  }
}

/**
 * Resolve product-type rows from either admin key (`product_types`) or the
 * persisted schema key (`product_type`). Prefer plural when both are present —
 * that is what Cashback Management always sends.
 *
 * Throws BadRequestException when the preferred field is present but invalid.
 */
export function resolveProductTypeUpdate(fields: {
  product_types?: unknown;
  product_type?: unknown;
}): Array<Record<string, unknown>> | undefined {
  if (fields.product_types !== undefined && fields.product_types !== null) {
    return requireProductTypeRowsField(fields.product_types, 'product_types');
  }
  if (fields.product_type !== undefined && fields.product_type !== null) {
    return requireProductTypeRowsField(fields.product_type, 'product_type');
  }
  return undefined;
}
