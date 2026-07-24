import {
  INVOLVE_SHOP_COLLECTION,
  INVOLVE_SHOP_MARKETPLACE,
  INVOLVE_SHOP_SOURCE,
  INVOLVE_SHOP_TYPES,
  InvolveShopSchema,
} from './involve-shop.schema';

describe('InvolveShopSchema', () => {
  it('uses the dedicated involve_shops collection with source/marketplace defaults', () => {
    expect(INVOLVE_SHOP_COLLECTION).toBe('involve_shops');
    expect(INVOLVE_SHOP_SOURCE).toBe('involve_shopeextra');
    expect(INVOLVE_SHOP_MARKETPLACE).toBe('shopee');
    expect(INVOLVE_SHOP_TYPES).toEqual(['mall', 'preferred']);
    expect(InvolveShopSchema.path('source').options.default).toBe(
      INVOLVE_SHOP_SOURCE,
    );
    expect(InvolveShopSchema.path('marketplace').options.default).toBe(
      INVOLVE_SHOP_MARKETPLACE,
    );
  });

  it('requires the sync/serving-critical fields and defaults active=true', () => {
    for (const field of [
      'shopId',
      'shopName',
      'shopLink',
      'country',
      'cashbackRate',
      'trackingLink',
    ]) {
      expect(InvolveShopSchema.path(field)?.options.required).toBe(true);
    }
    expect(InvolveShopSchema.path('active').options.default).toBe(true);
    expect(InvolveShopSchema.path('shopType').options.enum).toEqual(
      INVOLVE_SHOP_TYPES,
    );
    // Nullable resolved offer + category (REQ-DM-3 / REQ-DM-4).
    expect(InvolveShopSchema.path('offerId').options.default).toBeNull();
    expect(InvolveShopSchema.path('categoryKey').options.default).toBeNull();
    expect(InvolveShopSchema.path('shopBanner').options.default).toEqual([]);
  });

  it('declares the dedupe-unique and serving indexes (REQ-DM-5)', () => {
    const indexes = InvolveShopSchema.indexes();
    expect(indexes).toContainEqual([
      { source: 1, shopId: 1 },
      expect.objectContaining({ unique: true }),
    ]);
    expect(indexes).toContainEqual([
      { marketplace: 1, country: 1, active: 1 },
      expect.anything(),
    ]);
    expect(indexes).toContainEqual([
      { cashbackRate: -1 },
      expect.anything(),
    ]);
    expect(indexes).toContainEqual([
      { shopName: 'text' },
      expect.anything(),
    ]);
  });
});
