import {
  assertLegacyRewardManifest,
  legacyQuestPayoutConfigChecksum,
  legacyRewardManifestHash,
  legacyRewardManifestKey,
  LegacyRewardManifest,
} from './legacy-reward-manifest';
import { legacyRankPayoutKey } from './legacy-reward-identity';

describe('legacy reward recipient manifest', () => {
  const questConfigChecksum = 'a'.repeat(64);
  const recipients = [
    {
      user_id: 'user-a',
      payout_key: legacyRankPayoutKey('quest-a', 'user-a', 1),
      rank: 1,
      amount: 100,
      currency: 'THB',
    },
    {
      user_id: 'user-b',
      payout_key: legacyRankPayoutKey('quest-a', 'user-b', 2),
      rank: 2,
      amount: 0,
      currency: 'THB',
      excluded: true,
      exclusion_reason: 'no configured reward',
    },
  ];

  function manifest(): LegacyRewardManifest {
    const manifestRecipients = recipients.map((recipient) => ({
      ...recipient,
    }));
    return {
      manifest_key: legacyRewardManifestKey('quest-a', 'rank'),
      quest_id: 'quest-a',
      reward_type: 'rank',
      reconciliation_version: 1,
      status: 'ready',
      recipients: manifestRecipients,
      quest_config_checksum: questConfigChecksum,
      manifest_hash: legacyRewardManifestHash(
        'quest-a',
        'rank',
        1,
        manifestRecipients,
        undefined,
        questConfigChecksum,
      ),
    };
  }

  it('accepts one immutable expected/excluded recipient snapshot', () => {
    expect(() =>
      assertLegacyRewardManifest(manifest(), 'quest-a', 'rank', 1),
    ).not.toThrow();
  });

  it('rejects duplicate payout identities and post-reconciliation mutation', () => {
    const duplicate = manifest();
    duplicate.recipients[1].payout_key = duplicate.recipients[0].payout_key;
    expect(() =>
      assertLegacyRewardManifest(duplicate, 'quest-a', 'rank', 1),
    ).toThrow(/invalid/i);

    const mutated = manifest();
    mutated.recipients[0].amount = 999;
    expect(() =>
      assertLegacyRewardManifest(mutated, 'quest-a', 'rank', 1),
    ).toThrow(/hash mismatch/i);
  });

  it('rejects payout keys that do not encode the exact quest, user, and rank effect', () => {
    const wrongIdentity = manifest();
    wrongIdentity.recipients[0].payout_key = legacyRankPayoutKey(
      'quest-a',
      'different-user',
      1,
    );
    wrongIdentity.manifest_hash = legacyRewardManifestHash(
      'quest-a',
      'rank',
      1,
      wrongIdentity.recipients,
      undefined,
      questConfigChecksum,
    );

    expect(() =>
      assertLegacyRewardManifest(wrongIdentity, 'quest-a', 'rank', 1),
    ).toThrow(/rank manifest is invalid/i);
  });

  it('rejects wrong quest/version/status and unreasoned exclusions', () => {
    const wrongVersion = manifest();
    expect(() =>
      assertLegacyRewardManifest(wrongVersion, 'quest-a', 'rank', 2),
    ).toThrow(/not ready/i);
    const exclusion = manifest();
    exclusion.recipients[1].exclusion_reason = '';
    exclusion.manifest_hash = legacyRewardManifestHash(
      'quest-a',
      'rank',
      1,
      exclusion.recipients,
      undefined,
      questConfigChecksum,
    );
    expect(() =>
      assertLegacyRewardManifest(exclusion, 'quest-a', 'rank', 1),
    ).toThrow(/requires a reason/i);
  });

  it('requires reviewed evidence for an empty manifest and hashes that reason', () => {
    const empty: LegacyRewardManifest = {
      manifest_key: legacyRewardManifestKey('quest-a', 'rank'),
      quest_id: 'quest-a',
      reward_type: 'rank',
      reconciliation_version: 1,
      status: 'ready',
      recipients: [],
      quest_config_checksum: questConfigChecksum,
      manifest_hash: legacyRewardManifestHash(
        'quest-a',
        'rank',
        1,
        [],
        undefined,
        questConfigChecksum,
      ),
    };
    expect(() =>
      assertLegacyRewardManifest(empty, 'quest-a', 'rank', 1),
    ).toThrow(/no-recipient evidence/i);

    empty.no_recipient_reason = 'Reviewed export has no eligible recipients';
    empty.manifest_hash = legacyRewardManifestHash(
      'quest-a',
      'rank',
      1,
      [],
      empty.no_recipient_reason,
      questConfigChecksum,
    );
    expect(() =>
      assertLegacyRewardManifest(empty, 'quest-a', 'rank', 1),
    ).not.toThrow();
    empty.no_recipient_reason = 'Tampered reason';
    expect(() =>
      assertLegacyRewardManifest(empty, 'quest-a', 'rank', 1),
    ).toThrow(/hash mismatch/i);
  });

  it('rejects a manifest bound to a different immutable quest configuration', () => {
    expect(() =>
      assertLegacyRewardManifest(
        manifest(),
        'quest-a',
        'rank',
        1,
        'b'.repeat(64),
      ),
    ).toThrow(/not ready/i);
  });

  it('binds legacy eligibility and task economics into the quest checksum', () => {
    const base = {
      _id: 'quest-a',
      reward_model: 'legacy_v1',
      timezone: 'Asia/Bangkok',
      audience: { kind: 'all', tier_ids: [] },
      reward_caps: {
        max_awards_per_user: 1,
        max_referrals_per_user: null,
      },
      tasks: [
        {
          task_key: 'legacy-brand-a',
          task_type: 'brand_purchase',
          offer_id: 101,
          merchant_id: 1001,
          points: 50,
          enabled: true,
        },
      ],
      rewards: [{ rank: 1, reward: 100, currency: 'THB' }],
    };
    const original = legacyQuestPayoutConfigChecksum(base);

    expect(
      legacyQuestPayoutConfigChecksum({
        ...base,
        tasks: [{ ...base.tasks[0], points: 75 }],
      }),
    ).not.toBe(original);
    expect(
      legacyQuestPayoutConfigChecksum({
        ...base,
        audience: { kind: 'membership_tiers', tier_ids: ['gogopass'] },
      }),
    ).not.toBe(original);
    expect(
      legacyQuestPayoutConfigChecksum({
        ...base,
        reward_caps: {
          max_awards_per_user: 2,
          max_referrals_per_user: null,
        },
      }),
    ).not.toBe(original);
  });
});
