import { ExploreService } from './explore.service';

function chainModel(rows: unknown[], total: number) {
  const chain = {
    select: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    lean: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue(rows),
  };
  return {
    find: jest.fn().mockReturnValue(chain),
    countDocuments: jest.fn().mockResolvedValue(total),
    __chain: chain,
  };
}

const NOW = new Date('2026-07-24T00:00:00Z');

describe('ExploreService.listShops', () => {
  it('applies the active-window + country + default paging and cashback sort', async () => {
    const shopModel = chainModel([{ shopId: 1 }, { shopId: 2 }], 42);
    const campaignModel = chainModel([], 0);
    const service = new ExploreService(
      shopModel as never,
      campaignModel as never,
    );

    const res = await service.listShops({}, NOW);

    const filter = shopModel.find.mock.calls[0][0];
    expect(filter.source).toBe('involve_shopeextra');
    expect(filter.marketplace).toBe('shopee');
    expect(filter.active).toBe(true);
    // Default country Thailand (case-insensitive exact).
    expect(String(filter.country)).toContain('Thailand');
    // Active-window $or includes now-cutoff.
    expect(filter.$or).toEqual(
      expect.arrayContaining([{ periodEnd: { $gte: NOW } }]),
    );
    // Default sort = highest cashback.
    expect(shopModel.__chain.sort).toHaveBeenCalledWith({ cashbackRate: -1 });
    expect(shopModel.__chain.skip).toHaveBeenCalledWith(0);
    expect(shopModel.__chain.limit).toHaveBeenCalledWith(20);
    expect(res).toMatchObject({ page: 1, limit: 20, total: 42, totalPages: 3 });
    expect(res.data).toHaveLength(2);
  });

  it('adds shopType / cashbackMin / search filters and honors sort=latest + paging', async () => {
    const shopModel = chainModel([], 0);
    const service = new ExploreService(
      shopModel as never,
      chainModel([], 0) as never,
    );

    await service.listShops(
      {
        shopType: 'mall',
        cashbackMin: 0.02,
        search: 'alpha',
        sort: 'latest',
        page: 2,
        limit: 10,
      },
      NOW,
    );

    const filter = shopModel.find.mock.calls[0][0];
    expect(filter.shopType).toBe('mall');
    expect(filter.cashbackRate).toEqual({ $gte: 0.02 });
    expect(String(filter.shopName)).toContain('alpha');
    expect(shopModel.__chain.sort).toHaveBeenCalledWith({ syncedAt: -1 });
    expect(shopModel.__chain.skip).toHaveBeenCalledWith(10); // (page2-1)*limit10
    expect(shopModel.__chain.limit).toHaveBeenCalledWith(10);
  });

  it('escapes regex metacharacters in search', async () => {
    const shopModel = chainModel([], 0);
    const service = new ExploreService(
      shopModel as never,
      chainModel([], 0) as never,
    );

    await service.listShops({ search: 'a.*b' }, NOW);

    const filter = shopModel.find.mock.calls[0][0];
    // The '.*' must be escaped, not treated as a wildcard.
    expect((filter.shopName as RegExp).source).toContain('a\\.\\*b');
  });

  // #503 — scope the rail to a single platform brand's shops.
  it('filters by platformOfferId (offerId) when given', async () => {
    const shopModel = chainModel([], 0);
    const service = new ExploreService(
      shopModel as never,
      chainModel([], 0) as never,
    );
    const platformId = '6a49f3e6ce2e0da81d6dc375';

    await service.listShops({ platformOfferId: platformId }, NOW);

    const filter = shopModel.find.mock.calls[0][0];
    expect(String(filter.offerId)).toBe(platformId);
  });

  it('omits the offerId filter when no platformOfferId is given', async () => {
    const shopModel = chainModel([], 0);
    const service = new ExploreService(
      shopModel as never,
      chainModel([], 0) as never,
    );

    await service.listShops({}, NOW);

    expect(shopModel.find.mock.calls[0][0].offerId).toBeUndefined();
  });
});

describe('ExploreService.listDeals', () => {
  it('filters active campaigns by category with the date window', async () => {
    const campaignModel = chainModel([{ campaignBannerId: 5 }], 1);
    const service = new ExploreService(
      chainModel([], 0) as never,
      campaignModel as never,
    );

    const res = await service.listDeals({ category: 'fashion' }, NOW);

    const filter = campaignModel.find.mock.calls[0][0];
    expect(filter.source).toBe('involve_campaigns');
    expect(filter.categoryKey).toBe('fashion');
    expect(filter.$or).toEqual(
      expect.arrayContaining([{ dateEnd: { $gte: NOW } }]),
    );
    expect(res).toMatchObject({ page: 1, limit: 20, total: 1, totalPages: 1 });
  });
});
