import { createHash } from 'node:crypto';

import * as cli from './missing-orders.cli';
import { runMissingOrdersMigration } from './missing-orders.migration';
import {
  MISSING_ORDERS_SEED_APPLY_CONFIRMATION,
  MISSING_ORDERS_SEED_CLEANUP_CONFIRMATION,
} from './missing-orders.seed';

const USER_ID = '507f1f77bcf86cd799439011';
const OFFER_ID = '507f1f77bcf86cd799439012';
const MARKER = 'issue-351-development-0123456789abcdef';

function makeRuntime() {
  const canonical: Record<string, unknown>[] = [];
  const seedRecords = new Map<string, Record<string, unknown>>();
  const runtime = {
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
    readReportFile: jest.fn(),
    statReportFile: jest.fn().mockResolvedValue({ size: 1024 }),
    createRollbackJournal: jest.fn().mockResolvedValue({
      append: jest.fn().mockResolvedValue(undefined),
      close: jest.fn().mockResolvedValue(undefined),
    }),
    now: () => new Date('2026-07-17T04:00:00.000Z'),
    createMigrationStore: () => ({
      readLegacy: jest.fn().mockResolvedValue([]),
      readCanonical: jest.fn().mockImplementation(async () => canonical),
      resolveOffersByObjectId: jest.fn().mockResolvedValue([]),
      resolveOffersBySource: jest.fn().mockResolvedValue([]),
      resolveUserById: jest.fn().mockResolvedValue(null),
      insertCanonical: jest.fn(),
      replaceCanonical: jest.fn(),
    }),
    createSeedStore: () => ({
      async upsertBySeedRecordKey(record: Record<string, unknown>) {
        const key = String(record.seed_record_key);
        const created = !seedRecords.has(key);
        seedRecords.set(key, record);
        return { created };
      },
      async deleteByExactMarker(filter: { seed_marker: string }) {
        let deleted = 0;
        for (const [key, record] of seedRecords) {
          if (record.seed_marker === filter.seed_marker) {
            seedRecords.delete(key);
            deleted += 1;
          }
        }
        return deleted;
      },
    }),
    createRollbackStore: () => ({
      readCanonicalById: jest.fn().mockResolvedValue(null),
      deleteCanonical: jest.fn().mockResolvedValue(false),
      restoreCanonical: jest.fn().mockResolvedValue(false),
    }),
    findSeedUser: jest.fn().mockResolvedValue({
      _id: USER_ID,
      mobile: '+66812345678',
    }),
    findSeedOffer: jest.fn().mockResolvedValue({
      _id: OFFER_ID,
      source: 'involve',
      offer_id: 5031,
      offer_name: 'Example Store',
    }),
    seedRecords,
  };
  return runtime;
}

async function makeApplyReportWithJournalChange() {
  const canonical: Record<string, any>[] = [];
  return runMissingOrdersMigration(
    {
      async readLegacy(collection: 'missionorders' | 'missingorders') {
        return collection === 'missingorders'
          ? [
              {
                _id: 'journal-source-1',
                user_id: USER_ID,
                source: 'involve',
                offer_id: 5031,
                order_id: 'JOURNAL-ORDER-1',
                order_amount: 100,
                updatedAt: new Date('2026-07-17T03:00:00.000Z'),
              },
            ]
          : [];
      },
      async readCanonical() {
        return canonical;
      },
      async resolveOffersByObjectId() {
        return [];
      },
      async resolveOffersBySource() {
        return [
          {
            _id: OFFER_ID,
            source: 'involve',
            offer_id: 5031,
            offer_name: 'Journal Store',
          },
        ];
      },
      async resolveUserById() {
        return { _id: USER_ID, mobile: '+66812345678' };
      },
      async insertCanonical(document: Record<string, any>) {
        canonical.push(document);
        return document._id;
      },
      async replaceCanonical() {
        return false;
      },
    },
    {
      apply: true,
      now: new Date('2026-07-17T04:00:00.000Z'),
      runId: 'journal-terminal-state',
      execution: { target: 'development', databaseIdentity: 'gogocash' },
    },
  );
}

describe('compiled missing-orders operational CLI', () => {
  it('exports one executable dispatcher and the Mongo CAS filter builder', () => {
    expect(typeof cli.executeMissingOrdersCli).toBe('function');
    expect(typeof cli.buildMissingOrdersMigrationCasFilter).toBe('function');
  });

  it.each(['migrate', 'rollback'] as const)(
    'emits byte-exact pretty %s output and rejects stdout above 50 MiB',
    (command) => {
      const result = { command, ok: true, nested: { value: 'exact' } };
      const expected = Buffer.from(`${JSON.stringify(result, null, 2)}\n`);

      expect(cli.serializeMissingOrdersCliOutput(result)).toEqual(expected);
      expect(() =>
        cli.serializeMissingOrdersCliOutput({
          command,
          payload: 'x'.repeat(cli.MAX_MISSING_ORDERS_CLI_OUTPUT_BYTES),
        }),
      ).toThrow(`${command} stdout exceeds the 50 MiB safety limit`);
    },
  );

  it('builds a dynamically exact preimage CAS filter over every value and the complete key set', () => {
    const preimage = {
      _id: 'legacy-1',
      user_id: 'user-1',
      offer_id: 'offer-1',
      orderId: 'ORDER-BEFORE',
      amount: '250.50',
      note: 'before',
      attachments: ['private://before.jpg'],
      status: 'pending',
    };

    expect(
      cli.buildMissingOrdersMigrationCasFilter('legacy-1', preimage),
    ).toEqual({
      _id: 'legacy-1',
      $expr: {
        $setEquals: [
          { $objectToArray: '$$ROOT' },
          {
            $literal: Object.entries(preimage).map(([key, value]) => ({
              k: key,
              v: value,
            })),
          },
        ],
      },
    });
  });

  it('fails closed when a preimage contains an undefined value that cannot be compared exactly', () => {
    expect(() =>
      cli.buildMissingOrdersMigrationCasFilter('legacy-1', {
        _id: 'legacy-1',
        note: undefined,
      }),
    ).toThrow('Cannot compare undefined migration preimage value at note');
  });

  it('handles help before environment or database checks', async () => {
    const runtime = makeRuntime();

    await expect(
      cli.executeMissingOrdersCli(['--help'], {}, runtime as never),
    ).resolves.toEqual({
      command: 'help',
      output: expect.stringContaining(
        'dist/admin/missing-orders/missing-orders.cli.js',
      ),
    });
    expect(runtime.connect).not.toHaveBeenCalled();
  });

  it('executes migration dry-run, apply, and a zero-write rerun through the compiled dispatcher', async () => {
    const runtime = makeRuntime();
    const env = { MONGO_URI: 'mongodb://example.invalid/gogocash' };

    const dryRun = await cli.executeMissingOrdersCli(
      ['migrate', '--target=development', '--dry-run', '--run-id=dry'],
      env,
      runtime as never,
    );
    expect(dryRun).toMatchObject({
      command: 'migrate',
      target: 'development',
      mode: 'dry-run',
      applied: { inserted: 0, updated: 0 },
    });

    const applyArgs = [
      'migrate',
      '--target=development',
      '--apply',
      `--confirm=${cli.MISSING_ORDERS_MIGRATION_APPLY_CONFIRMATION}`,
      '--rollback-journal=/restricted/migration-reverse-cas.ndjson',
    ];
    const firstApply = await cli.executeMissingOrdersCli(
      applyArgs,
      env,
      runtime as never,
    );
    const rerun = await cli.executeMissingOrdersCli(
      [...applyArgs, '--run-id=rerun'],
      env,
      runtime as never,
    );
    expect(firstApply).toMatchObject({ command: 'migrate', mode: 'apply' });
    expect(rerun).toMatchObject({
      command: 'migrate',
      mode: 'apply',
      applied: { inserted: 0, updated: 0, errors: 0 },
    });
    expect(runtime.connect).toHaveBeenCalledTimes(3);
    expect(runtime.disconnect).toHaveBeenCalledTimes(3);
  });

  it('executes idempotent seed apply and exact cleanup through the compiled dispatcher', async () => {
    const runtime = makeRuntime();
    const env = { MONGO_URI: 'mongodb://example.invalid/gogocash' };
    const applyArgs = [
      'seed',
      '--target=development',
      `--marker=${MARKER}`,
      `--user-id=${USER_ID}`,
      `--offer-id=${OFFER_ID}`,
      '--apply',
      `--confirm=${MISSING_ORDERS_SEED_APPLY_CONFIRMATION}`,
    ];

    const first = await cli.executeMissingOrdersCli(
      applyArgs,
      env,
      runtime as never,
    );
    const rerun = await cli.executeMissingOrdersCli(
      applyArgs,
      env,
      runtime as never,
    );
    const cleanup = await cli.executeMissingOrdersCli(
      [
        'seed',
        '--target=development',
        `--marker=${MARKER}`,
        '--cleanup',
        `--confirm=${MISSING_ORDERS_SEED_CLEANUP_CONFIRMATION}`,
      ],
      env,
      runtime as never,
    );

    expect(first).toMatchObject({
      command: 'seed',
      mode: 'apply',
      created: 4,
      updated: 0,
    });
    expect(rerun).toMatchObject({
      command: 'seed',
      mode: 'apply',
      created: 0,
      updated: 4,
    });
    expect(cleanup).toMatchObject({
      command: 'seed',
      mode: 'cleanup',
      deleted: 4,
      cleanupFilter: { seed_marker: MARKER },
    });
    expect(runtime.seedRecords.size).toBe(0);
  });

  it('rejects write modes before connecting when confirmation is absent', async () => {
    const runtime = makeRuntime();
    const env = { MONGO_URI: 'mongodb://example.invalid/gogocash' };

    await expect(
      cli.executeMissingOrdersCli(
        ['migrate', '--target=development', '--apply'],
        env,
        runtime as never,
      ),
    ).rejects.toThrow(cli.MISSING_ORDERS_MIGRATION_APPLY_CONFIRMATION);
    await expect(
      cli.executeMissingOrdersCli(
        ['seed', '--target=development', `--marker=${MARKER}`, '--cleanup'],
        env,
        runtime as never,
      ),
    ).rejects.toThrow(MISSING_ORDERS_SEED_CLEANUP_CONFIRMATION);
    expect(runtime.connect).not.toHaveBeenCalled();
  });

  it('requires a non-empty database identity before apply creates evidence or connects', async () => {
    const runtime = makeRuntime();

    await expect(
      cli.executeMissingOrdersCli(
        [
          'migrate',
          '--target=development',
          '--apply',
          `--confirm=${cli.MISSING_ORDERS_MIGRATION_APPLY_CONFIRMATION}`,
          '--rollback-journal=/restricted/reverse-cas.ndjson',
        ],
        { MONGO_URI: 'mongodb://example.invalid/' },
        runtime as never,
      ),
    ).rejects.toThrow('non-empty database identity');
    expect(runtime.createRollbackJournal).not.toHaveBeenCalled();
    expect(runtime.connect).not.toHaveBeenCalled();
  });

  it('requires a non-empty matching database identity before rollback connects', async () => {
    const runtime = makeRuntime();
    const authority = Buffer.from(JSON.stringify({}));
    runtime.readReportFile.mockResolvedValue(authority);
    runtime.statReportFile.mockResolvedValue({ size: authority.byteLength });

    await expect(
      cli.executeMissingOrdersCli(
        [
          'rollback',
          '--target=development',
          '--report=/restricted/apply.json',
          `--report-sha256=${createHash('sha256').update(authority).digest('hex')}`,
          '--dry-run',
        ],
        { MONGO_URI: 'mongodb://example.invalid/' },
        runtime as never,
      ),
    ).rejects.toThrow('non-empty database identity');
    expect(runtime.connect).not.toHaveBeenCalled();
  });

  it('rejects a rollback report bound to a different target before connecting', async () => {
    const runtime = makeRuntime();
    const applyReport = await runMissingOrdersMigration(
      runtime.createMigrationStore(),
      {
        apply: true,
        now: runtime.now(),
        runId: 'wrong-target',
        execution: { target: 'staging', databaseIdentity: 'gogocash' },
      },
    );
    const bytes = Buffer.from(JSON.stringify(applyReport));
    runtime.readReportFile.mockResolvedValue(bytes);
    runtime.statReportFile.mockResolvedValue({ size: bytes.byteLength });

    await expect(
      cli.executeMissingOrdersCli(
        [
          'rollback',
          '--target=development',
          '--report=/restricted/apply.json',
          `--report-sha256=${createHash('sha256').update(bytes).digest('hex')}`,
        ],
        { MONGO_URI: 'mongodb://example.invalid/gogocash' },
        runtime as never,
      ),
    ).rejects.toThrow('does not match --target=development');
    expect(runtime.connect).not.toHaveBeenCalled();
  });

  it('uses the fsynced append-only journal as executable rollback authority', async () => {
    const runtime = makeRuntime();
    const applyReport = await runMissingOrdersMigration(
      runtime.createMigrationStore(),
      {
        apply: true,
        now: runtime.now(),
        runId: 'journal-authority',
        execution: { target: 'development', databaseIdentity: 'gogocash' },
      },
    );
    const journal = [
      JSON.stringify({
        kind: 'missing-orders-reverse-cas-journal',
        version: 1,
        runId: applyReport.runId,
        generatedAt: applyReport.generatedAt,
        execution: applyReport.execution,
      }),
      ...applyReport.rollback.changes.map((change) =>
        JSON.stringify({ kind: 'change', change }),
      ),
      '',
    ].join('\n');
    const bytes = Buffer.from(journal);
    runtime.readReportFile.mockResolvedValue(bytes);
    runtime.statReportFile.mockResolvedValue({ size: bytes.byteLength });

    await expect(
      cli.executeMissingOrdersCli(
        [
          'rollback',
          '--target=development',
          '--journal=/restricted/reverse-cas.ndjson',
          `--journal-sha256=${createHash('sha256').update(bytes).digest('hex')}`,
          '--dry-run',
        ],
        { MONGO_URI: 'mongodb://example.invalid/gogocash' },
        runtime as never,
      ),
    ).resolves.toMatchObject({
      command: 'rollback',
      sourceAuthority: 'journal',
      mode: 'dry-run',
    });
  });

  it('recovers from only a malformed unterminated journal tail', async () => {
    const runtime = makeRuntime();
    const applyReport = await makeApplyReportWithJournalChange();
    const change = applyReport.rollback.changes[0];
    const header = JSON.stringify({
      kind: 'missing-orders-reverse-cas-journal',
      version: 1,
      runId: applyReport.runId,
      generatedAt: applyReport.generatedAt,
      execution: applyReport.execution,
    });
    const bytes = Buffer.from(
      `${header}\n${JSON.stringify({ kind: 'change', change })}\n{"kind":"commit","canonicalId":"torn`,
    );
    runtime.readReportFile.mockResolvedValue(bytes);
    runtime.statReportFile.mockResolvedValue({ size: bytes.byteLength });

    await expect(
      cli.executeMissingOrdersCli(
        [
          'rollback',
          '--target=development',
          '--journal=/restricted/torn-tail.ndjson',
          `--journal-sha256=${createHash('sha256').update(bytes).digest('hex')}`,
          '--dry-run',
        ],
        { MONGO_URI: 'mongodb://example.invalid/gogocash' },
        runtime as never,
      ),
    ).resolves.toMatchObject({
      command: 'rollback',
      sourceAuthority: 'journal',
      mode: 'dry-run',
      applied: { deleted: 0, restored: 0 },
      skipped: { alreadyReverted: 1 },
    });
  });

  it.each([
    ['commit then not_applied', ['commit', 'not_applied']],
    ['not_applied then commit', ['not_applied', 'commit']],
    ['duplicate commit', ['commit', 'commit']],
    ['duplicate not_applied', ['not_applied', 'not_applied']],
  ] as const)('rejects %s journal terminal records', async (_label, states) => {
    const runtime = makeRuntime();
    const applyReport = await makeApplyReportWithJournalChange();
    const change = applyReport.rollback.changes[0];
    const header = JSON.stringify({
      kind: 'missing-orders-reverse-cas-journal',
      version: 1,
      runId: applyReport.runId,
      generatedAt: applyReport.generatedAt,
      execution: applyReport.execution,
    });
    const journal = [
      header,
      JSON.stringify({ kind: 'change', change }),
      ...states.map((kind) =>
        JSON.stringify({ kind, canonicalId: change.canonicalId }),
      ),
      '',
    ].join('\n');
    const bytes = Buffer.from(journal);
    runtime.readReportFile.mockResolvedValue(bytes);
    runtime.statReportFile.mockResolvedValue({ size: bytes.byteLength });

    await expect(
      cli.executeMissingOrdersCli(
        [
          'rollback',
          '--target=development',
          '--journal=/restricted/duplicate-terminal.ndjson',
          `--journal-sha256=${createHash('sha256').update(bytes).digest('hex')}`,
          '--dry-run',
        ],
        { MONGO_URI: 'mongodb://example.invalid/gogocash' },
        runtime as never,
      ),
    ).rejects.toThrow(
      `Rollback journal canonicalId ${change.canonicalId} has multiple terminal records`,
    );
    expect(runtime.connect).not.toHaveBeenCalled();
  });

  it.each([
    ['newline-terminated', (header: string) => `${header}\n{"kind":"commit"\n`],
    [
      'interior',
      (header: string) =>
        `${header}\n{"kind":"commit"\n${JSON.stringify({ kind: 'commit', canonicalId: 'later' })}`,
    ],
  ])('rejects a malformed %s journal record', async (_label, journal) => {
    const runtime = makeRuntime();
    const header = JSON.stringify({
      kind: 'missing-orders-reverse-cas-journal',
      version: 1,
      runId: 'malformed-journal',
      generatedAt: runtime.now(),
      execution: { target: 'development', databaseIdentity: 'gogocash' },
    });
    const bytes = Buffer.from(journal(header));
    runtime.readReportFile.mockResolvedValue(bytes);
    runtime.statReportFile.mockResolvedValue({ size: bytes.byteLength });

    await expect(
      cli.executeMissingOrdersCli(
        [
          'rollback',
          '--target=development',
          '--journal=/restricted/malformed.ndjson',
          `--journal-sha256=${createHash('sha256').update(bytes).digest('hex')}`,
          '--dry-run',
        ],
        { MONGO_URI: 'mongodb://example.invalid/gogocash' },
        runtime as never,
      ),
    ).rejects.toThrow('Rollback journal record 1 is not valid JSON');
    expect(runtime.connect).not.toHaveBeenCalled();
  });

  it('returns a built apply result even when disconnect fails after the migration', async () => {
    const runtime = makeRuntime();
    runtime.disconnect.mockRejectedValueOnce(new Error('network teardown'));

    const result = await cli.executeMissingOrdersCli(
      [
        'migrate',
        '--target=development',
        '--apply',
        `--confirm=${cli.MISSING_ORDERS_MIGRATION_APPLY_CONFIRMATION}`,
        '--rollback-journal=/restricted/reverse-cas.ndjson',
      ],
      { MONGO_URI: 'mongodb://example.invalid/gogocash' },
      runtime as never,
    );

    expect(result).toMatchObject({
      command: 'migrate',
      mode: 'apply',
      ok: false,
      operationalErrors: [expect.stringContaining('disconnect failed')],
    });
    expect(
      runtime.createRollbackJournal.mock.invocationCallOrder[0],
    ).toBeLessThan(runtime.connect.mock.invocationCallOrder[0]);
  });

  it('validates the exact apply report file before rollback dry-run or apply', async () => {
    const runtime = makeRuntime();
    const applyReport = await runMissingOrdersMigration(
      runtime.createMigrationStore(),
      {
        apply: true,
        now: runtime.now(),
        runId: 'cli-rollback-source',
        execution: {
          target: 'development',
          databaseIdentity: 'gogocash',
        },
      },
    );
    const reportBytes = Buffer.from(JSON.stringify(applyReport));
    const reportSha256 = createHash('sha256').update(reportBytes).digest('hex');
    runtime.readReportFile.mockResolvedValue(reportBytes);
    const env = { MONGO_URI: 'mongodb://example.invalid/gogocash' };
    const baseArgs = [
      'rollback',
      '--target=development',
      '--report=/restricted/migration-apply.json',
      `--report-sha256=${reportSha256}`,
    ];

    await expect(
      cli.executeMissingOrdersCli(
        [...baseArgs, '--dry-run'],
        env,
        runtime as never,
      ),
    ).resolves.toMatchObject({
      command: 'rollback',
      target: 'development',
      mode: 'dry-run',
      sourceRunId: 'cli-rollback-source',
    });
    await expect(
      cli.executeMissingOrdersCli(
        [...baseArgs, '--apply'],
        env,
        runtime as never,
      ),
    ).rejects.toThrow(cli.MISSING_ORDERS_ROLLBACK_APPLY_CONFIRMATION);
    await expect(
      cli.executeMissingOrdersCli(
        [
          ...baseArgs.slice(0, -1),
          `--report-sha256=${'0'.repeat(64)}`,
          '--dry-run',
        ],
        env,
        runtime as never,
      ),
    ).rejects.toThrow('authority SHA-256 mismatch');

    const tamperedReport = JSON.parse(reportBytes.toString('utf8'));
    tamperedReport.checksums.canonical.after = 'f'.repeat(64);
    const tamperedBytes = Buffer.from(JSON.stringify(tamperedReport));
    const tamperedSha256 = createHash('sha256')
      .update(tamperedBytes)
      .digest('hex');
    runtime.readReportFile.mockResolvedValueOnce(tamperedBytes);
    await expect(
      cli.executeMissingOrdersCli(
        [
          ...baseArgs.slice(0, -1),
          `--report-sha256=${tamperedSha256}`,
          '--dry-run',
        ],
        env,
        runtime as never,
      ),
    ).rejects.toThrow('rollback manifest checksum mismatch');
    expect(runtime.connect).toHaveBeenCalledTimes(1);
    expect(runtime.disconnect).toHaveBeenCalledTimes(1);
  });
});
