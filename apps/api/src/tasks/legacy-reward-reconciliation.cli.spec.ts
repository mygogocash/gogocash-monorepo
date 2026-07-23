import {
  executeLegacyRewardReconciliation,
  executeLegacyRewardRollback,
  legacyRewardTargetFingerprint,
  parseLegacyRewardRollbackArtifact,
  parseLegacyRewardCliArgs,
  stringifyLegacyRewardReport,
} from '../../scripts/reconcile-legacy-quest-rewards';
import {
  LegacyRewardReconciliationSnapshot,
  LegacyRewardReconciliationStore,
  buildLegacyRewardReconciliationPlan,
} from './legacy-reward-reconciliation';

const emptySnapshot = (): LegacyRewardReconciliationSnapshot => ({
  quests: [],
  points: [],
  conversions: [],
  socialRewards: [],
  rewardLists: [],
  manifests: [],
});

describe('legacy reward reconciliation CLI', () => {
  it('defaults to dry-run and rejects conflicting or unconfirmed apply modes', () => {
    expect(parseLegacyRewardCliArgs(['--run-id=dry'])).toMatchObject({
      mode: 'dry-run',
      runId: 'dry',
    });
    expect(() => parseLegacyRewardCliArgs(['--dry-run', '--apply'])).toThrow(
      /either/i,
    );
    expect(() => parseLegacyRewardCliArgs(['--apply'])).toThrow(
      /confirm-checksum/i,
    );
  });

  it('derives a credential-free stable target fingerprint', () => {
    expect(
      legacyRewardTargetFingerprint(
        'mongodb://user:secret@127.0.0.1:27017/gogocash?replicaSet=rs0',
      ),
    ).toBe(
      legacyRewardTargetFingerprint(
        'mongodb://other:hidden@127.0.0.1:27017/gogocash?replicaSet=rs0',
      ),
    );
    expect(
      legacyRewardTargetFingerprint(
        'mongodb://operator:secret@mongo-a:27017,mongo-b:27017/gogocash?replicaSet=rs0',
      ),
    ).toBe(
      legacyRewardTargetFingerprint(
        'mongodb://rotated:hidden@mongo-a:27017,mongo-b:27017/gogocash?replicaSet=rs0',
      ),
    );
  });

  it('requires an apply report plus checksum and target confirmations for rollback', async () => {
    expect(() => parseLegacyRewardCliArgs(['--rollback'])).toThrow(
      /confirm-checksum/i,
    );
    const options = parseLegacyRewardCliArgs([
      '--rollback',
      '--report-file=apply-report.json',
      '--confirm-checksum=rollback-checksum',
      '--confirm-target=target-a',
    ]);
    expect(options).toMatchObject({ mode: 'rollback' });

    const artifact = buildLegacyRewardReconciliationPlan(emptySnapshot());
    const store: LegacyRewardReconciliationStore = {
      readSnapshot: async () => emptySnapshot(),
      compareAndSet: jest.fn().mockResolvedValue(true),
    };
    await expect(
      executeLegacyRewardRollback(
        store,
        artifact,
        { ...options, confirmChecksum: artifact.rollback_checksum },
        'target-a',
      ),
    ).resolves.toMatchObject({
      mode: 'rollback',
      applied: { updated: 0, already_restored: 0, cas_conflicts: 0 },
    });
  });

  it('round-trips absent preimages and Date CAS values through the archived JSON report', async () => {
    const snapshot: LegacyRewardReconciliationSnapshot = {
      ...emptySnapshot(),
      quests: [
        {
          _id: 'quest-rollback',
          reward_model: 'legacy_v1',
          reward_status: false,
          start_date: new Date('2026-01-01T00:00:00.000Z'),
          end_date: new Date('2026-01-31T23:59:59.999Z'),
          rewards: [],
        },
      ],
    };
    const plan = buildLegacyRewardReconciliationPlan(
      snapshot,
      new Date('2026-02-01T00:00:00.000Z'),
    );
    const questApply = plan.operations.find(
      (operation) => operation.collection === 'quests',
    )!;
    const artifact = parseLegacyRewardRollbackArtifact(
      stringifyLegacyRewardReport(plan),
    );
    const questRollback = artifact.rollback.find(
      (operation) => operation.collection === 'quests',
    )!;
    expect(
      Object.prototype.hasOwnProperty.call(
        questRollback.set,
        'legacy_payout_reconciled_at',
      ),
    ).toBe(true);
    expect(questRollback.set.legacy_payout_reconciled_at).toBeUndefined();

    const postApplySnapshot = structuredClone(snapshot);
    Object.assign(postApplySnapshot.quests[0], questApply.set);
    const compareAndSet = jest.fn(async (operation) => {
      expect(operation.expected.legacy_payout_reconciled_at).toBeInstanceOf(
        Date,
      );
      expect(
        Object.prototype.hasOwnProperty.call(
          operation.set,
          'legacy_payout_reconciled_at',
        ),
      ).toBe(true);
      expect(operation.set.legacy_payout_reconciled_at).toBeUndefined();
      return true;
    });
    const store: LegacyRewardReconciliationStore = {
      readSnapshot: async () => postApplySnapshot,
      compareAndSet,
    };

    await expect(
      executeLegacyRewardRollback(
        store,
        artifact,
        {
          mode: 'rollback',
          runId: 'json-roundtrip',
          confirmChecksum: artifact.rollback_checksum,
          confirmTarget: 'target-a',
          reportFile: '/tmp/apply-report.json',
        },
        'target-a',
      ),
    ).resolves.toMatchObject({
      applied: { updated: 1, already_restored: 0, cas_conflicts: 0 },
    });
    expect(compareAndSet).toHaveBeenCalledTimes(1);
  });

  it('refuses stale checksum and wrong-target applies before any write', async () => {
    const writes: unknown[] = [];
    const store: LegacyRewardReconciliationStore = {
      readSnapshot: async () => emptySnapshot(),
      compareAndSet: async (operation) => {
        writes.push(operation);
        return true;
      },
    };
    await expect(
      executeLegacyRewardReconciliation(
        store,
        {
          mode: 'apply',
          runId: 'apply',
          confirmChecksum: 'stale',
          confirmTarget: 'target-a',
        },
        'target-a',
      ),
    ).rejects.toThrow(/checksum changed/i);
    await expect(
      executeLegacyRewardReconciliation(
        store,
        {
          mode: 'apply',
          runId: 'apply',
          confirmChecksum:
            'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
          confirmTarget: 'wrong',
        },
        'target-a',
      ),
    ).rejects.toThrow(/checksum|target/i);
    expect(writes).toEqual([]);
  });
});
