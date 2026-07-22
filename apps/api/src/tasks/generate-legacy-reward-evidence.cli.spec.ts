/**
 * CLI-guard coverage for the operator-invoked legacy-reward EVIDENCE generator.
 *
 * These tests exercise the pure orchestration pieces (parseArgs + runGenerate)
 * of scripts/generate-legacy-reward-evidence.ts with fully mocked IO deps. They
 * assert the money-safety guardrails that gate the never-yet-enabled tool:
 *   - the QUEST_WINNER_GENERATOR_ENABLED opt-in gate,
 *   - the two-read leaderboard/special drift refuse,
 *   - the --apply confirm-quest / confirm-leaderboard-hash equality refuse,
 *   - the --attest-exclusions-reviewed governance gate,
 *   - the dry-run "writes nothing to disk" invariant.
 * Each test isolates a single branch and would fail if that guard were removed
 * or inverted.
 *
 * NOTE: co-located under src/ (not scripts/) because this repo's jest config
 * uses rootDir=src and only discovers specs beneath it; the tool under test is
 * imported from ../../scripts (mirrors legacy-reward-reconciliation.cli.spec.ts).
 */
import {
  GENERATOR_GOVERNANCE_WARNING,
  parseArgs,
  runGenerate,
  type GenerateDeps,
} from '../../scripts/generate-legacy-reward-evidence';

const uid = (n: number): string => n.toString(16).padStart(24, '0');
const QUEST_ID = 'a'.repeat(24);
const OTHER_QUEST_ID = 'b'.repeat(24);
const NOW = new Date('2026-07-01T00:00:00.000Z');

function questDoc(overrides: Record<string, unknown> = {}) {
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

interface OptionOverrides {
  mode?: 'dry-run' | 'apply';
  out?: string;
  confirmQuest?: string;
  confirmLeaderboardHash?: string;
  attestExclusionsReviewed?: boolean;
  allowZeroPointWinners?: boolean;
}

function baseOptions(overrides: OptionOverrides = {}) {
  return {
    mode: 'dry-run' as const,
    questId: QUEST_ID,
    reviewedBy: 'ops@gogocash.co',
    reviewReference: 'PAYOUT-2026-06',
    allowZeroPointWinners: false,
    attestExclusionsReviewed: false,
    ...overrides,
  };
}

function makeDeps(overrides: Partial<GenerateDeps> = {}): GenerateDeps {
  return {
    env: { QUEST_WINNER_GENERATOR_ENABLED: 'true' },
    now: NOW,
    loadQuest: jest.fn(async () => questDoc()),
    fetchLeaderboard: jest.fn(async () => [
      { user_id: uid(1), point: 900 },
      { user_id: uid(2), point: 400 },
      { user_id: uid(3), point: 100 },
    ]),
    fetchSpecial: jest.fn(async () => [
      { user_id: uid(1), special_point_next_round: 80 },
      { user_id: uid(2), special_point_next_round: 30 },
    ]),
    fetchExistingManifests: jest.fn(async () => []),
    writeFile: jest.fn(async () => undefined),
    stdout: jest.fn(),
    ...overrides,
  };
}

const asMock = (fn: unknown) => fn as jest.Mock;

describe('generate-legacy-reward-evidence > parseArgs', () => {
  const REQ = [
    `--quest-id=${QUEST_ID}`,
    '--reviewed-by=ops@gogocash.co',
    '--review-reference=PAYOUT-2026-06',
  ];

  it('defaults to dry-run when neither --apply nor --dry-run is given', () => {
    expect(parseArgs(REQ)).toMatchObject({ mode: 'dry-run', questId: QUEST_ID });
  });

  it('refuses --apply and --dry-run together', () => {
    expect(() => parseArgs([...REQ, '--apply', '--dry-run'])).toThrow(
      /either|both/i,
    );
  });

  it('requires --quest-id, --reviewed-by and --review-reference', () => {
    expect(() => parseArgs([])).toThrow(/--quest-id/);
    expect(() => parseArgs([`--quest-id=${QUEST_ID}`])).toThrow(/--reviewed-by/);
    expect(() =>
      parseArgs([`--quest-id=${QUEST_ID}`, '--reviewed-by=ops']),
    ).toThrow(/--review-reference/);
  });

  it('refuses --apply without --out', () => {
    expect(() =>
      parseArgs([
        ...REQ,
        '--apply',
        `--confirm-quest=${QUEST_ID}`,
        '--confirm-leaderboard-hash=abc',
        '--attest-exclusions-reviewed',
      ]),
    ).toThrow(/--out/);
  });

  it('refuses --apply without the confirm flags', () => {
    expect(() =>
      parseArgs([
        ...REQ,
        '--apply',
        '--out=/tmp/evidence.json',
        '--attest-exclusions-reviewed',
      ]),
    ).toThrow(/confirm-quest|confirm-leaderboard-hash/i);
  });

  it('refuses --apply without --attest-exclusions-reviewed (governance gate)', () => {
    expect(() =>
      parseArgs([
        ...REQ,
        '--apply',
        '--out=/tmp/evidence.json',
        `--confirm-quest=${QUEST_ID}`,
        '--confirm-leaderboard-hash=abc',
      ]),
    ).toThrow(/attest-exclusions-reviewed/i);
  });

  it('accepts a fully-formed --apply invocation', () => {
    expect(
      parseArgs([
        ...REQ,
        '--apply',
        '--out=/tmp/evidence.json',
        `--confirm-quest=${QUEST_ID}`,
        '--confirm-leaderboard-hash=abc',
        '--attest-exclusions-reviewed',
      ]),
    ).toMatchObject({
      mode: 'apply',
      out: '/tmp/evidence.json',
      confirmQuest: QUEST_ID,
      confirmLeaderboardHash: 'abc',
      attestExclusionsReviewed: true,
    });
  });
});

describe('generate-legacy-reward-evidence > runGenerate gate', () => {
  it.each([
    ['unset', undefined],
    ['empty', ''],
    ['false', 'false'],
    ['1', '1'],
    ['yes', 'yes'],
  ])(
    'refuses and touches no IO when the gate is %s',
    async (_label, raw) => {
      const deps = makeDeps({
        env: raw === undefined ? {} : { QUEST_WINNER_GENERATOR_ENABLED: raw },
      });
      await expect(runGenerate(baseOptions(), deps)).rejects.toThrow(
        /QUEST_WINNER_GENERATOR_ENABLED/,
      );
      expect(deps.loadQuest).not.toHaveBeenCalled();
      expect(deps.fetchLeaderboard).not.toHaveBeenCalled();
      expect(deps.fetchSpecial).not.toHaveBeenCalled();
      expect(deps.writeFile).not.toHaveBeenCalled();
    },
  );

  it('proceeds when the gate is exactly "true"', async () => {
    const deps = makeDeps();
    const result = await runGenerate(baseOptions(), deps);
    expect(result.mode).toBe('dry-run');
    expect(deps.loadQuest).toHaveBeenCalledTimes(1);
  });
});

describe('generate-legacy-reward-evidence > runGenerate drift refuse', () => {
  it('refuses when the funded-rank leaderboard slice drifts between reads', async () => {
    let call = 0;
    const deps = makeDeps({
      fetchLeaderboard: jest.fn(async () => {
        call += 1;
        return call === 1
          ? [
              { user_id: uid(1), point: 900 },
              { user_id: uid(2), point: 400 },
            ]
          : [
              // rank-1 winner changed => funded slice differs
              { user_id: uid(9), point: 900 },
              { user_id: uid(2), point: 400 },
            ];
      }),
    });
    await expect(runGenerate(baseOptions(), deps)).rejects.toThrow(
      /drift|drifted/i,
    );
    expect(deps.writeFile).not.toHaveBeenCalled();
  });

  it('refuses when the special-next-round slice drifts between reads', async () => {
    let call = 0;
    const deps = makeDeps({
      fetchSpecial: jest.fn(async () => {
        call += 1;
        return call === 1
          ? [{ user_id: uid(1), special_point_next_round: 80 }]
          : [{ user_id: uid(1), special_point_next_round: 81 }];
      }),
    });
    await expect(runGenerate(baseOptions(), deps)).rejects.toThrow(
      /drift|drifted/i,
    );
    expect(deps.writeFile).not.toHaveBeenCalled();
  });

  it('does NOT refuse when only the unfunded leaderboard tail drifts', async () => {
    let call = 0;
    const deps = makeDeps({
      fetchLeaderboard: jest.fn(async () => {
        call += 1;
        // ranks 1..2 funded; only the rank-3 tail row differs across reads
        return call === 1
          ? [
              { user_id: uid(1), point: 900 },
              { user_id: uid(2), point: 400 },
              { user_id: uid(3), point: 100 },
            ]
          : [
              { user_id: uid(1), point: 900 },
              { user_id: uid(2), point: 400 },
              { user_id: uid(7), point: 90 },
            ];
      }),
    });
    await expect(runGenerate(baseOptions(), deps)).resolves.toMatchObject({
      mode: 'dry-run',
    });
  });
});

describe('generate-legacy-reward-evidence > dry-run is write-free + loud', () => {
  it('derives evidence, prints a report, and writes NOTHING to disk', async () => {
    const deps = makeDeps();
    const result = await runGenerate(baseOptions(), deps);
    expect(result.mode).toBe('dry-run');
    expect(result.wrote).toBe(false);
    expect(deps.writeFile).not.toHaveBeenCalled();
    expect(result.evidence.manifests).toHaveLength(2);
    expect(asMock(deps.stdout)).toHaveBeenCalled();
  });

  it('loudly warns that exclusions/KYC are not auto-derived and require attestation', async () => {
    const deps = makeDeps();
    const result = await runGenerate(baseOptions(), deps);
    expect(result.report.governance_warning).toBe(GENERATOR_GOVERNANCE_WARNING);
    expect(GENERATOR_GOVERNANCE_WARNING).toMatch(/exclusion/i);
    expect(GENERATOR_GOVERNANCE_WARNING).toMatch(/KYC/i);
    expect(GENERATOR_GOVERNANCE_WARNING).toMatch(/attest/i);
    const printed = asMock(deps.stdout)
      .mock.calls.map((c) => String(c[0]))
      .join('');
    expect(printed).toContain('governance_warning');
    expect(printed).toContain('--attest-exclusions-reviewed');
  });
});

describe('generate-legacy-reward-evidence > apply confirmations', () => {
  it('writes the evidence file when quest + freshly-computed hash match and attested', async () => {
    const dry = await runGenerate(baseOptions(), makeDeps());
    const deps = makeDeps();
    const result = await runGenerate(
      baseOptions({
        mode: 'apply',
        out: '/tmp/evidence.json',
        confirmQuest: QUEST_ID,
        confirmLeaderboardHash: dry.leaderboardHash,
        attestExclusionsReviewed: true,
      }),
      deps,
    );
    expect(result.wrote).toBe(true);
    expect(asMock(deps.writeFile)).toHaveBeenCalledTimes(1);
    const [path, data] = asMock(deps.writeFile).mock.calls[0];
    expect(path).toBe('/tmp/evidence.json');
    const parsed = JSON.parse(String(data));
    expect(parsed.quest_id).toBe(QUEST_ID);
    expect(parsed.completeness_attestation).toBe(
      'reviewed_complete_recipient_and_exclusion_set',
    );
    expect(parsed.manifests).toHaveLength(2);
  });

  it('refuses --apply when --confirm-leaderboard-hash != freshly computed hash', async () => {
    const deps = makeDeps();
    await expect(
      runGenerate(
        baseOptions({
          mode: 'apply',
          out: '/tmp/evidence.json',
          confirmQuest: QUEST_ID,
          confirmLeaderboardHash: 'deadbeef',
          attestExclusionsReviewed: true,
        }),
        deps,
      ),
    ).rejects.toThrow(/confirm-leaderboard-hash|freshly computed/i);
    expect(deps.writeFile).not.toHaveBeenCalled();
  });

  it('refuses --apply when --confirm-quest != --quest-id', async () => {
    const dry = await runGenerate(baseOptions(), makeDeps());
    const deps = makeDeps();
    await expect(
      runGenerate(
        baseOptions({
          mode: 'apply',
          out: '/tmp/evidence.json',
          confirmQuest: OTHER_QUEST_ID,
          confirmLeaderboardHash: dry.leaderboardHash,
          attestExclusionsReviewed: true,
        }),
        deps,
      ),
    ).rejects.toThrow(/confirm-quest/i);
    expect(deps.writeFile).not.toHaveBeenCalled();
  });

  it('refuses --apply without exclusion attestation even if confirmations match', async () => {
    const dry = await runGenerate(baseOptions(), makeDeps());
    const deps = makeDeps();
    await expect(
      runGenerate(
        baseOptions({
          mode: 'apply',
          out: '/tmp/evidence.json',
          confirmQuest: QUEST_ID,
          confirmLeaderboardHash: dry.leaderboardHash,
          attestExclusionsReviewed: false,
        }),
        deps,
      ),
    ).rejects.toThrow(/attest/i);
    expect(deps.writeFile).not.toHaveBeenCalled();
  });
});
