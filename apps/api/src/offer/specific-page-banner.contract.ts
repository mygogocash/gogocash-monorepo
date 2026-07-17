import { BadRequestException } from '@nestjs/common';

/** Stable CMS identities; intentionally decoupled from customer route paths. */
export const SPECIFIC_PAGE_BANNER_TARGETS = [
  'all-brands',
  'all-shops',
  'product-discovery',
] as const;

export type SpecificPageBannerTarget =
  (typeof SPECIFIC_PAGE_BANNER_TARGETS)[number];

export function requireSpecificPageBannerTarget(
  value: string,
): SpecificPageBannerTarget {
  if (
    !SPECIFIC_PAGE_BANNER_TARGETS.includes(value as SpecificPageBannerTarget)
  ) {
    throw new BadRequestException(
      `Unknown specific page banner target: ${value}`,
    );
  }
  return value as SpecificPageBannerTarget;
}
