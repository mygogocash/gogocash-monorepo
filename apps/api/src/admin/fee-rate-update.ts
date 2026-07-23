import { BadRequestException } from '@nestjs/common';
import { requireFiniteNumber } from 'src/common/mongo-query';
import type {
  FeeWithdrawRegionDto,
  UpdateFeeRateDto,
} from './dto/update-admin.dto';

function normalizeCurrency(value: string, label: string): string {
  const normalized = value.trim().toUpperCase();
  if (!/^[A-Z]{3,8}$/.test(normalized)) {
    throw new BadRequestException(
      `${label} must be a 3-8 letter currency code`,
    );
  }
  return normalized;
}

function normalizeRegion(region: FeeWithdrawRegionDto) {
  const countryCode = region.countryCode.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(countryCode)) {
    throw new BadRequestException('country code must use two letters');
  }
  const currency = normalizeCurrency(region.currency, 'currency');
  const mode = region.max_cap_mode === 'fixed' ? 'fixed' : 'percent';
  const percent = requireFiniteNumber(
    region.max_cap_percent ?? 0,
    'regional max cap percent',
  );
  if (percent < 0 || percent > 100) {
    throw new BadRequestException(
      'regional max cap percent must be between 0 and 100',
    );
  }
  const amount = requireFiniteNumber(
    region.max_cap_amount ?? 0,
    'regional max cap amount',
  );
  if (amount < 0) {
    throw new BadRequestException(
      'regional max cap amount must be zero or greater',
    );
  }
  const feeWithdraw = requireFiniteNumber(
    region.feeWithdraw,
    'regional withdrawal fee',
  );
  const minimumWithdraw = requireFiniteNumber(
    region.minimumWithdraw,
    'regional minimum withdrawal',
  );
  if (feeWithdraw < 0 || minimumWithdraw < 0) {
    throw new BadRequestException(
      'regional withdrawal values must be zero or greater',
    );
  }
  return {
    id: region.id.trim(),
    countryCode,
    currency,
    feeWithdraw,
    minimumWithdraw,
    max_cap_mode: mode,
    max_cap_percent: percent,
    max_cap_amount: amount,
    max_cap_currency: normalizeCurrency(
      region.max_cap_currency ?? currency,
      'regional max cap currency',
    ),
  };
}

export function buildFeeRateUpdate(
  dto: UpdateFeeRateDto,
): Record<string, unknown> {
  const fields: Record<string, unknown> = {};
  const numericEntries: Array<[keyof UpdateFeeRateDto, string]> = [
    ['system', 'system fee'],
    ['store', 'store fee'],
    ['minimum_withdraw', 'minimum withdraw'],
    ['minimum_withdraw_thb', 'minimum withdraw thb'],
    ['minimum_withdraw_usd', 'minimum withdraw usd'],
    ['fee_withdraw_thb', 'fee withdraw thb'],
    ['fee_withdraw_usd', 'fee withdraw usd'],
    ['global_max_cap_percent', 'global max cap percent'],
    ['global_max_cap_amount', 'global max cap amount'],
    ['global_withdraw_fee', 'global withdrawal fee'],
    ['global_minimum_withdraw', 'global minimum withdrawal'],
    ['referral_bonus_percent', 'referral bonus percent'],
  ];
  for (const [key, label] of numericEntries) {
    const value = dto[key];
    if (value === undefined || value === null) continue;
    const normalized = requireFiniteNumber(value, label);
    if (normalized < 0) {
      throw new BadRequestException(`${label} must be zero or greater`);
    }
    if (
      (key === 'system' ||
        key === 'global_max_cap_percent' ||
        key === 'referral_bonus_percent') &&
      normalized > 100
    ) {
      throw new BadRequestException(`${label} must be between 0 and 100`);
    }
    fields[key] = normalized;
  }

  if (dto.global_max_cap_mode !== undefined) {
    fields.global_max_cap_mode =
      dto.global_max_cap_mode === 'fixed' ? 'fixed' : 'percent';
  }
  if (dto.global_max_cap_currency !== undefined) {
    fields.global_max_cap_currency = normalizeCurrency(
      dto.global_max_cap_currency,
      'global max cap currency',
    );
  }
  if (dto.global_withdraw_currency !== undefined) {
    fields.global_withdraw_currency = normalizeCurrency(
      dto.global_withdraw_currency,
      'global withdrawal currency',
    );
  }

  if (dto.withdraw_regions !== undefined) {
    const normalizedRegions = dto.withdraw_regions.map(normalizeRegion);
    const uniqueMarkets = new Set<string>();
    for (const region of normalizedRegions) {
      const key = `${region.countryCode}|${region.currency}`;
      if (uniqueMarkets.has(key)) {
        throw new BadRequestException(`duplicate fee region ${key}`);
      }
      uniqueMarkets.add(key);
    }
    fields.withdraw_regions = normalizedRegions;

    const thb = normalizedRegions.find(
      (region) => region.currency === 'THB' || region.countryCode === 'TH',
    );
    const usd = normalizedRegions.find(
      (region) => region.currency === 'USD' || region.countryCode === 'US',
    );
    if (thb) {
      fields.fee_withdraw_thb ??= thb.feeWithdraw;
      fields.minimum_withdraw_thb ??= thb.minimumWithdraw;
    }
    if (usd) {
      fields.fee_withdraw_usd ??= usd.feeWithdraw;
      fields.minimum_withdraw_usd ??= usd.minimumWithdraw;
    }
  }

  return fields;
}
