import {
  MAX_TOP_BRANDS,
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
});
