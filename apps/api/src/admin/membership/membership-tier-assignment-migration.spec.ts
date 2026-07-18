import {
  MEMBERSHIP_TIER_ASSIGNMENT_APPLY_CONFIRMATION,
  MEMBERSHIP_TIER_ASSIGNMENT_MISSING_FILTER,
  executeMembershipTierAssignmentMigration,
  mongoUriLooksProduction,
  redactMongoCredentials,
} from './membership-tier-assignment-migration';

type Row = Record<string, unknown>;

function makeRuntime(seed: Row[] = []) {
  const rows = seed.map((row) => ({ ...row }));
  const inventory = async () => {
    let missing = 0;
    let valid = 0;
    let malformed = 0;
    for (const row of rows) {
      if (
        !Object.prototype.hasOwnProperty.call(row, 'tier_assignment_started_at')
      ) {
        missing += 1;
      } else if (
        row.tier_assignment_started_at instanceof Date &&
        !Number.isNaN(row.tier_assignment_started_at.getTime())
      ) {
        valid += 1;
      } else {
        malformed += 1;
      }
    }
    return { total: rows.length, missing, valid, malformed };
  };
  return {
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
    databaseName: jest.fn().mockReturnValue('gogocash-staging'),
    now: () => new Date('2026-07-17T13:00:00.000Z'),
    randomUUID: () => '11111111-2222-4333-8444-555555555555',
    createStore: () => ({
      inventory,
      backfillMissing: jest.fn(async (baseline: Date) => {
        let matched = 0;
        for (const row of rows) {
          if (
            !Object.prototype.hasOwnProperty.call(
              row,
              'tier_assignment_started_at',
            )
          ) {
            matched += 1;
            row.tier_assignment_started_at = new Date(baseline);
          }
        }
        return { matched, modified: matched };
      }),
    }),
    rows,
  };
}

const baseline = '2026-07-17T12:55:00.000Z';
const baseArgs = [
  '--target=staging',
  '--confirm-database=gogocash-staging',
  `--baseline=${baseline}`,
];
const env = {
  MONGO_URI:
    'mongodb://operator:super-secret@mongo-staging.internal:27017/gogocash-staging?replicaSet=rs0',
};

describe('membership tier-assignment boundary migration', () => {
  it('defaults to a zero-write dry run with auditable issue, UTC, run, and remaining counts', async () => {
    const runtime = makeRuntime([
      { _id: 'missing' },
      {
        _id: 'valid',
        tier_assignment_started_at: new Date('2026-07-16T00:00:00.000Z'),
      },
    ]);

    await expect(
      executeMembershipTierAssignmentMigration(baseArgs, env, runtime),
    ).resolves.toEqual({
      issue: 353,
      operation: 'membership-tier-assignment-boundary-backfill',
      mode: 'dry-run',
      run_id: '11111111-2222-4333-8444-555555555555',
      captured_at_utc: '2026-07-17T13:00:00.000Z',
      baseline_utc: baseline,
      target: 'staging',
      database: 'gogocash-staging',
      before: { total: 2, missing: 1, valid: 1, malformed: 0 },
      applied: { matched: 0, modified: 0 },
      rerun: null,
      after: { total: 2, missing: 1, valid: 1, malformed: 0 },
      remaining: { missing: 1, malformed: 0 },
      remaining_missing: 1,
      remaining_malformed: 0,
      ready_to_enable_task_v2: false,
    });
    expect(runtime.rows[0]).not.toHaveProperty('tier_assignment_started_at');
  });

  it('applies only to absent boundaries at the captured rollout baseline and proves the immediate rerun is a no-op', async () => {
    const existing = new Date('2026-07-01T00:00:00.000Z');
    const runtime = makeRuntime([
      { _id: 'missing-a', status: 'cancelled' },
      { _id: 'missing-b', status: 'expired' },
      { _id: 'existing', tier_assignment_started_at: existing },
    ]);

    const result = await executeMembershipTierAssignmentMigration(
      [
        ...baseArgs,
        '--apply',
        '--backup-confirmed',
        `--confirm=${MEMBERSHIP_TIER_ASSIGNMENT_APPLY_CONFIRMATION}`,
      ],
      env,
      runtime,
    );

    expect(result).toMatchObject({
      mode: 'apply',
      baseline_utc: baseline,
      before: { total: 3, missing: 2, valid: 1, malformed: 0 },
      applied: { matched: 2, modified: 2 },
      rerun: { matched: 0, modified: 0 },
      after: { total: 3, missing: 0, valid: 3, malformed: 0 },
      remaining: { missing: 0, malformed: 0 },
      ready_to_enable_task_v2: true,
    });
    expect(runtime.rows[0]?.tier_assignment_started_at).toEqual(
      new Date(baseline),
    );
    expect(runtime.rows[1]?.tier_assignment_started_at).toEqual(
      new Date(baseline),
    );
    expect(runtime.rows[2]?.tier_assignment_started_at).toBe(existing);
  });

  it('requires explicit apply, backup, baseline, exact database, and production override guards', async () => {
    const apply = [
      ...baseArgs,
      '--apply',
      `--confirm=${MEMBERSHIP_TIER_ASSIGNMENT_APPLY_CONFIRMATION}`,
    ];
    await expect(
      executeMembershipTierAssignmentMigration(apply, env, makeRuntime()),
    ).rejects.toThrow('--backup-confirmed');
    await expect(
      executeMembershipTierAssignmentMigration(
        baseArgs.filter((argument) => !argument.startsWith('--baseline=')),
        env,
        makeRuntime(),
      ),
    ).rejects.toThrow('--baseline');
    await expect(
      executeMembershipTierAssignmentMigration(
        [
          '--target=staging',
          '--confirm-database=gogocash-staging',
          '--baseline=2026-07-01T00:00:00.000Z',
        ],
        env,
        makeRuntime(),
      ),
    ).rejects.toThrow('no more than 15 minutes old');
    await expect(
      executeMembershipTierAssignmentMigration(
        [
          '--target=staging',
          '--confirm-database=gogocash-staging',
          '--baseline=2026-07-17T13:00:00.001Z',
        ],
        env,
        makeRuntime(),
      ),
    ).rejects.toThrow('not in the future');

    const wrongDatabase = makeRuntime();
    wrongDatabase.databaseName.mockReturnValue('gogocash-dev');
    await expect(
      executeMembershipTierAssignmentMigration(baseArgs, env, wrongDatabase),
    ).rejects.toThrow('database confirmation');

    const productionArgs = [
      '--target=production',
      '--confirm-database=gogocash',
      `--baseline=${baseline}`,
    ];
    await expect(
      executeMembershipTierAssignmentMigration(
        productionArgs,
        { MONGO_URI: 'mongodb://mongo.internal:27017/gogocash' },
        makeRuntime(),
      ),
    ).rejects.toThrow('--allow-production');
  });

  it('fails apply before writes when an existing boundary is malformed', async () => {
    const runtime = makeRuntime([
      { _id: 'missing' },
      { _id: 'malformed', tier_assignment_started_at: null },
    ]);
    await expect(
      executeMembershipTierAssignmentMigration(
        [
          ...baseArgs,
          '--apply',
          '--backup-confirmed',
          `--confirm=${MEMBERSHIP_TIER_ASSIGNMENT_APPLY_CONFIRMATION}`,
        ],
        env,
        runtime,
      ),
    ).rejects.toThrow('malformed');
    expect(runtime.rows[0]).not.toHaveProperty('tier_assignment_started_at');
  });

  it('exposes the absent-only CAS filter and redacts URI credentials', () => {
    expect(MEMBERSHIP_TIER_ASSIGNMENT_MISSING_FILTER).toEqual({
      tier_assignment_started_at: { $exists: false },
    });
    expect(
      redactMongoCredentials(
        'connect mongodb+srv://operator:super-secret@cluster.example/gogocash failed',
      ),
    ).toBe(
      'connect mongodb+srv://[credentials-redacted]@cluster.example/gogocash failed',
    );
  });

  it('classifies the real URI host before connect and requires an override for a production-looking host', async () => {
    const runtime = makeRuntime();
    runtime.databaseName.mockReturnValue('test');
    const args = [
      '--target=staging',
      '--confirm-database=test',
      `--baseline=${baseline}`,
    ];
    const productionUri = 'mongodb+srv://gogocash.abcd1.mongodb.net/test';

    expect(mongoUriLooksProduction(productionUri)).toBe(true);
    expect(
      mongoUriLooksProduction(
        'mongodb+srv://operator:secret@gogocash-prod.internal.example/test',
      ),
    ).toBe(true);
    expect(
      mongoUriLooksProduction(
        'mongodb+srv://gogocash-staging.abcd1.mongodb.net/test',
      ),
    ).toBe(false);
    await expect(
      executeMembershipTierAssignmentMigration(
        args,
        { MONGO_URI: productionUri },
        runtime,
      ),
    ).rejects.toThrow('production-like MongoDB host');
    expect(runtime.connect).not.toHaveBeenCalled();

    await expect(
      executeMembershipTierAssignmentMigration(
        [...args, '--allow-production'],
        { MONGO_URI: productionUri },
        runtime,
      ),
    ).resolves.toMatchObject({ mode: 'dry-run', database: 'test' });
  });
});
