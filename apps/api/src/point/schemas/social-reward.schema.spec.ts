import { SocialRewardSchema } from './social-reward.schema';

describe('SocialRewardSchema legacy payout identity', () => {
  it('keeps legacy unkeyed rows legal and rejects duplicate nonempty payout keys', () => {
    expect(SocialRewardSchema.indexes()).toEqual(
      expect.arrayContaining([
        [
          { legacy_payout_key: 1 },
          {
            name: 'uniq_social_reward_legacy_payout_key',
            unique: true,
            partialFilterExpression: {
              legacy_payout_key: { $type: 'string', $gt: '' },
            },
          },
        ],
      ]),
    );
  });
});
