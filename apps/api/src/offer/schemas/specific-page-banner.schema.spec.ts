import {
  SPECIFIC_PAGE_BANNER_COLLECTION,
  SPECIFIC_PAGE_BANNER_TARGETS,
  SpecificPageBannerSchema,
} from './specific-page-banner.schema';
import { BannerSchema } from './banner.schema';

describe('SpecificPageBannerSchema', () => {
  it('uses a dedicated collection and a required unique target key', () => {
    expect(SPECIFIC_PAGE_BANNER_COLLECTION).toBe('specific_page_banners');
    expect(SPECIFIC_PAGE_BANNER_TARGETS).toEqual([
      'all-brands',
      'all-shops',
      'product-discovery',
    ]);

    const target = SpecificPageBannerSchema.path('target');
    expect(target?.options.required).toBe(true);
    expect(target?.options.enum).toEqual(SPECIFIC_PAGE_BANNER_TARGETS);
    expect(SpecificPageBannerSchema.indexes()).toContainEqual([
      { target: 1 },
      { unique: true },
    ]);
  });

  it('does not add target to the legacy home BannerSchema', () => {
    expect(BannerSchema.path('target')).toBeUndefined();
  });
});
