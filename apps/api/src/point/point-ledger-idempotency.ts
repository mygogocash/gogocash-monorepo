import { ConflictException } from '@nestjs/common';

export const POINT_IDEMPOTENCY_KEY_CONFLICT = 'POINT_IDEMPOTENCY_KEY_CONFLICT';

export type PointLedgerEffect = {
  user_id: unknown;
  referral_id?: unknown;
  conversion_id?: number | string | null;
  point: number | string;
  type: string;
  action: string;
  idempotency_key: string;
};

function identity(value: unknown): string {
  return value === undefined || value === null ? '' : String(value);
}

function optionalNumber(value: unknown): number | null {
  return value === undefined || value === null || value === ''
    ? null
    : Number(value);
}

/** Fail closed when a retry reuses one ledger key for a different effect. */
export function assertSamePointLedgerEffect<T>(
  existing: T,
  expected: PointLedgerEffect,
): T {
  const stored = existing as T & Partial<PointLedgerEffect>;
  const matches =
    identity(stored.user_id) === identity(expected.user_id) &&
    identity(stored.referral_id) === identity(expected.referral_id) &&
    optionalNumber(stored.conversion_id) ===
      optionalNumber(expected.conversion_id) &&
    Number(stored.point) === Number(expected.point) &&
    stored.type === expected.type &&
    stored.action === expected.action &&
    stored.idempotency_key === expected.idempotency_key;
  if (!matches) {
    throw new ConflictException({
      code: POINT_IDEMPOTENCY_KEY_CONFLICT,
      message:
        'This point idempotency key is already bound to a different ledger effect.',
    });
  }
  return existing;
}
