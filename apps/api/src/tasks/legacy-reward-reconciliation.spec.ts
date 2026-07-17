import {
  buildLegacyRewardReconciliationPlan,
  LegacyRewardReconciliationSnapshot,
  LegacyRewardReconciliationStore,
  runLegacyRewardReconciliation,
  runLegacyRewardRollback,
} from './legacy-reward-reconciliation';
import {
  legacyQuestPayoutConfigChecksum,
  legacyRewardManifestHash,
  legacyRewardManifestKey,
} from './legacy-reward-manifest';
import { legacyRankPayoutKey } from './legacy-reward-identity';

const baseSnapshot = (): LegacyRewardReconciliationSnapshot => {
  const quest = {
    _id: 'quest-1',
    start_date: new Date('2026-01-01T00:00:00.000Z'),
    end_date: new Date('2026-01-31T23:59:59.999Z'),
    reward_model: undefined,
    reward_status: true,
    rewards: [{ rank: 1, reward: 100, currency: 'THB' }],
    facebook_page: 'https://facebook.example/gogocash',
    facebook_post: 'https://facebook.example/gogocash/posts/frozen',
    line: 'https://line.example/gogocash',
    legacy_payout_resolution_command_key:
      'legacy:quest:quest-1:manifest-resolution:v1',
    legacy_payout_resolution_plan_checksum: 'b'.repeat(64),
    legacy_payout_resolution_started_at: new Date('2026-02-01T00:00:00.000Z'),
    legacy_payout_config_checksum: '',
  };
  quest.legacy_payout_config_checksum = legacyQuestPayoutConfigChecksum(quest);
  const rankRecipients = [
    {
      user_id: 'user-1',
      payout_key: legacyRankPayoutKey('quest-1', 'user-1', 1),
      rank: 1,
      amount: 100,
      currency: 'THB',
    },
  ];
  const specialRecipients: [] = [];
  const noSpecialRecipientReason =
    'Reviewed evidence found no special recipients';
  return {
    quests: [quest],
    points: [
      {
        _id: 'purchase-point',
        user_id: 'user-1',
        conversion_id: 101,
        point: 250,
        type: 'add',
        action: 'purchase',
        createdAt: new Date('2026-01-10T00:00:00.000Z'),
      },
      {
        _id: 'social-point',
        user_id: 'user-1',
        conversion_id: 0,
        point: 50,
        type: 'add',
        action: 'reward_quest_social:facebook:follow:social-1',
        createdAt: new Date('2026-01-11T00:00:00.000Z'),
      },
    ],
    conversions: [
      {
        _id: 'purchase-conversion',
        conversion_id: 101,
        source: 'involve',
        user_id: 'user-1',
        offer_name: 'merchant',
        currency: 'THB',
        sale_amount: 250.9,
        payout: 10,
        datetime_conversion: new Date('2026-01-10T00:00:00.000Z'),
      },
      {
        _id: 'rank-conversion',
        conversion_id: 201,
        user_id: 'user-1',
        offer_name: 'reward_conversion_quest',
        adv_sub3: 'quest-1',
        currency: 'THB',
        sale_amount: 0,
        payout: 100,
        datetime_conversion: new Date('2026-02-01T00:00:00.000Z'),
      },
    ],
    socialRewards: [
      {
        _id: 'social-1',
        quest_id: 'quest-1',
        user_id: 'user-1',
        type: 'facebook',
        action: 'follow',
        reward_status: false,
      },
    ],
    rewardLists: [{ _id: 'reward-list', name: 'quest', data: [] }],
    manifests: [
      {
        manifest_key: legacyRewardManifestKey('quest-1', 'rank'),
        quest_id: 'quest-1',
        reward_type: 'rank',
        reconciliation_version: 1,
        status: 'ready',
        recipients: rankRecipients,
        quest_config_checksum: quest.legacy_payout_config_checksum,
        manifest_hash: legacyRewardManifestHash(
          'quest-1',
          'rank',
          1,
          rankRecipients,
          undefined,
          quest.legacy_payout_config_checksum,
        ),
      },
      {
        manifest_key: legacyRewardManifestKey('quest-1', 'special-next-round'),
        quest_id: 'quest-1',
        reward_type: 'special-next-round',
        reconciliation_version: 1,
        status: 'ready',
        recipients: specialRecipients,
        no_recipient_reason: noSpecialRecipientReason,
        quest_config_checksum: quest.legacy_payout_config_checksum,
        manifest_hash: legacyRewardManifestHash(
          'quest-1',
          'special-next-round',
          1,
          specialRecipients,
          noSpecialRecipientReason,
          quest.legacy_payout_config_checksum,
        ),
      },
    ],
    resolutionCommands: [
      {
        command_key: 'legacy:quest:quest-1:manifest-resolution:v1',
        quest_id: 'quest-1',
        reconciliation_version: 1,
        status: 'complete',
        plan_checksum: 'b'.repeat(64),
        quest_config_checksum: quest.legacy_payout_config_checksum,
        expected_manifest_hashes: [
          legacyRewardManifestHash(
            'quest-1',
            'rank',
            1,
            rankRecipients,
            undefined,
            quest.legacy_payout_config_checksum,
          ),
          legacyRewardManifestHash(
            'quest-1',
            'special-next-round',
            1,
            specialRecipients,
            noSpecialRecipientReason,
            quest.legacy_payout_config_checksum,
          ),
        ].sort(),
      },
    ],
  };
};

function refreshQuestResolution(
  snapshot: LegacyRewardReconciliationSnapshot,
  questId = 'quest-1',
) {
  const quest = snapshot.quests.find((item) => item._id === questId)!;
  quest.legacy_payout_config_checksum = legacyQuestPayoutConfigChecksum(quest);
  const manifests = snapshot.manifests.filter(
    (manifest) => manifest.quest_id === questId,
  );
  for (const manifest of manifests) {
    manifest.quest_config_checksum = quest.legacy_payout_config_checksum;
    manifest.manifest_hash = legacyRewardManifestHash(
      questId,
      manifest.reward_type,
      manifest.reconciliation_version,
      manifest.recipients,
      manifest.no_recipient_reason,
      quest.legacy_payout_config_checksum,
    );
  }
  const command = snapshot.resolutionCommands?.find(
    (item) => item.quest_id === questId,
  );
  if (command) {
    command.quest_config_checksum = quest.legacy_payout_config_checksum;
    command.expected_manifest_hashes = manifests
      .map((manifest) => manifest.manifest_hash)
      .sort();
  }
}

function memoryStore(initial: LegacyRewardReconciliationSnapshot): {
  store: LegacyRewardReconciliationStore;
  writes: Array<Record<string, unknown>>;
} {
  let snapshot = structuredClone(initial);
  const writes: Array<Record<string, unknown>> = [];
  return {
    writes,
    store: {
      readSnapshot: jest.fn(async () => structuredClone(snapshot)),
      compareAndSet: jest.fn(async (operation) => {
        writes.push(operation as unknown as Record<string, unknown>);
        const collection =
          operation.collection === 'socialrewards'
            ? snapshot.socialRewards
            : operation.collection === 'points'
              ? snapshot.points
              : operation.collection === 'conversions'
                ? snapshot.conversions
                : snapshot.quests;
        const row = collection.find((item) => item._id === operation.id) as
          Record<string, unknown> | undefined;
        if (!row) return false;
        for (const [key, expected] of Object.entries(operation.expected)) {
          if (row[key] !== expected) return false;
        }
        Object.assign(row, operation.set);
        return true;
      }),
    },
  };
}

describe('legacy reward reconciliation', () => {
  const questReadiness = (
    plan: ReturnType<typeof buildLegacyRewardReconciliationPlan>,
  ) =>
    plan.operations.find(
      (operation) =>
        operation.collection === 'quests' && operation.id === 'quest-1',
    );

  it('is a counted zero-write dry-run and identifies deterministic legacy keys', async () => {
    const fixture = memoryStore(baseSnapshot());

    const report = await runLegacyRewardReconciliation(fixture.store, {
      mode: 'dry-run',
      runId: 'dry-1',
    });

    expect(fixture.writes).toEqual([]);
    expect(report.mode).toBe('dry-run');
    expect(report.counts).toMatchObject({
      quests_scanned: 1,
      legacy_quests: 1,
      task_v2_quests_excluded: 0,
      points_scanned: 2,
      conversions_scanned: 2,
      social_rewards_scanned: 1,
      reward_lists_scanned: 1,
      point_keys_planned: 2,
      conversion_keys_planned: 1,
      social_keys_planned: 1,
    });
    expect(report.operations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          collection: 'points',
          id: 'purchase-point',
          set: {
            idempotency_key: 'legacy:purchase:conversion:involve:default:101',
          },
        }),
        expect.objectContaining({
          collection: 'conversions',
          id: 'rank-conversion',
          set: expect.objectContaining({
            quest_payout_key: 'legacy:quest:quest-1:rank:1:user:user-1',
          }),
        }),
      ]),
    );
  });

  it('applies only compare-and-set backfills and a rerun is a no-op', async () => {
    const fixture = memoryStore(baseSnapshot());

    const first = await runLegacyRewardReconciliation(fixture.store, {
      mode: 'apply',
      runId: 'apply-1',
    });
    const writesAfterFirst = fixture.writes.length;
    const second = await runLegacyRewardReconciliation(fixture.store, {
      mode: 'apply',
      runId: 'apply-2',
    });

    expect(first.applied.updated).toBeGreaterThan(0);
    expect(first.applied.cas_conflicts).toBe(0);
    expect(second.operations).toEqual([]);
    expect(second.applied).toEqual({ updated: 0, cas_conflicts: 0 });
    expect(fixture.writes).toHaveLength(writesAfterFirst);
  });

  it('records exact changed-field preimages and rolls back in reverse CAS order idempotently', async () => {
    const fixture = memoryStore(baseSnapshot());
    const applied = await runLegacyRewardReconciliation(fixture.store, {
      mode: 'apply',
      runId: 'apply-for-rollback',
    });
    const questBackup = applied.backup.find(
      (entry) => entry.collection === 'quests' && entry.id === 'quest-1',
    );
    expect(questBackup?.preimage).toEqual(
      expect.objectContaining({
        legacy_payout_reconciliation_status: undefined,
        legacy_payout_reconciliation_version: undefined,
        legacy_payout_reconciled_at: undefined,
      }),
    );

    const firstRollback = await runLegacyRewardRollback(
      fixture.store,
      applied,
      { runId: 'rollback-1' },
    );
    const secondRollback = await runLegacyRewardRollback(
      fixture.store,
      applied,
      { runId: 'rollback-2' },
    );

    expect(firstRollback.applied.cas_conflicts).toBe(0);
    expect(firstRollback.applied.updated).toBe(applied.rollback.length);
    expect(secondRollback.applied).toEqual({
      updated: 0,
      already_restored: applied.rollback.length,
      cas_conflicts: 0,
    });
    expect(applied.rollback.map((operation) => operation.identity)).toEqual(
      [...applied.operations]
        .reverse()
        .map((operation) => `rollback:${operation.identity}`),
    );
  });

  it('uses an explicit multi-recipient manifest to backfill an old partial round without inferring from absent keys', () => {
    const snapshot = baseSnapshot();
    snapshot.quests[0].reward_status = false;
    snapshot.quests[0].rewards = [
      { rank: 1, reward: 100, currency: 'THB' },
      { rank: 2, reward: 50, currency: 'THB' },
    ];
    const recipients = [
      {
        user_id: 'user-1',
        payout_key: legacyRankPayoutKey('quest-1', 'user-1', 1),
        rank: 1,
        amount: 100,
        currency: 'THB',
      },
      {
        user_id: 'user-2',
        payout_key: legacyRankPayoutKey('quest-1', 'user-2', 2),
        rank: 2,
        amount: 50,
        currency: 'THB',
      },
    ];
    snapshot.manifests[0] = {
      ...snapshot.manifests[0],
      recipients,
      manifest_hash: legacyRewardManifestHash('quest-1', 'rank', 1, recipients),
    };
    snapshot.conversions.push({
      ...snapshot.conversions[1],
      _id: 'rank-conversion-2',
      conversion_id: 202,
      user_id: 'user-2',
      payout: 50,
    });
    refreshQuestResolution(snapshot);

    const plan = buildLegacyRewardReconciliationPlan(snapshot);

    expect(plan.quarantine).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ reason: 'partial_round' }),
        expect.objectContaining({ reason: 'absence_does_not_prove_unpaid' }),
      ]),
    );
    expect(plan.operations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          collection: 'conversions',
          id: 'rank-conversion',
          set: expect.objectContaining({
            quest_payout_key: 'legacy:quest:quest-1:rank:1:user:user-1',
          }),
        }),
        expect.objectContaining({
          collection: 'quests',
          id: 'quest-1',
          set: expect.objectContaining({
            legacy_payout_reconciliation_status: 'ready',
          }),
        }),
      ]),
    );
  });

  it('verifies partial unique indexes after ledger backfills but before publishing quest readiness', async () => {
    const fixture = memoryStore(baseSnapshot());
    const order: string[] = [];
    const compareAndSet = fixture.store.compareAndSet.bind(fixture.store);
    fixture.store.compareAndSet = jest.fn(async (operation) => {
      order.push(`${operation.collection}:${operation.id}`);
      return compareAndSet(operation);
    });
    fixture.store.ensureIndexes = jest.fn(async () => {
      order.push('indexes');
      return ['point-index', 'conversion-index', 'social-index'];
    });

    const report = await runLegacyRewardReconciliation(fixture.store, {
      mode: 'apply',
      runId: 'ordered-apply',
    });

    const indexPosition = order.indexOf('indexes');
    const questPosition = order.findIndex((item) => item.startsWith('quests:'));
    expect(indexPosition).toBeGreaterThan(0);
    expect(questPosition).toBeGreaterThan(indexPosition);
    expect(report.indexes_verified).toEqual([
      'point-index',
      'conversion-index',
      'social-index',
    ]);
  });

  it.each([
    [
      'unknown reward model',
      (snapshot: LegacyRewardReconciliationSnapshot) => {
        snapshot.quests[0].reward_model = 'future_v3';
      },
      'unknown_reward_model',
    ],
    [
      'manual reward conversion without quest id',
      (snapshot: LegacyRewardReconciliationSnapshot) => {
        snapshot.conversions[1].adv_sub3 = '';
      },
      'manual_reward_without_quest_id',
    ],
    [
      'amount currency or rank mismatch',
      (snapshot: LegacyRewardReconciliationSnapshot) => {
        snapshot.conversions[1].payout = 99;
      },
      'amount_currency_rank_mismatch',
    ],
    [
      'duplicate social identity',
      (snapshot: LegacyRewardReconciliationSnapshot) => {
        snapshot.socialRewards.push({
          ...snapshot.socialRewards[0],
          _id: 'social-duplicate',
        });
      },
      'social_referral_ambiguity',
    ],
    [
      'partial rank round',
      (snapshot: LegacyRewardReconciliationSnapshot) => {
        snapshot.quests[0].reward_status = false;
        snapshot.manifests = snapshot.manifests.filter(
          (manifest) => manifest.reward_type !== 'rank',
        );
      },
      'missing_recipient_manifest',
    ],
    [
      'legacy special point without quest lineage',
      (snapshot: LegacyRewardReconciliationSnapshot) => {
        snapshot.points.push({
          _id: 'old-special',
          user_id: 'user-1',
          conversion_id: 999,
          point: 80,
          type: 'add',
          action: 'special_point_quest',
          createdAt: new Date('2026-02-01T00:00:00.000Z'),
        });
      },
      'missing_quest_lineage',
    ],
  ])('quarantines %s instead of guessing', (_name, mutate, reason) => {
    const snapshot = baseSnapshot();
    mutate(snapshot);

    const plan = buildLegacyRewardReconciliationPlan(snapshot);

    expect(plan.quarantine).toEqual(
      expect.arrayContaining([expect.objectContaining({ reason })]),
    );
  });

  it('quarantines overlapping legacy windows and excludes task_v2 evidence', () => {
    const snapshot = baseSnapshot();
    snapshot.quests.push({
      ...snapshot.quests[0],
      _id: 'quest-overlap',
      start_date: new Date('2026-01-15T00:00:00.000Z'),
      end_date: new Date('2026-02-15T00:00:00.000Z'),
    });
    snapshot.quests.push({
      ...snapshot.quests[0],
      _id: 'quest-v2',
      reward_model: 'task_v2',
    });

    const plan = buildLegacyRewardReconciliationPlan(snapshot);

    expect(plan.counts.task_v2_quests_excluded).toBe(1);
    expect(plan.quarantine).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ reason: 'overlapping_quest_windows' }),
      ]),
    );
    expect(
      plan.operations.some(
        (operation) =>
          operation.collection === 'quests' && operation.id === 'quest-v2',
      ),
    ).toBe(false);
  });

  it('blocks readiness when reward_status=true has zero rank effects for an included manifest', () => {
    const snapshot = baseSnapshot();
    snapshot.conversions = snapshot.conversions.filter(
      (conversion) => conversion.offer_name !== 'reward_conversion_quest',
    );

    const plan = buildLegacyRewardReconciliationPlan(snapshot);

    expect(plan.quarantine).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          reason: 'rank_manifest_coverage_mismatch',
          quest_id: 'quest-1',
        }),
      ]),
    );
    expect(questReadiness(plan)?.set).toMatchObject({
      legacy_payout_reconciliation_status: 'quarantined',
    });
  });

  it('blocks readiness when a paid rank round covers only part of the included manifest', () => {
    const snapshot = baseSnapshot();
    snapshot.quests[0].rewards = [
      { rank: 1, reward: 100, currency: 'THB' },
      { rank: 2, reward: 50, currency: 'THB' },
    ];
    const recipients = [
      snapshot.manifests[0].recipients[0],
      {
        user_id: 'user-2',
        payout_key: legacyRankPayoutKey('quest-1', 'user-2', 2),
        rank: 2,
        amount: 50,
        currency: 'THB',
      },
    ];
    snapshot.manifests[0] = {
      ...snapshot.manifests[0],
      recipients,
      manifest_hash: legacyRewardManifestHash('quest-1', 'rank', 1, recipients),
    };
    refreshQuestResolution(snapshot);

    const plan = buildLegacyRewardReconciliationPlan(snapshot);

    expect(plan.quarantine).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ reason: 'rank_manifest_coverage_mismatch' }),
      ]),
    );
    expect(questReadiness(plan)?.set).toMatchObject({
      legacy_payout_reconciliation_status: 'quarantined',
    });
  });

  it('blocks every candidate legacy quest when an orphan synthetic rank effect has no quest lineage', () => {
    const snapshot = baseSnapshot();
    snapshot.conversions[1].adv_sub3 = '';

    const plan = buildLegacyRewardReconciliationPlan(snapshot);

    expect(plan.quarantine).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ reason: 'manual_reward_without_quest_id' }),
      ]),
    );
    expect(questReadiness(plan)?.set).toMatchObject({
      legacy_payout_reconciliation_status: 'quarantined',
    });
  });

  it('quarantines an existing purchase Point whose key is not its canonical provider identity', () => {
    const snapshot = baseSnapshot();
    snapshot.points[0].idempotency_key = 'attacker:chosen:key';

    const plan = buildLegacyRewardReconciliationPlan(snapshot);

    expect(plan.quarantine).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ reason: 'purchase_identity_conflict' }),
      ]),
    );
    expect(plan.operations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          collection: 'conversions',
          id: 'purchase-conversion',
          set: expect.objectContaining({
            legacy_point_reconciliation_status: 'quarantined',
          }),
        }),
      ]),
    );
  });

  it('repairs the purchase crash window by completing the conversion from its one canonical Point effect', () => {
    const snapshot = baseSnapshot();
    snapshot.conversions[0].currency = 'USD';
    snapshot.conversions[0].sale_amount = 10;
    snapshot.conversions[0].add_point = false;
    snapshot.points[0].point = 360;
    snapshot.points[0].idempotency_key =
      'legacy:purchase:conversion:involve:default:101';

    const plan = buildLegacyRewardReconciliationPlan(snapshot);

    expect(plan.operations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          collection: 'conversions',
          id: 'purchase-conversion',
          set: expect.objectContaining({
            add_point: true,
            legacy_point_amount: 360,
            legacy_point_reconciliation_status: 'completed',
          }),
        }),
      ]),
    );
  });

  it('quarantines duplicate USD Point effects instead of selecting one', () => {
    const snapshot = baseSnapshot();
    snapshot.conversions[0].currency = 'USD';
    snapshot.conversions[0].sale_amount = 10;
    snapshot.points.push({
      ...snapshot.points[0],
      _id: 'purchase-point-duplicate',
      point: 361,
    });

    const plan = buildLegacyRewardReconciliationPlan(snapshot);

    expect(plan.quarantine).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ reason: 'duplicate_purchase_effect' }),
      ]),
    );
    expect(plan.operations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          collection: 'conversions',
          id: 'purchase-conversion',
          set: expect.objectContaining({
            legacy_point_reconciliation_status: 'quarantined',
          }),
        }),
      ]),
    );
  });

  it('quarantines one legacy Point that could bind to multiple provider conversion identities', () => {
    const snapshot = baseSnapshot();
    snapshot.conversions.push({
      ...snapshot.conversions[0],
      _id: 'purchase-conversion-secondary-account',
      provider_account: 'secondary',
    });

    const plan = buildLegacyRewardReconciliationPlan(snapshot);

    expect(plan.quarantine).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          reason: 'purchase_identity_conflict',
          collection: 'points',
          record_ids: ['purchase-point'],
        }),
      ]),
    );
    for (const conversionId of [
      'purchase-conversion',
      'purchase-conversion-secondary-account',
    ]) {
      expect(plan.operations).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            collection: 'conversions',
            id: conversionId,
            set: expect.objectContaining({
              legacy_point_reconciliation_status: 'quarantined',
            }),
          }),
        ]),
      );
    }
    expect(plan.operations).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          collection: 'points',
          id: 'purchase-point',
          set: expect.objectContaining({ idempotency_key: expect.any(String) }),
        }),
      ]),
    );
  });

  it('quarantines an unpaid purchase currency without a supported immutable quote', () => {
    const snapshot = baseSnapshot();
    snapshot.points = snapshot.points.filter(
      (point) => point._id !== 'purchase-point',
    );
    snapshot.conversions[0].currency = 'EUR';
    snapshot.conversions[0].sale_amount = 100;

    const plan = buildLegacyRewardReconciliationPlan(snapshot);

    expect(plan.quarantine).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          reason: 'unsupported_purchase_currency',
          collection: 'conversions',
          record_ids: ['purchase-conversion'],
        }),
      ]),
    );
    expect(plan.operations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          collection: 'conversions',
          id: 'purchase-conversion',
          set: expect.objectContaining({
            legacy_point_reconciliation_status: 'quarantined',
          }),
        }),
      ]),
    );
  });

  it('quarantines conflicting rank user_id and aff_sub1 identities', () => {
    const snapshot = baseSnapshot();
    snapshot.conversions[1].user_id = 'user-1';
    snapshot.conversions[1].aff_sub1 = 'user_id:attacker';

    const plan = buildLegacyRewardReconciliationPlan(snapshot);

    expect(plan.quarantine).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ reason: 'rank_user_identity_conflict' }),
      ]),
    );
    expect(questReadiness(plan)?.set).toMatchObject({
      legacy_payout_reconciliation_status: 'quarantined',
    });
  });

  it.each([
    [
      'user_id',
      { user_id: undefined, aff_sub1: 'user_id:user-1' },
      { user_id: 'user-1' },
    ],
    [
      'aff_sub1',
      { user_id: 'user-1', aff_sub1: undefined },
      { aff_sub1: 'user_id:user-1' },
    ],
  ])(
    'CAS-backfills missing rank %s identity',
    (_label, identity, expectedSet) => {
      const snapshot = baseSnapshot();
      Object.assign(snapshot.conversions[1], identity);

      const plan = buildLegacyRewardReconciliationPlan(snapshot);

      expect(plan.operations).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            collection: 'conversions',
            id: 'rank-conversion',
            set: expect.objectContaining(expectedSet),
          }),
        ]),
      );
    },
  );
});
