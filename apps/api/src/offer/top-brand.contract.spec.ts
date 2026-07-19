import {
  MAX_TOP_BRANDS,
  normalizeTopBrandEntries,
  resolveDeviceBrandEntries,
  resolveOfferCashbackLabel,
} from './top-brand.contract';

describe('top brand contract', () => {
  it('caps the curated homepage rail at sixteen entries', () => {
    expect(MAX_TOP_BRANDS).toBe(16);
  });

  it('prefers the current customer-facing offer commission over legacy saved copy', () => {
    expect(
      resolveOfferCashbackLabel({
        commission_store: 5.6,
        commissions: [{ Commission: '20%' }],
      }),
    ).toBe('5.6%');
  });

  it('falls back to the best partner rate minus the default platform fee', () => {
    expect(
      resolveOfferCashbackLabel({
        commission_store: 0,
        commissions: [{ Commission: '8%' }, { Commission: '10%' }],
      }),
    ).toBe('7%');
  });

  it('#378 normalizeTopBrandEntries > drops empties/dupes and caps at MAX_TOP_BRANDS', () => {
    const ids = Array.from({ length: 20 }, (_, i) => ({
      offerId: `o${i}`,
      cashback: 'forged',
    }));
    expect(
      normalizeTopBrandEntries([
        { offerId: ' a ', cashback: 'x' },
        { offerId: 'a', cashback: 'y' },
        { offerId: '', cashback: 'z' },
        ...ids,
      ]),
    ).toEqual(
      [{ offerId: 'a', cashback: '' }].concat(
        ids.slice(0, 15).map((entry) => ({
          offerId: entry.offerId,
          cashback: '',
        })),
      ),
    );
  });

  it('#378 resolveDeviceBrandEntries > given only legacy brands > both devices use it', () => {
    const config = {
      brands: [{ offerId: 'legacy-1' }, { offerId: 'legacy-2' }],
    };
    expect(resolveDeviceBrandEntries(config, 'desktop')).toEqual([
      { offerId: 'legacy-1', cashback: '' },
      { offerId: 'legacy-2', cashback: '' },
    ]);
    expect(resolveDeviceBrandEntries(config, 'mobile')).toEqual([
      { offerId: 'legacy-1', cashback: '' },
      { offerId: 'legacy-2', cashback: '' },
    ]);
  });

  it('#378 resolveDeviceBrandEntries > given device lists > returns independent orders', () => {
    const config = {
      brands: [{ offerId: 'legacy' }],
      brandsDesktop: [{ offerId: 'd1' }, { offerId: 'd2' }],
      brandsMobile: [{ offerId: 'm1' }],
    };
    expect(
      resolveDeviceBrandEntries(config, 'desktop').map((e) => e.offerId),
    ).toEqual(['d1', 'd2']);
    expect(
      resolveDeviceBrandEntries(config, 'mobile').map((e) => e.offerId),
    ).toEqual(['m1']);
  });

  it('#378 resolveDeviceBrandEntries > given empty device list > does not fall back to legacy brands', () => {
    const config = {
      brands: [{ offerId: 'legacy' }],
      brandsDesktop: [],
      brandsMobile: [{ offerId: 'm1' }],
    };
    expect(resolveDeviceBrandEntries(config, 'desktop')).toEqual([]);
    expect(resolveDeviceBrandEntries(config, 'mobile')).toEqual([
      { offerId: 'm1', cashback: '' },
    ]);
  });
});
