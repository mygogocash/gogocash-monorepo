import {
  INVOLVE_CAMPAIGN_COLLECTION,
  INVOLVE_CAMPAIGN_SOURCE,
  InvolveCampaignSchema,
} from './involve-campaign.schema';

describe('InvolveCampaignSchema', () => {
  it('uses the dedicated involve_campaigns collection with a source default', () => {
    expect(INVOLVE_CAMPAIGN_COLLECTION).toBe('involve_campaigns');
    expect(INVOLVE_CAMPAIGN_SOURCE).toBe('involve_campaigns');
    expect(InvolveCampaignSchema.path('source').options.default).toBe(
      INVOLVE_CAMPAIGN_SOURCE,
    );
  });

  it('requires dedupe + attribution fields and defaults active=true', () => {
    expect(InvolveCampaignSchema.path('campaignBannerId').options.required).toBe(
      true,
    );
    expect(InvolveCampaignSchema.path('trackingLink').options.required).toBe(
      true,
    );
    expect(InvolveCampaignSchema.path('active').options.default).toBe(true);
    expect(InvolveCampaignSchema.path('withBanner').options.default).toBe(false);
    expect(InvolveCampaignSchema.path('offerId').options.default).toBeNull();
    expect(InvolveCampaignSchema.path('categoryKey').options.default).toBeNull();
  });

  it('declares the dedupe-unique and serving indexes', () => {
    const indexes = InvolveCampaignSchema.indexes();
    expect(indexes).toContainEqual([
      { source: 1, campaignBannerId: 1 },
      expect.objectContaining({ unique: true }),
    ]);
    expect(indexes).toContainEqual([
      { active: 1, dateEnd: 1 },
      expect.anything(),
    ]);
  });
});
