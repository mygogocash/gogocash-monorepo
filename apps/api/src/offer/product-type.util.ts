/**
 * Parse multipart / JSON product-type rows into an array for Offer.product_type.
 * Accepts an already-parsed array or a JSON string (admin FormData).
 * Returns undefined when the field was not provided (partial updates must not wipe).
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
 * Resolve product-type rows from either admin key (`product_types`) or the
 * persisted schema key (`product_type`). Prefer plural when both are present —
 * that is what Cashback Management always sends.
 */
export function resolveProductTypeUpdate(fields: {
  product_types?: unknown;
  product_type?: unknown;
}): Array<Record<string, unknown>> | undefined {
  if (fields.product_types !== undefined && fields.product_types !== null) {
    // Explicit empty JSON array clears rows; unparseable string is ignored.
    return parseProductTypeRowsField(fields.product_types);
  }
  return parseProductTypeRowsField(fields.product_type);
}
