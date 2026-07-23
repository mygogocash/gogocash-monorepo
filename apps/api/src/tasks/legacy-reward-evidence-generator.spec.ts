import {
  assertLeaderboardSortedDesc,
  buildLegacyRewardEvidence,
  computeGeneratorSnapshotHash,
  computeLeaderboardSnapshotHash,
  selectFundedRankEntries,
  type GeneratorQuestInput,
  type LeaderboardEntryInput,
} from './legacy-reward-evidence-generator';
import { LEGACY_MANIFEST_COMPLETENESS_ATTESTATION } from './legacy-reward-manifest-resolution';

// Deterministic 24-hex ObjectId-shaped ids for fixtures.
const uid = (n: number): string => n.toString(16).padStart(24, '0');
const QUEST_ID = 'a'.repeat(24);

function quest(
  overrides: Partial<GeneratorQuestInput> = {},
): GeneratorQuestInput {
  return {
    _id: QUEST_ID,
    reward_model: 'legacy_v1',
    start_date: '2026-06-01T00:00:00.000Z',
    end_date: '2026-06-30T23:59:59.000Z',
    rewards: [
      { rank: 1, reward: 1000, currency: 'THB' },
      { rank: 2, reward: 500, currency: 'THB' },
    ],
    ...overrides,
  };
}

function lb(entries: Array<[number, number]>): LeaderboardEntryInput[] {
  // [userIndex, point] tuples -> leaderboard rows (caller controls order).
  return entries.map(([userIndex, point]) => ({
    user_id: uid(userIndex),
    point,
  }));
}

const CLOSED_NOW = new Date('2026-07-01T00:00:00.000Z');

const baseArgs = {
  reviewedBy: 'ops@gogocash.co',
  reviewReference: 'PAYOUT-2026-06',
  now: CLOSED_NOW,
};

describe('buildLegacyRewardEvidence > happy path', () => {
  it('given two funded ranks with distinct points > then emits both manifests with correct recipients', () => {
    const evidence = buildLegacyRewardEvidence({
      quest: quest(),
      leaderboard: lb([
        [1, 900],
        [2, 400],
        [3, 100],
      ]),
      specialRows: [
        { user_id: uid(1), amount: 80 },
        { user_id: uid(2), amount: 30 },
      ],
      ...baseArgs,
    });

    expect(evidence.quest_id).toBe(QUEST_ID);
    expect(evidence.reconciliation_version).toBe(1);
    expect(evidence.reviewed_by).toBe('ops@gogocash.co');
    expect(evidence.review_reference).toBe('PAYOUT-2026-06');
    expect(evidence.completeness_attestation).toBe(
      LEGACY_MANIFEST_COMPLETENESS_ATTESTATION,
    );
    expect(evidence.manifests).toHaveLength(2);

    const rank = evidence.manifests.find((m) => m.reward_type === 'rank')!;
    expect(rank.no_recipient_reason).toBeUndefined();
    expect(rank.recipients).toEqual([
      { user_id: uid(1), amount: 1000, rank: 1, currency: 'THB' },
      { user_id: uid(2), amount: 500, rank: 2, currency: 'THB' },
    ]);

    const special = evidence.manifests.find(
      (m) => m.reward_type === 'special-next-round',
    )!;
    expect(special.no_recipient_reason).toBeUndefined();
    expect(special.recipients).toEqual([
      { user_id: uid(1), amount: 80 },
      { user_id: uid(2), amount: 30 },
    ]);
    // special recipients must never carry rank/currency
    for (const r of special.recipients) {
      expect('rank' in r).toBe(false);
      expect('currency' in r).toBe(false);
    }
  });

  it('amount equals reward exactly and currency is uppercased to canonical', () => {
    const evidence = buildLegacyRewardEvidence({
      quest: quest({
        rewards: [{ rank: 1, reward: 777, currency: 'THB' }],
      }),
      leaderboard: lb([[5, 500]]),
      specialRows: [],
      ...baseArgs,
    });
    const rank = evidence.manifests.find((m) => m.reward_type === 'rank')!;
    expect(rank.recipients[0]).toEqual({
      user_id: uid(5),
      amount: 777,
      rank: 1,
      currency: 'THB',
    });
  });

  it('defaults missing reward currency to THB', () => {
    const evidence = buildLegacyRewardEvidence({
      quest: quest({ rewards: [{ rank: 1, reward: 100 }] }),
      leaderboard: lb([[5, 500]]),
      specialRows: [],
      ...baseArgs,
    });
    const rank = evidence.manifests.find((m) => m.reward_type === 'rank')!;
    expect(rank.recipients[0].currency).toBe('THB');
  });
});

describe('buildLegacyRewardEvidence > refuse conditions', () => {
  it('refuses a non-legacy quest', () => {
    expect(() =>
      buildLegacyRewardEvidence({
        quest: quest({ reward_model: 'quest_v2' }),
        leaderboard: lb([[1, 900]]),
        specialRows: [],
        ...baseArgs,
      }),
    ).toThrow('not a legacy reward model');
  });

  it('refuses a quest that is not closed', () => {
    expect(() =>
      buildLegacyRewardEvidence({
        quest: quest(),
        leaderboard: lb([[1, 900]]),
        specialRows: [],
        reviewedBy: baseArgs.reviewedBy,
        reviewReference: baseArgs.reviewReference,
        now: new Date('2026-06-15T00:00:00.000Z'), // inside the window => open
      }),
    ).toThrow('must be "close"');
  });

  it('accepts an explicit status arg overriding date derivation', () => {
    expect(() =>
      buildLegacyRewardEvidence({
        quest: quest(),
        leaderboard: lb([[1, 900]]),
        specialRows: [],
        reviewedBy: baseArgs.reviewedBy,
        reviewReference: baseArgs.reviewReference,
        status: 'open',
      }),
    ).toThrow('must be "close"');
  });

  it('refuses empty rewards', () => {
    expect(() =>
      buildLegacyRewardEvidence({
        quest: quest({ rewards: [] }),
        leaderboard: lb([[1, 900]]),
        specialRows: [],
        ...baseArgs,
      }),
    ).toThrow('no rank rewards');
  });

  it('refuses duplicate ranks', () => {
    expect(() =>
      buildLegacyRewardEvidence({
        quest: quest({
          rewards: [
            { rank: 1, reward: 1000, currency: 'THB' },
            { rank: 1, reward: 500, currency: 'THB' },
          ],
        }),
        leaderboard: lb([
          [1, 900],
          [2, 400],
        ]),
        specialRows: [],
        ...baseArgs,
      }),
    ).toThrow('duplicate rank');
  });

  it('refuses a negative reward', () => {
    expect(() =>
      buildLegacyRewardEvidence({
        quest: quest({
          rewards: [
            { rank: 1, reward: 1000, currency: 'THB' },
            { rank: 2, reward: -5, currency: 'THB' },
          ],
        }),
        leaderboard: lb([
          [1, 900],
          [2, 400],
        ]),
        specialRows: [],
        ...baseArgs,
      }),
    ).toThrow('negative reward');
  });

  it('refuses a non-canonical (non-uppercase) currency', () => {
    expect(() =>
      buildLegacyRewardEvidence({
        quest: quest({ rewards: [{ rank: 1, reward: 100, currency: 'usd' }] }),
        leaderboard: lb([[1, 900]]),
        specialRows: [],
        ...baseArgs,
      }),
    ).toThrow('non-canonical currency');
  });

  it('refuses a zero-point winner unless allowZeroPointWinners is set', () => {
    const args = {
      quest: quest({ rewards: [{ rank: 1, reward: 100, currency: 'THB' }] }),
      leaderboard: lb([[1, 0]]),
      specialRows: [],
      ...baseArgs,
    };
    expect(() => buildLegacyRewardEvidence(args)).toThrow(
      'non-positive leaderboard points',
    );
    const evidence = buildLegacyRewardEvidence({
      ...args,
      allowZeroPointWinners: true,
    });
    const rank = evidence.manifests.find((m) => m.reward_type === 'rank')!;
    expect(rank.recipients).toEqual([
      { user_id: uid(1), amount: 100, rank: 1, currency: 'THB' },
    ]);
  });

  it('refuses a tie that straddles a funded-rank boundary (some funded, some not)', () => {
    // ranks 1..2 funded; positions 1 and 2 tied at 400 => rank2 funded, rank3 not
    expect(() =>
      buildLegacyRewardEvidence({
        quest: quest(),
        leaderboard: lb([
          [1, 900],
          [2, 400],
          [3, 400],
        ]),
        specialRows: [],
        ...baseArgs,
      }),
    ).toThrow('tie-straddle');
  });

  it('refuses a tie among funded ranks (ambiguous winner ordering) and reports the cohort', () => {
    let caught: Error | undefined;
    try {
      buildLegacyRewardEvidence({
        quest: quest(),
        leaderboard: lb([
          [1, 900],
          [2, 900],
          [3, 100],
        ]),
        specialRows: [],
        ...baseArgs,
      });
    } catch (error) {
      caught = error as Error;
    }
    expect(caught).toBeDefined();
    expect(caught!.message).toContain('tie-straddle');
    expect(caught!.message).toContain('900');
    expect(caught!.message).toContain(uid(1));
    expect(caught!.message).toContain(uid(2));
  });

  it('does NOT refuse a tie confined entirely to the unfunded tail', () => {
    const evidence = buildLegacyRewardEvidence({
      quest: quest(),
      leaderboard: lb([
        [1, 900],
        [2, 400],
        [3, 100],
        [4, 100],
      ]),
      specialRows: [],
      ...baseArgs,
    });
    const rank = evidence.manifests.find((m) => m.reward_type === 'rank')!;
    expect(rank.recipients.map((r) => r.rank)).toEqual([1, 2]);
  });

  it('refuses when reviewed_by is blank', () => {
    expect(() =>
      buildLegacyRewardEvidence({
        quest: quest(),
        leaderboard: lb([
          [1, 900],
          [2, 400],
        ]),
        specialRows: [],
        reviewedBy: '   ',
        reviewReference: baseArgs.reviewReference,
        now: CLOSED_NOW,
      }),
    ).toThrow('reviewed_by is required');
  });

  it('refuses duplicate special-next-round recipients', () => {
    expect(() =>
      buildLegacyRewardEvidence({
        quest: quest(),
        leaderboard: lb([
          [1, 900],
          [2, 400],
        ]),
        specialRows: [
          { user_id: uid(1), amount: 80 },
          { user_id: uid(1), amount: 30 },
        ],
        ...baseArgs,
      }),
    ).toThrow('duplicate special-next-round recipient');
  });
});

describe('buildLegacyRewardEvidence > omit vs empty', () => {
  it('omits funded ranks that have no leaderboard participant (never fabricates a winner)', () => {
    const evidence = buildLegacyRewardEvidence({
      quest: quest(), // ranks 1 and 2
      leaderboard: lb([[1, 900]]), // only one participant
      specialRows: [{ user_id: uid(1), amount: 80 }],
      ...baseArgs,
    });
    const rank = evidence.manifests.find((m) => m.reward_type === 'rank')!;
    expect(rank.recipients).toEqual([
      { user_id: uid(1), amount: 1000, rank: 1, currency: 'THB' },
    ]);
    expect(rank.no_recipient_reason).toBeUndefined();
  });

  it('emits an empty rank manifest with a no_recipient_reason when nobody qualifies', () => {
    const evidence = buildLegacyRewardEvidence({
      quest: quest(),
      leaderboard: [],
      specialRows: [],
      ...baseArgs,
    });
    const rank = evidence.manifests.find((m) => m.reward_type === 'rank')!;
    expect(rank.recipients).toEqual([]);
    expect(typeof rank.no_recipient_reason).toBe('string');
    expect(rank.no_recipient_reason!.length).toBeGreaterThan(0);

    const special = evidence.manifests.find(
      (m) => m.reward_type === 'special-next-round',
    )!;
    expect(special.recipients).toEqual([]);
    expect(typeof special.no_recipient_reason).toBe('string');
    expect(special.no_recipient_reason!.length).toBeGreaterThan(0);
  });

  it('never combines recipients with a no_recipient_reason', () => {
    const evidence = buildLegacyRewardEvidence({
      quest: quest(),
      leaderboard: lb([
        [1, 900],
        [2, 400],
      ]),
      specialRows: [{ user_id: uid(1), amount: 80 }],
      ...baseArgs,
    });
    for (const manifest of evidence.manifests) {
      if (manifest.recipients.length > 0) {
        expect(manifest.no_recipient_reason).toBeUndefined();
      }
    }
  });
});

describe('leaderboard snapshot hash', () => {
  it('selectFundedRankEntries returns funded winners in rank order', () => {
    const entries = selectFundedRankEntries(quest().rewards!, [
      { user_id: uid(1), point: 900 },
      { user_id: uid(2), point: 400 },
      { user_id: uid(3), point: 100 },
    ]);
    expect(entries).toEqual([
      { user_id: uid(1), point: 900 },
      { user_id: uid(2), point: 400 },
    ]);
  });

  it('is deterministic for identical funded slices', () => {
    const a = selectFundedRankEntries(quest().rewards!, [
      { user_id: uid(1), point: 900 },
      { user_id: uid(2), point: 400 },
    ]);
    const b = selectFundedRankEntries(quest().rewards!, [
      { user_id: uid(1), point: 900 },
      { user_id: uid(2), point: 400 },
      { user_id: uid(9), point: 1 }, // unfunded tail must not change the hash
    ]);
    expect(computeLeaderboardSnapshotHash(a)).toBe(
      computeLeaderboardSnapshotHash(b),
    );
  });

  it('changes when a funded winner or point changes', () => {
    const a = computeLeaderboardSnapshotHash([{ user_id: uid(1), point: 900 }]);
    const b = computeLeaderboardSnapshotHash([{ user_id: uid(1), point: 901 }]);
    const c = computeLeaderboardSnapshotHash([{ user_id: uid(2), point: 900 }]);
    expect(a).not.toBe(b);
    expect(a).not.toBe(c);
  });

  it('produces a 64-char hex sha256 digest', () => {
    const hash = computeLeaderboardSnapshotHash([
      { user_id: uid(1), point: 900 },
    ]);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('assertLeaderboardSortedDesc', () => {
  it('throws when the leaderboard is not sorted by point descending', () => {
    expect(() =>
      assertLeaderboardSortedDesc([
        { user_id: uid(1), point: 100 },
        { user_id: uid(2), point: 900 },
      ]),
    ).toThrow(/not sorted|descending/i);
  });

  it('accepts a descending leaderboard, allowing equal-point ties', () => {
    expect(() =>
      assertLeaderboardSortedDesc([
        { user_id: uid(1), point: 900 },
        { user_id: uid(2), point: 900 },
        { user_id: uid(3), point: 100 },
      ]),
    ).not.toThrow();
  });

  it('accepts empty and single-row leaderboards', () => {
    expect(() => assertLeaderboardSortedDesc([])).not.toThrow();
    expect(() =>
      assertLeaderboardSortedDesc([{ user_id: uid(1), point: 5 }]),
    ).not.toThrow();
  });
});

describe('computeGeneratorSnapshotHash (funded rank + special slice)', () => {
  it('changes when a special-next-round amount changes (special drift is detectable)', () => {
    const a = computeGeneratorSnapshotHash({
      fundedRankEntries: [{ user_id: uid(1), point: 900 }],
      specialEntries: [{ user_id: uid(1), amount: 80 }],
    });
    const b = computeGeneratorSnapshotHash({
      fundedRankEntries: [{ user_id: uid(1), point: 900 }],
      specialEntries: [{ user_id: uid(1), amount: 81 }],
    });
    expect(a).not.toBe(b);
  });

  it('changes when a special recipient identity or ordering changes', () => {
    const a = computeGeneratorSnapshotHash({
      fundedRankEntries: [],
      specialEntries: [
        { user_id: uid(1), amount: 80 },
        { user_id: uid(2), amount: 30 },
      ],
    });
    const identityChanged = computeGeneratorSnapshotHash({
      fundedRankEntries: [],
      specialEntries: [
        { user_id: uid(9), amount: 80 },
        { user_id: uid(2), amount: 30 },
      ],
    });
    const orderChanged = computeGeneratorSnapshotHash({
      fundedRankEntries: [],
      specialEntries: [
        { user_id: uid(2), amount: 30 },
        { user_id: uid(1), amount: 80 },
      ],
    });
    expect(a).not.toBe(identityChanged);
    expect(a).not.toBe(orderChanged);
  });

  it('changes when the funded-rank slice changes', () => {
    const a = computeGeneratorSnapshotHash({
      fundedRankEntries: [{ user_id: uid(1), point: 900 }],
      specialEntries: [],
    });
    const b = computeGeneratorSnapshotHash({
      fundedRankEntries: [{ user_id: uid(2), point: 900 }],
      specialEntries: [],
    });
    expect(a).not.toBe(b);
  });

  it('is stable for identical funded + special slices', () => {
    const funded = [{ user_id: uid(1), point: 900 }];
    const special = [{ user_id: uid(1), amount: 80 }];
    expect(
      computeGeneratorSnapshotHash({
        fundedRankEntries: funded,
        specialEntries: special,
      }),
    ).toBe(
      computeGeneratorSnapshotHash({
        fundedRankEntries: [...funded],
        specialEntries: [...special],
      }),
    );
  });

  it('produces a 64-char hex sha256 digest', () => {
    expect(
      computeGeneratorSnapshotHash({
        fundedRankEntries: [],
        specialEntries: [],
      }),
    ).toMatch(/^[0-9a-f]{64}$/);
  });
});
