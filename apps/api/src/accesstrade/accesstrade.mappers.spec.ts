import {
  mapAccesstradeCampaignStatus,
  mapAccesstradeCampaignToOffer,
} from './accesstrade.mappers';

describe('mapAccesstradeCampaignStatus', () => {
  // Synced Accesstrade campaigns are UNAFFILIATED — they cannot earn until an
  // admin affiliates them, so none go straight to 'approved'. Running campaigns
  // wait in the Pending tab; paused/terminated are dead.
  it('maps RUNNING to pending_review (affiliation still required)', () => {
    expect(mapAccesstradeCampaignStatus('RUNNING')).toBe('pending_review');
  });

  it('maps paused/terminated/wont_run to rejected', () => {
    expect(mapAccesstradeCampaignStatus('PAUSED')).toBe('rejected');
    expect(mapAccesstradeCampaignStatus('TERMINATED')).toBe('rejected');
    expect(mapAccesstradeCampaignStatus('WONT_RUN')).toBe('rejected');
  });

  it('defaults unknown/absent to pending_review', () => {
    expect(mapAccesstradeCampaignStatus(undefined)).toBe('pending_review');
    expect(mapAccesstradeCampaignStatus('NEW')).toBe('pending_review');
  });
});

describe('mapAccesstradeCampaignToOffer', () => {
  const item = {
    id: 42,
    name: 'Shopee TH',
    imageUrl: 'https://cdn.at/shopee.png',
    url: 'https://at.example/run_tracking.php?mcn={campaign}',
    status: 'RUNNING',
    categories: [
      { id: 1, name: 'Marketplace' },
      { id: 2, name: 'Electronics' },
    ],
    defaultRewards: [
      { type: 'CPA_SALES', reward: '5%' },
      { type: 'CPC', reward: '2 THB' },
    ],
    currency: 'THB',
  };

  it('maps an unaffiliated Accesstrade campaign item', () => {
    expect(mapAccesstradeCampaignToOffer(item)).toEqual({
      offer_id: 42,
      merchant_id: 42,
      offer_name: 'Shopee TH',
      logo: 'https://cdn.at/shopee.png',
      logo_desktop: 'https://cdn.at/shopee.png',
      preview_url: 'https://at.example/run_tracking.php?mcn={campaign}',
      tracking_link: 'https://at.example/run_tracking.php?mcn={campaign}',
      categories: 'Marketplace, Electronics',
      commissions: [{ CPA_SALES: '5%' }, { CPC: '2 THB' }],
      commission_tracking: 'CPA_SALES',
      currency: 'THB',
      status: 'pending_review',
    });
  });

  it('always sets the three required fields and omits absent optionals', () => {
    const result = mapAccesstradeCampaignToOffer({ id: 7, name: 'Bare' });
    expect(result.offer_id).toBe(7);
    expect(result.merchant_id).toBe(7);
    expect(result.offer_name).toBe('Bare');
    expect(result.status).toBe('pending_review');
    expect(result).not.toHaveProperty('commissions');
    expect(result).not.toHaveProperty('currency');
    expect(result).not.toHaveProperty('logo');
  });
});
