import { Types } from 'mongoose';
import {
  buildLegacyManifestResolutionPlan,
  LEGACY_MANIFEST_COMPLETENESS_ATTESTATION,
  LegacyManifestResolutionEvidence,
  LegacyManifestResolutionSnapshot,
} from './legacy-reward-manifest-resolution';
import {
  legacyRankPayoutKey,
  legacySpecialPointKey,
} from './legacy-reward-identity';

const questId = new Types.ObjectId().toHexString();
const rankUser = new Types.ObjectId().toHexString();
const excludedUser = new Types.ObjectId().toHexString();

function evidence(): LegacyManifestResolutionEvidence {
  return {
    quest_id: questId,
    reconciliation_version: 1,
    reviewed_by: 'finance-operator@example.test',
    review_reference: 'ticket/legacy-quest-42-evidence-v3',
    completeness_attestation: LEGACY_MANIFEST_COMPLETENESS_ATTESTATION,
    manifests: [
      {
        reward_type: 'rank',
        recipients: [
          {
            user_id: rankUser,
            rank: 1,
            amount: 1200,
            currency: 'thb',
          },
          {
            user_id: excludedUser,
            rank: 2,
            amount: 800,
            currency: 'THB',
            excluded: true,
            exclusion_reason: 'Fraud review disqualified this frozen rank',
          },
        ],
      },
      {
        reward_type: 'special-next-round',
        recipients: [],
        no_recipient_reason:
          'Reviewed export shows the round intentionally had no special recipients',
      },
    ],
  };
}

function snapshot(): LegacyManifestResolutionSnapshot {
  return {
    quest: {
      _id: questId,
      reward_model: 'legacy_v1',
      start_date: new Date('2026-01-01T00:00:00.000Z'),
      end_date: new Date('2026-01-31T23:59:59.999Z'),
      reward_distribution_mode: 'campaign_end',
      facebook_page: 'https://facebook.example/gogocash',
      facebook_post: 'https://facebook.example/gogocash/posts/frozen',
      line: 'https://line.example/gogocash',
      config_revision: 4,
      campaign_revision: 7,
      rewards: [
        { rank: 1, reward: 1200, currency: 'THB' },
        { rank: 2, reward: 800, currency: 'THB' },
      ],
      legacy_payout_reconciliation_status: 'quarantined',
      legacy_payout_reconciliation_version: 1,
    },
    manifests: [],
  };
}

describe('legacy reward manifest resolution plan', () => {
  it('freezes reviewed included, excluded, and explicitly empty evidence under deterministic identities', () => {
    const plan = buildLegacyManifestResolutionPlan(evidence(), snapshot());

    expect(plan.already_applied).toBe(false);
    expect(plan.manifests).toHaveLength(2);
    expect(plan.manifests[0]).toMatchObject({
      reward_type: 'rank',
      quest_config_checksum: plan.quest_config_checksum,
      resolution_evidence_checksum: plan.evidence_checksum,
      recipients: [
        {
          user_id: rankUser,
          payout_key: legacyRankPayoutKey(questId, rankUser, 1),
          amount: 1200,
          rank: 1,
          currency: 'THB',
        },
        {
          user_id: excludedUser,
          payout_key: legacyRankPayoutKey(questId, excludedUser, 2),
          excluded: true,
          exclusion_reason: 'Fraud review disqualified this frozen rank',
        },
      ],
    });
    expect(plan.manifests[1]).toMatchObject({
      reward_type: 'special-next-round',
      recipients: [],
      no_recipient_reason:
        'Reviewed export shows the round intentionally had no special recipients',
    });
    expect(plan.plan_checksum).toMatch(/^[a-f0-9]{64}$/);
    expect(plan.quest_config_checksum).toMatch(/^[a-f0-9]{64}$/);
    expect(plan.manifests[1].quest_config_checksum).toBe(
      plan.quest_config_checksum,
    );
  });

  it('binds every manifest to the immutable quest model, schedule, social config, and reward economics', () => {
    const baseline = buildLegacyManifestResolutionPlan(evidence(), snapshot());
    const changedSchedule = snapshot();
    changedSchedule.quest!.end_date = new Date('2026-02-01T00:00:00.000Z');
    const changedSocial = snapshot();
    changedSocial.quest!.facebook_post =
      'https://facebook.example/gogocash/posts/attacker-edit';

    expect(
      buildLegacyManifestResolutionPlan(evidence(), changedSchedule)
        .quest_config_checksum,
    ).not.toBe(baseline.quest_config_checksum);
    expect(
      buildLegacyManifestResolutionPlan(evidence(), changedSocial)
        .quest_config_checksum,
    ).not.toBe(baseline.quest_config_checksum);
  });

  it('derives special-point keys rather than trusting an operator-provided identity', () => {
    const input = evidence();
    input.manifests[1] = {
      reward_type: 'special-next-round',
      recipients: [{ user_id: rankUser, amount: 80 }],
    };

    const plan = buildLegacyManifestResolutionPlan(input, snapshot());

    expect(plan.manifests[1].recipients[0].payout_key).toBe(
      legacySpecialPointKey(questId, rankUser),
    );
  });

  it('canonicalizes recipient order so equivalent reviewed sets have one checksum', () => {
    const reordered = evidence();
    reordered.manifests[0].recipients.reverse();

    expect(
      buildLegacyManifestResolutionPlan(reordered, snapshot())
        .evidence_checksum,
    ).toBe(
      buildLegacyManifestResolutionPlan(evidence(), snapshot())
        .evidence_checksum,
    );
  });

  it('rejects absence-only evidence, incomplete manifest types, and unexplained exclusions', () => {
    const missingEmptyReason = evidence();
    delete missingEmptyReason.manifests[1].no_recipient_reason;
    expect(() =>
      buildLegacyManifestResolutionPlan(missingEmptyReason, snapshot()),
    ).toThrow(/recipients or an explicit/i);

    const missingType = evidence();
    missingType.manifests = [missingType.manifests[0]];
    expect(() =>
      buildLegacyManifestResolutionPlan(missingType, snapshot()),
    ).toThrow(/missing complete special/i);

    const unexplained = evidence();
    unexplained.manifests[0].recipients[1].exclusion_reason = '';
    expect(() =>
      buildLegacyManifestResolutionPlan(unexplained, snapshot()),
    ).toThrow(/requires a reason/i);
  });

  it('rejects rank economics drift and any task_v2 or already-ready target', () => {
    const wrongAmount = evidence();
    wrongAmount.manifests[0].recipients[0].amount = 12_000;
    expect(() =>
      buildLegacyManifestResolutionPlan(wrongAmount, snapshot()),
    ).toThrow(/immutable quest rewards/i);

    const taskV2 = snapshot();
    taskV2.quest!.reward_model = 'task_v2';
    expect(() => buildLegacyManifestResolutionPlan(evidence(), taskV2)).toThrow(
      /legacy quest/i,
    );

    const ready = snapshot();
    ready.quest!.legacy_payout_reconciliation_status = 'ready';
    expect(() => buildLegacyManifestResolutionPlan(evidence(), ready)).toThrow(
      /pending\/quarantined/i,
    );
  });

  it('rejects loosely typed financial evidence instead of coercing it', () => {
    const stringAmount = evidence();
    stringAmount.manifests[0].recipients[0].amount = '1200' as never;
    expect(() =>
      buildLegacyManifestResolutionPlan(stringAmount, snapshot()),
    ).toThrow(/invalid recipient amount/i);

    const missingCurrency = evidence();
    delete missingCurrency.manifests[0].recipients[0].currency;
    expect(() =>
      buildLegacyManifestResolutionPlan(missingCurrency, snapshot()),
    ).toThrow(/currency.*must be a string/i);

    const duplicateQuestRanks = snapshot();
    duplicateQuestRanks.quest!.rewards!.push({
      rank: 1,
      reward: 1200,
      currency: 'THB',
    });
    expect(() =>
      buildLegacyManifestResolutionPlan(evidence(), duplicateQuestRanks),
    ).toThrow(/duplicate ranks/i);
  });

  it('is a no-op only when both existing immutable manifests match all reviewed evidence', () => {
    const first = buildLegacyManifestResolutionPlan(evidence(), snapshot());
    const rerun = buildLegacyManifestResolutionPlan(evidence(), {
      quest: {
        ...snapshot().quest!,
        legacy_payout_reconciliation_status: 'ready',
      },
      manifests: first.manifests,
    });
    expect(rerun.already_applied).toBe(true);

    const partial = first.manifests.slice(0, 1);
    expect(
      buildLegacyManifestResolutionPlan(evidence(), {
        ...snapshot(),
        manifests: partial,
      }),
    ).toMatchObject({ already_applied: false, manifests: first.manifests });
  });
});
