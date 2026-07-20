import {
  mirrorTopBrandExtraStoreFlags,
  syncOfferTopBrandMembership,
  topBrandMemberIds,
} from './top-brand-membership';

describe('top-brand-membership (#475)', () => {
  it('syncOfferTopBrandMembership > given enabled > then upserts into both device lists', async () => {
    const updateOne = jest.fn().mockResolvedValue({ acknowledged: true });
    const findOne = jest.fn().mockReturnValue({
      lean: () => ({
        exec: () =>
          Promise.resolve({
            brandsDesktop: [{ offerId: 'a', cashback: '' }],
            brandsMobile: [{ offerId: 'a', cashback: '' }],
          }),
      }),
    });
    await syncOfferTopBrandMembership(
      { updateOne, findOne } as never,
      'b',
      true,
    );
    expect(updateOne).toHaveBeenCalledWith(
      {},
      {
        $set: {
          brands: [
            { offerId: 'a', cashback: '' },
            { offerId: 'b', cashback: '' },
          ],
          brandsDesktop: [
            { offerId: 'a', cashback: '' },
            { offerId: 'b', cashback: '' },
          ],
          brandsMobile: [
            { offerId: 'a', cashback: '' },
            { offerId: 'b', cashback: '' },
          ],
        },
      },
      { upsert: true },
    );
  });

  it('syncOfferTopBrandMembership > given full list > then rejects enable instead of silent skip', async () => {
    const full = Array.from({ length: 16 }, (_, i) => ({
      offerId: `id-${i}`,
      cashback: '',
    }));
    const updateOne = jest.fn();
    const findOne = jest.fn().mockReturnValue({
      lean: () => ({
        exec: () =>
          Promise.resolve({
            brandsDesktop: full,
            brandsMobile: full,
          }),
      }),
    });
    await expect(
      syncOfferTopBrandMembership(
        { updateOne, findOne } as never,
        'new-offer',
        true,
      ),
    ).rejects.toThrow(/limited to 16/);
    expect(updateOne).not.toHaveBeenCalled();
  });

  it('syncOfferTopBrandMembership > given disabled > then pulls from all lists', async () => {
    const updateOne = jest.fn().mockResolvedValue({ acknowledged: true });
    await syncOfferTopBrandMembership(
      { updateOne, findOne: jest.fn() } as never,
      'b',
      false,
    );
    expect(updateOne).toHaveBeenCalledWith(
      {},
      {
        $pull: {
          brands: { offerId: 'b' },
          brandsDesktop: { offerId: 'b' },
          brandsMobile: { offerId: 'b' },
        },
      },
    );
  });

  it('mirrorTopBrandExtraStoreFlags > given members > then sets flags both ways with ObjectIds', async () => {
    const exec = jest.fn().mockResolvedValue({});
    const updateMany = jest.fn().mockReturnValue({ exec });
    const a = '507f1f77bcf86cd799439011';
    const b = '507f1f77bcf86cd799439012';
    await mirrorTopBrandExtraStoreFlags({ updateMany }, [a, b]);
    const firstFilter = updateMany.mock.calls[0][0] as {
      _id: { $in: { toHexString: () => string }[] };
    };
    expect(firstFilter._id.$in.map((id) => id.toHexString())).toEqual([a, b]);
    expect(updateMany.mock.calls[0][1]).toEqual({
      $set: { extra_store: true },
    });
    expect(updateMany.mock.calls[1][1]).toEqual({
      $set: { extra_store: false },
    });
  });

  it('topBrandMemberIds > unions desktop and mobile', () => {
    expect(
      topBrandMemberIds(
        [{ offerId: 'a' }, { offerId: 'b' }],
        [{ offerId: 'b' }, { offerId: 'c' }],
      ),
    ).toEqual(['a', 'b', 'c']);
  });
});
