import { LegacyRewardResolutionCommandSchema } from './legacy-reward-resolution-command.schema';

describe('LegacyRewardResolutionCommandSchema', () => {
  it('requires the plan, quest snapshot, config, and evidence checksums', () => {
    for (const path of [
      'plan_checksum',
      'quest_snapshot_checksum',
      'quest_config_checksum',
      'evidence_checksum',
      'expected_manifest_hashes',
    ]) {
      expect(LegacyRewardResolutionCommandSchema.path(path).isRequired).toBe(
        true,
      );
    }
  });

  it('enforces one immutable command per quest resolution key', () => {
    expect(LegacyRewardResolutionCommandSchema.indexes()).toEqual(
      expect.arrayContaining([
        [
          { command_key: 1 },
          { unique: true, name: 'uniq_legacy_reward_resolution_command' },
        ],
      ]),
    );
  });
});
