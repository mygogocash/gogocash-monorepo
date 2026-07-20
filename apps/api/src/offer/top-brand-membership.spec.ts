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

  it('mirrorTopBrandExtraStoreFlags > given members > then sets flags both ways', async () => {
    const exec = jest.fn().mockResolvedValue({});
    const updateMany = jest.fn().mockReturnValue({ exec });
    await mirrorTopBrandExtraStoreFlags({ updateMany }, ['a', 'b']);
    expect(updateMany).toHaveBeenNthCalledWith(
      1,
      { _id: { $in: ['a', 'b'] } },
      { $set: { extra_store: true } },
    );
    expect(updateMany).toHaveBeenNthCalledWith(
      2,
      { extra_store: true, _id: { $nin: ['a', 'b'] } },
      { $set: { extra_store: false } },
    );
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
