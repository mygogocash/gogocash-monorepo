import { LegacyRewardManifestSchema } from './legacy-reward-manifest.schema';

describe('LegacyRewardManifestSchema', () => {
  it('requires the immutable quest payout configuration checksum', () => {
    expect(
      LegacyRewardManifestSchema.path('quest_config_checksum').isRequired,
    ).toBe(true);
  });

  it('enforces one immutable manifest identity per quest and reward type', () => {
    expect(LegacyRewardManifestSchema.indexes()).toEqual(
      expect.arrayContaining([
        [
          { manifest_key: 1 },
          { unique: true, name: 'uniq_legacy_reward_manifest_key' },
        ],
        [
          { quest_id: 1, reward_type: 1 },
          {
            unique: true,
            name: 'uniq_legacy_reward_manifest_quest_type',
          },
        ],
      ]),
    );
  });
});
