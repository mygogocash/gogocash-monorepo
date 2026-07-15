import { Types } from 'mongoose';

export function coerceOptionalPolicyCategoryId(
  value: unknown,
): string | undefined {
  if (typeof value !== 'string' || value.trim() === 'undefined') {
    return undefined;
  }
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (trimmed === 'custom') return trimmed;
  return Types.ObjectId.isValid(trimmed) ? trimmed : '';
}
