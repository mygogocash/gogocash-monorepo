import { Types } from 'mongoose';
import {
  executeLegacyManifestResolution,
  parseLegacyManifestResolutionArgs,
} from '../../scripts/resolve-legacy-reward-manifests';
import {
  buildLegacyManifestResolutionPlan,
  LEGACY_MANIFEST_COMPLETENESS_ATTESTATION,
  LegacyManifestResolutionEvidence,
  LegacyManifestResolutionSnapshot,
  LegacyManifestResolutionStore,
} from './legacy-reward-manifest-resolution';

const questId = new Types.ObjectId().toHexString();
const evidence: LegacyManifestResolutionEvidence = {
  quest_id: questId,
  reconciliation_version: 1,
  reviewed_by: 'operator@example.test',
  review_reference: 'review/42',
  completeness_attestation: LEGACY_MANIFEST_COMPLETENESS_ATTESTATION,
  manifests: [
    {
      reward_type: 'rank',
      recipients: [],
      no_recipient_reason:
        'Reviewed ledger proves this quest had no rank winners',
    },
    {
      reward_type: 'special-next-round',
      recipients: [],
      no_recipient_reason:
        'Reviewed ledger proves this quest had no special recipients',
    },
  ],
};
const snapshot: LegacyManifestResolutionSnapshot = {
  quest: {
    _id: questId,
    reward_model: 'legacy_v1',
    rewards: [],
    legacy_payout_reconciliation_status: 'quarantined',
    legacy_payout_reconciliation_version: 1,
  },
  manifests: [],
};

describe('legacy reward manifest resolution CLI', () => {
  it('defaults to dry-run and requires checksum, target, and quest confirmations for apply', () => {
    expect(
      parseLegacyManifestResolutionArgs([
        `--quest-id=${questId}`,
        '--evidence-file=./evidence.json',
      ]),
    ).toMatchObject({ mode: 'dry-run', questId });
    expect(() =>
      parseLegacyManifestResolutionArgs([
        '--apply',
        `--quest-id=${questId}`,
        '--evidence-file=./evidence.json',
      ]),
    ).toThrow(/confirm-checksum/i);
  });

  it('refuses stale evidence, target, or quest confirmation before store apply', async () => {
    const apply = jest.fn().mockResolvedValue('inserted');
    const store: LegacyManifestResolutionStore = {
      readSnapshot: jest.fn().mockResolvedValue(snapshot),
      apply,
    };
    const plan = buildLegacyManifestResolutionPlan(evidence, snapshot);
    const base = {
      mode: 'apply' as const,
      questId,
      evidenceFile: '/tmp/evidence.json',
      confirmChecksum: plan.plan_checksum,
      confirmTarget: 'target-a',
      confirmQuest: questId,
    };

    await expect(
      executeLegacyManifestResolution(
        store,
        evidence,
        { ...base, confirmChecksum: 'stale' },
        'target-a',
      ),
    ).rejects.toThrow(/checksum changed/i);
    await expect(
      executeLegacyManifestResolution(
        store,
        evidence,
        { ...base, confirmTarget: 'wrong' },
        'target-a',
      ),
    ).rejects.toThrow(/target/i);
    await expect(
      executeLegacyManifestResolution(
        store,
        evidence,
        { ...base, confirmQuest: new Types.ObjectId().toHexString() },
        'target-a',
      ),
    ).rejects.toThrow(/quest/i);
    expect(apply).not.toHaveBeenCalled();
  });

  it('applies exactly the freshly confirmed plan through the CAS store', async () => {
    const plan = buildLegacyManifestResolutionPlan(evidence, snapshot);
    const apply = jest.fn().mockResolvedValue('inserted');
    const store: LegacyManifestResolutionStore = {
      readSnapshot: jest.fn().mockResolvedValue(snapshot),
      apply,
    };

    const result = await executeLegacyManifestResolution(
      store,
      evidence,
      {
        mode: 'apply',
        questId,
        evidenceFile: '/tmp/evidence.json',
        confirmChecksum: plan.plan_checksum,
        confirmTarget: 'target-a',
        confirmQuest: questId,
      },
      'target-a',
    );

    expect(result.outcome).toBe('inserted');
    expect(apply).toHaveBeenCalledWith(
      expect.objectContaining({ plan_checksum: plan.plan_checksum }),
    );
  });
});
