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
});
