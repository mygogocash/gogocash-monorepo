import { Types } from 'mongoose';

import { buildDraftProductFromOffer } from './catalog-backfill';

describe('catalog offer backfill', () => {
  it('builds draft-only products from legacy offers', () => {
    const product = buildDraftProductFromOffer({
      _id: new Types.ObjectId('64b7f5f6f1f1f1f1f1f1f1f2'),
      brand_id: '64b7f5f6f1f1f1f1f1f1f1f1',
      offer_id: 'klook-th',
      offer_name_display: 'Klook Thailand',
      logo_desktop: 'https://cdn.gogocash.co/klook.png',
    });

    expect(product).toMatchObject({
      title: 'Klook Thailand',
      slug: 'klook-thailand',
      default_sku: 'KLOOK-TH',
      price_amount: 0,
      inventory_quantity: 0,
      status: 'draft',
    });
  });

  it('skips unsafe records without a brand link or title', () => {
    expect(
      buildDraftProductFromOffer({ offer_name_display: 'No brand' }),
    ).toBeNull();
    expect(
      buildDraftProductFromOffer({ brand_id: '64b7f5f6f1f1f1f1f1f1f1f1' }),
    ).toBeNull();
  });
});
