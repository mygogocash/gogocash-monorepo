import { BadRequestException } from '@nestjs/common';

import type {
  PolicyContentDto,
  UpsertPolicyDto,
} from './dto/upsert-policy.dto';
import { ALLOWED_POLICY_LOCALES } from './schemas/policy.schema';

const MAX_TRANSLATION_LENGTH = 50_000;
const POLICY_KEYS = new Set([
  'category_id',
  'banner',
  'terms',
  'clear_banner',
  'clear_terms',
]);
const CONTENT_KEYS = new Set([
  'primary_locale',
  'translations',
  'content_source',
  'template_id',
  'additional_terms',
]);
const allowedLocales = new Set<string>(ALLOWED_POLICY_LOCALES);

function record(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new BadRequestException(`${label} must be an object`);
  }
  return value as Record<string, unknown>;
}

function stringMap(value: unknown, label: string): Record<string, string> {
  const input = record(value, label);
  const output: Record<string, string> = {};
  for (const [key, item] of Object.entries(input)) {
    if (!allowedLocales.has(key) || typeof item !== 'string') {
      throw new BadRequestException(`${label} contains an unsupported locale`);
    }
    if (item.length > MAX_TRANSLATION_LENGTH) {
      throw new BadRequestException(
        `${label}.${key} exceeds ${MAX_TRANSLATION_LENGTH} characters`,
      );
    }
    if (item.trim()) output[key] = item;
  }
  return output;
}

function content(value: unknown, label: string): PolicyContentDto {
  const input = record(value, label);
  for (const key of Object.keys(input)) {
    if (!CONTENT_KEYS.has(key)) {
      throw new BadRequestException(
        `property ${label}.${key} should not exist`,
      );
    }
  }
  const primaryLocale = input.primary_locale;
  if (typeof primaryLocale !== 'string' || !allowedLocales.has(primaryLocale)) {
    throw new BadRequestException(
      `${label}.primary_locale must be one of: ${ALLOWED_POLICY_LOCALES.join(', ')}`,
    );
  }
  const translations = stringMap(input.translations, `${label}.translations`);
  if (Object.keys(translations).length === 0) {
    throw new BadRequestException(
      `${label} requires at least one non-empty translation`,
    );
  }
  const source = input.content_source;
  if (
    source !== undefined &&
    source !== 'template' &&
    source !== 'template_plus' &&
    source !== 'custom'
  ) {
    throw new BadRequestException(`${label}.content_source is invalid`);
  }
  if (input.template_id !== undefined && input.template_id !== null) {
    if (typeof input.template_id !== 'string') {
      throw new BadRequestException(`${label}.template_id must be a string`);
    }
  }
  const additional =
    input.additional_terms === undefined
      ? undefined
      : stringMap(input.additional_terms, `${label}.additional_terms`);
  return {
    primary_locale: primaryLocale,
    translations,
    content_source: source as PolicyContentDto['content_source'],
    template_id:
      typeof input.template_id === 'string' ? input.template_id : undefined,
    additional_terms: additional,
  };
}

export function parseAggregatePolicyJson(
  raw: string,
  categoryId: string,
): UpsertPolicyDto {
  let decoded: unknown;
  try {
    decoded = JSON.parse(raw);
  } catch {
    throw new BadRequestException('policy must contain valid JSON');
  }
  const input = record(decoded, 'policy');
  for (const key of Object.keys(input)) {
    if (!POLICY_KEYS.has(key)) {
      throw new BadRequestException(`property policy.${key} should not exist`);
    }
  }
  const dto: UpsertPolicyDto = { category_id: categoryId };
  if (input.banner !== undefined) dto.banner = content(input.banner, 'banner');
  if (input.terms !== undefined) dto.terms = content(input.terms, 'terms');
  if (input.clear_banner !== undefined) {
    if (typeof input.clear_banner !== 'boolean') {
      throw new BadRequestException('clear_banner must be a boolean');
    }
    dto.clear_banner = input.clear_banner;
  }
  if (input.clear_terms !== undefined) {
    if (typeof input.clear_terms !== 'boolean') {
      throw new BadRequestException('clear_terms must be a boolean');
    }
    dto.clear_terms = input.clear_terms;
  }
  return dto;
}

export function buildPolicyUpdate(
  dto: UpsertPolicyDto,
  options: { existingPolicy: boolean; requireBanner?: boolean },
) {
  if (dto.terms && dto.clear_terms) {
    throw new BadRequestException(
      'terms and clear_terms cannot be sent together',
    );
  }
  if (dto.banner && dto.clear_banner) {
    throw new BadRequestException(
      'banner and clear_banner cannot be sent together',
    );
  }
  if (!options.existingPolicy && (!dto.terms || dto.clear_terms)) {
    throw new BadRequestException(
      'Terms & conditions are required for a new policy.',
    );
  }
  if (options.requireBanner && (!dto.banner || dto.clear_banner)) {
    throw new BadRequestException(
      'Localized policy banner text is required for a new category.',
    );
  }
  const $set: Record<string, unknown> = {};
  if (dto.banner) $set.banner = dto.banner;
  if (dto.terms) $set.terms = dto.terms;
  const $unset: Record<string, 1> = {};
  if (dto.clear_banner) $unset.banner = 1;
  if (dto.clear_terms) $unset.terms = 1;
  return {
    $set,
    ...(Object.keys($unset).length ? { $unset } : {}),
  };
}
