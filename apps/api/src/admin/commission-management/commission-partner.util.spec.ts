import {
  bestPercentFromPartnerRates,
  buildSuggestedAppDeeplink,
  formatPartnerRateLabels,
} from './commission-partner.util';

describe('commission-partner.util', () => {
  it('bestPercentFromPartnerRates > given Involve-style commission rows > returns highest percent', () => {
    const commissions = [
      { Commission: '3.5%' },
      { Commission: '8.25%' },
      { 'New users': '5%' },
    ];
    expect(bestPercentFromPartnerRates(commissions)).toBe(8.25);
  });

  it('formatPartnerRateLabels > given mixed rows > flattens to display strings', () => {
    expect(
      formatPartnerRateLabels([{ Commission: '3.5%' }, 'Flat 10 THB']),
    ).toEqual(['3.5%', 'Flat 10 THB']);
  });

  it('buildSuggestedAppDeeplink > given offer context > builds gogocash open URL with rate', () => {
    const url = buildSuggestedAppDeeplink({
      offerId: 'abc123',
      lookupValue: 'shopee-th',
      currency: 'THB',
      commissions: [{ Commission: '7%' }],
      commissionStore: 5,
      affiliateNetworkId: 'involve_asia',
      bestRatePercent: 7,
    });
    expect(url).toContain('https://gogocash.app/open/offer/shopee-th');
    expect(url).toContain('bestRate=7');
    expect(url).toContain('affNetwork=involve_asia');
  });

  // #517/#518 — the admin and API generators diverged: the admin one emitted a
  // `store=` param for the selected advertiser line, the API one had no store
  // parameter at all. Shipping either side alone bakes the divergence into
  // offer.app_deeplink, so both now build the identical URL.
  //
  // `global` is the sentinel for "no specific advertiser line" and is omitted,
  // matching apps/admin/src/lib/offerDeeplink.ts.
  it('buildSuggestedAppDeeplink > given a deeplink store id > appends store=', () => {
    const url = buildSuggestedAppDeeplink({
      offerId: 'abc123',
      lookupValue: 'shopee-th',
      currency: 'THB',
      commissions: [{ Commission: '7%' }],
      commissionStore: 5,
      affiliateNetworkId: 'involve_asia',
      bestRatePercent: 7,
      deeplinkStoreId: 'shopee_cps_new',
    });
    expect(url).toContain('store=shopee_cps_new');
  });

  it('buildSuggestedAppDeeplink > given the global sentinel > omits store=', () => {
    const url = buildSuggestedAppDeeplink({
      offerId: 'abc123',
      lookupValue: 'shopee-th',
      currency: 'THB',
      commissions: [],
      affiliateNetworkId: 'involve_asia',
      bestRatePercent: 7,
      deeplinkStoreId: 'global',
    });
    expect(url).not.toContain('store=');
  });

  it('buildSuggestedAppDeeplink > given no store id > omits store= (unchanged)', () => {
    const url = buildSuggestedAppDeeplink({
      offerId: 'abc123',
      lookupValue: 'shopee-th',
      currency: 'THB',
      commissions: [],
      affiliateNetworkId: 'involve_asia',
      bestRatePercent: 7,
    });
    expect(url).not.toContain('store=');
  });
});
