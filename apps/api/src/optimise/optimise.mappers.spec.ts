import {
  appendOptimiseUid,
  mapOptimiseCampaignStatus,
  mapOptimiseCampaignToOffer,
} from './optimise.mappers';

describe('mapOptimiseCampaignStatus', () => {
  // Dead campaigns are rejected outright; everything else — including `live` —
  // lands in the admin Pending tab. Per offer.schema.ts, Optimise sync writes
  // pending_review on newly-seen offers: being live upstream means the campaign
  // is *available*, not that GoGoCash has agreed to surface it to customers.
  it('maps live to pending_review, not straight to approved', () => {
    expect(mapOptimiseCampaignStatus('live')).toBe('pending_review');
  });

  it('maps closed and rejected to rejected', () => {
    expect(mapOptimiseCampaignStatus('closed')).toBe('rejected');
    expect(mapOptimiseCampaignStatus('rejected')).toBe('rejected');
  });

  it('maps waiting/pending/unknown to pending_review', () => {
    expect(mapOptimiseCampaignStatus('waiting')).toBe('pending_review');
    expect(mapOptimiseCampaignStatus('pending')).toBe('pending_review');
    expect(mapOptimiseCampaignStatus(undefined)).toBe('pending_review');
    expect(mapOptimiseCampaignStatus('anything-else')).toBe('pending_review');
  });
});

describe('appendOptimiseUid', () => {
  it('appends uid as the first query param when the url has none', () => {
    expect(
      appendOptimiseUid('https://track.optimise.example/c/1001', 'user-123'),
    ).toBe('https://track.optimise.example/c/1001?uid=user-123');
  });

  it('appends uid with & when the url already has a query string', () => {
    expect(
      appendOptimiseUid('https://track.optimise.example/c/1001?a=1', 'u2'),
    ).toBe('https://track.optimise.example/c/1001?a=1&uid=u2');
  });

  it('url-encodes the user id', () => {
    expect(appendOptimiseUid('https://x.example/', 'a b/c')).toBe(
      'https://x.example/?uid=a%20b%2Fc',
    );
  });

  it('returns an empty string unchanged (nothing to append to)', () => {
    expect(appendOptimiseUid('', 'user-123')).toBe('');
  });
});

describe('mapOptimiseCampaignToOffer', () => {
  const campaign = {
    productId: 1001,
    campaignId: 5001,
    name: 'Acme Store',
    description: 'Acme description',
    status: 'live',
    currencyCode: 'THB',
    payout: { currency: 'THB', type: 'CPS 5%' },
    commission: { value: '5', type: 'percentage' },
    advertiserId: '778',
    advertiserName: 'Acme',
    baseTrackingUrl: 'https://track.optimise.example/c/1001',
    landingPage: { websiteUrl: 'https://acme.example' },
    markets: [
      { id: 764, name: 'Thailand', primary: true },
      { id: 702, name: 'Singapore', primary: false },
    ],
    campaignLogo: { guid: 'g', location: 'https://cdn.example/acme.png' },
    cookieDuration: 30,
    validationWindow: 60,
    deepLinkEnabled: true,
  };

  it('maps every core field from an Optimise publisher campaign', () => {
    expect(mapOptimiseCampaignToOffer(campaign)).toEqual({
      offer_id: 1001,
      merchant_id: 778,
      offer_name: 'Acme Store',
      description: 'Acme description',
      currency: 'THB',
      preview_url: 'https://acme.example',
      tracking_link: 'https://track.optimise.example/c/1001',
      countries: 'Thailand, Singapore',
      commissions: [{ payout: 'CPS 5%' }, { commission: '5' }],
      commission_tracking: 'percentage',
      status: 'pending_review',
      logo: 'https://cdn.example/acme.png',
      logo_desktop: 'https://cdn.example/acme.png',
      tracking_days: 30,
      validation_terms: 60,
    });
  });

  it('falls back merchant_id to productId when advertiserId is not numeric', () => {
    const result = mapOptimiseCampaignToOffer({
      ...campaign,
      advertiserId: 'not-a-number',
    });
    expect(result.merchant_id).toBe(1001);
  });

  it('omits optional fields that are absent rather than writing blanks', () => {
    const result = mapOptimiseCampaignToOffer({
      productId: 42,
      name: 'Bare',
      status: 'waiting',
    });
    // Required fields always present:
    expect(result.offer_id).toBe(42);
    expect(result.merchant_id).toBe(42);
    expect(result.offer_name).toBe('Bare');
    expect(result.status).toBe('pending_review');
    // Absent optionals are not keys on the patch (no undefined/'' overwrites):
    expect(result).not.toHaveProperty('preview_url');
    expect(result).not.toHaveProperty('logo');
    expect(result).not.toHaveProperty('tracking_link');
    expect(result).not.toHaveProperty('commissions');
  });
});
