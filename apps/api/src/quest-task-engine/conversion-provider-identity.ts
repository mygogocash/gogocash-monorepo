import { BadRequestException } from '@nestjs/common';

export type CanonicalConversionAddress = {
  source: string;
  provider_account: string;
  provider_conversion_id: string;
};

export function canonicalConversionAddress(
  conversion: Record<string, unknown>,
): CanonicalConversionAddress {
  const rawId = conversion.provider_conversion_id ?? conversion.conversion_id;
  if (rawId === undefined || rawId === null || String(rawId).trim() === '') {
    throw new BadRequestException('Conversion provider identity is missing.');
  }
  return {
    source: String(conversion.source ?? 'involve')
      .trim()
      .toLowerCase(),
    provider_account: String(
      conversion.provider_account ?? conversion.network_account ?? 'default',
    ).trim(),
    provider_conversion_id: String(rawId).trim(),
  };
}

export function canonicalConversionIdentity(
  conversion: Record<string, unknown>,
): string {
  const address = canonicalConversionAddress(conversion);
  return [
    address.source,
    address.provider_account,
    address.provider_conversion_id,
  ]
    .map((part) => encodeURIComponent(part))
    .join(':');
}
