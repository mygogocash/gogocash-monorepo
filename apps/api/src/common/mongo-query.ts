import { BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';

import { escapeRegexLiteral } from './escape-regex';

/** Validate and coerce a user-supplied id before it reaches a Mongo query. */
export function requireObjectId(id: string, label = 'id'): Types.ObjectId {
  if (!Types.ObjectId.isValid(id)) {
    throw new BadRequestException(`Invalid ${label}`);
  }
  return new Types.ObjectId(id);
}

export function mongoCaseInsensitiveRegex(value: string): {
  $regex: string;
  $options: 'i';
} {
  return { $regex: escapeRegexLiteral(value.trim()), $options: 'i' };
}

export function requireOneOf<T extends string>(
  value: string,
  allowed: readonly T[],
  label: string,
): T {
  if (!allowed.includes(value as T)) {
    throw new BadRequestException(`Invalid ${label}`);
  }
  return value as T;
}

/** Strip leading/trailing hyphens without overlapping-alternation ReDoS patterns. */
export function normalizeSlugSegment(value: string, maxLength = 120): string {
  const trimmed = value.trim().toLowerCase().slice(0, maxLength);
  const collapsed = trimmed.replace(/[^a-z0-9]+/g, '-');
  return collapsed.replace(/^-+/, '').replace(/-+$/, '');
}

/** Escape a string for safe embedding inside a single-quoted JavaScript literal. */
export function escapeJsStringLiteral(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}
