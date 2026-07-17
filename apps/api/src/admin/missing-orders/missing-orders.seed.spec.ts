import {
  assertMissingOrdersSeedCommandAllowed,
  buildMissingOrdersSeedCleanupFilter,
  buildMissingOrdersSeedRecords,
  MISSING_ORDERS_SEED_APPLY_CONFIRMATION,
  MISSING_ORDERS_SEED_CLEANUP_CONFIRMATION,
  parseMissingOrdersSeedArgs,
  runMissingOrdersSeed,
} from './missing-orders.seed';

const MARKER = 'issue-351-development-0123456789abcdef';
const NOW = new Date('2026-07-17T04:00:00.000Z');
const USER = {
  _id: '507f1f77bcf86cd799439011',
  username: 'QA Claim Seeker',
  email: 'qa-claim-seeker@example.invalid',
  mobile: '+66000000000',
};
const OFFER = {
  _id: '507f1f77bcf86cd799439012',
  source: 'involve',
  offer_id: 77123,
  offer_name: 'Issue 351 QA Merchant',
};

function command(
  overrides: Partial<ReturnType<typeof parseMissingOrdersSeedArgs>> = {},
) {
  return {
    mode: 'dry-run' as const,
    target: 'development' as const,
    marker: MARKER,
    userId: USER._id,
    offerId: OFFER._id,
    confirmation: undefined,
    help: false,
    ...overrides,
  };
}

class MemorySeedStore {
  readonly records = new Map<string, Record<string, unknown>>();
  readonly upsertFilters: Record<string, unknown>[] = [];
  readonly deleteFilters: Record<string, unknown>[] = [];

  async upsertBySeedRecordKey(record: Record<string, unknown>) {
    const key = String(record.seed_record_key);
    const created = !this.records.has(key);
    this.upsertFilters.push({ seed_record_key: key });
    this.records.set(key, { ...record });
    return { created };
  }

  async deleteByExactMarker(filter: Record<string, unknown>) {
    this.deleteFilters.push(filter);
    let deleted = 0;
    for (const [key, record] of this.records) {
      if (record.seed_marker === filter.seed_marker) {
        this.records.delete(key);
        deleted += 1;
      }
    }
    return deleted;
  }
}

describe('missing conversions QA seed contract', () => {
  it('defaults to read-only dry-run and parses explicit apply/cleanup modes', () => {
    expect(
      parseMissingOrdersSeedArgs([
        '--target=development',
        `--marker=${MARKER}`,
        `--user-id=${USER._id}`,
        `--offer-id=${OFFER._id}`,
      ]),
    ).toEqual(command());

    expect(
      parseMissingOrdersSeedArgs([
        '--apply',
        '--target=staging',
        '--marker=issue-351-staging-fedcba9876543210',
        `--user-id=${USER._id}`,
        `--offer-id=${OFFER._id}`,
        `--confirm=${MISSING_ORDERS_SEED_APPLY_CONFIRMATION}`,
      ]),
    ).toMatchObject({
      mode: 'apply',
      target: 'staging',
      confirmation: MISSING_ORDERS_SEED_APPLY_CONFIRMATION,
    });

    expect(
      parseMissingOrdersSeedArgs([
        '--cleanup',
        '--target=development',
        `--marker=${MARKER}`,
        `--confirm=${MISSING_ORDERS_SEED_CLEANUP_CONFIRMATION}`,
      ]),
    ).toMatchObject({ mode: 'cleanup', userId: undefined, offerId: undefined });
    expect(parseMissingOrdersSeedArgs(['--help'])).toMatchObject({
      help: true,
    });
    expect(() => parseMissingOrdersSeedArgs(['--apply', '--cleanup'])).toThrow(
      'Choose exactly one write mode',
    );
  });

  it('fails closed unless writes have exact confirmation, target, marker, and non-production proof', () => {
    expect(() =>
      assertMissingOrdersSeedCommandAllowed(
        command({ mode: 'apply', confirmation: 'yes' }),
        {},
      ),
    ).toThrow(MISSING_ORDERS_SEED_APPLY_CONFIRMATION);
    expect(() =>
      assertMissingOrdersSeedCommandAllowed(
        command({
          mode: 'cleanup',
          confirmation: MISSING_ORDERS_SEED_APPLY_CONFIRMATION,
        }),
        {},
      ),
    ).toThrow(MISSING_ORDERS_SEED_CLEANUP_CONFIRMATION);
    expect(() =>
      assertMissingOrdersSeedCommandAllowed(
        command({ marker: 'issue-351-development-reused' }),
        {},
      ),
    ).toThrow('unique marker');
    expect(() =>
      assertMissingOrdersSeedCommandAllowed(
        command({ mode: 'apply', target: 'production' as never }),
        {},
      ),
    ).toThrow('development or staging');
    expect(() =>
      assertMissingOrdersSeedCommandAllowed(
        command({ mode: 'apply', target: 'development' }),
        { RAILWAY_ENVIRONMENT_NAME: 'production' },
      ),
    ).toThrow('production');
    expect(() =>
      assertMissingOrdersSeedCommandAllowed(
        command({ mode: 'apply', target: 'development' }),
        { NODE_ENV: 'production' },
      ),
    ).toThrow('cannot prove a non-production target');
    expect(() =>
      assertMissingOrdersSeedCommandAllowed(
        command({ mode: 'apply', target: 'development' }),
        { NODE_ENV: 'production', RAILWAY_ENVIRONMENT_NAME: 'staging' },
      ),
    ).toThrow('does not match');

    expect(() =>
      assertMissingOrdersSeedCommandAllowed(
        command({
          mode: 'apply',
          confirmation: MISSING_ORDERS_SEED_APPLY_CONFIRMATION,
        }),
        {},
      ),
    ).not.toThrow();
    expect(() =>
      assertMissingOrdersSeedCommandAllowed(
        command({
          mode: 'apply',
          target: 'staging',
          marker: 'issue-351-staging-0123456789abcdef',
          confirmation: MISSING_ORDERS_SEED_APPLY_CONFIRMATION,
        }),
        { NODE_ENV: 'production', RAILWAY_ENVIRONMENT_NAME: 'staging' },
      ),
    ).not.toThrow();
  });

  it('builds exactly four canonical marker-owned records without money writes or evidence', () => {
    const records = buildMissingOrdersSeedRecords({
      marker: MARKER,
      user: USER,
      offer: OFFER,
      now: NOW,
    });

    expect(records).toHaveLength(4);
    expect(records.map((record) => record.status).sort()).toEqual(
      ['approved', 'pending', 'rejected', 'under_review'].sort(),
    );
    expect(new Set(records.map((record) => record.seed_record_key)).size).toBe(
      4,
    );

    for (const record of records) {
      expect(record).toMatchObject({
        user_id: USER._id,
        offer_id: OFFER._id,
        customer_snapshot: {
          name: USER.username,
          email: USER.email,
          phone: USER.mobile,
        },
        offer_snapshot: {
          source: OFFER.source,
          provider_offer_id: OFFER.offer_id,
          name: OFFER.offer_name,
        },
        schema_version: 2,
        seed_marker: MARKER,
        evidence_refs: [],
        currency: 'THB',
      });
      expect(record.dedupe_key).toMatch(/^[a-f\d]{64}$/);
      for (const forbidden of [
        'wallet',
        'wallet_balance',
        'points',
        'cashback',
        'commission',
        'transaction_id',
        'conversion_id',
      ]) {
        expect(record).not.toHaveProperty(forbidden);
      }
    }

    const noteHistory = records.find(
      (record) => record.status === 'under_review',
    );
    expect(noteHistory?.notes).toEqual([
      expect.objectContaining({ text: 'Claim received by QA.' }),
      expect.objectContaining({ text: 'Source-aware offer mapping verified.' }),
    ]);
  });

  it('uses deterministic idempotency keys and an exact marker-only cleanup filter', () => {
    const input = { marker: MARKER, user: USER, offer: OFFER, now: NOW };
    const first = buildMissingOrdersSeedRecords(input);
    const second = buildMissingOrdersSeedRecords({
      ...input,
      now: new Date('2026-07-18T04:00:00.000Z'),
    });

    expect(second.map((record) => record.seed_record_key)).toEqual(
      first.map((record) => record.seed_record_key),
    );
    expect(buildMissingOrdersSeedCleanupFilter(MARKER)).toEqual({
      seed_marker: MARKER,
    });
    expect(Object.keys(buildMissingOrdersSeedCleanupFilter(MARKER))).toEqual([
      'seed_marker',
    ]);
  });

  it('performs zero writes in dry-run, idempotent upserts on apply, and exact cleanup', async () => {
    const store = new MemorySeedStore();
    const input = { marker: MARKER, user: USER, offer: OFFER, now: NOW };

    const dryRun = await runMissingOrdersSeed(store, {
      mode: 'dry-run',
      ...input,
    });
    expect(dryRun).toMatchObject({ mode: 'dry-run', planned: 4, written: 0 });
    expect(store.upsertFilters).toEqual([]);
    expect(store.deleteFilters).toEqual([]);

    const firstApply = await runMissingOrdersSeed(store, {
      mode: 'apply',
      ...input,
    });
    expect(firstApply).toMatchObject({
      mode: 'apply',
      planned: 4,
      written: 4,
      created: 4,
      updated: 0,
    });
    expect(store.records.size).toBe(4);

    const secondApply = await runMissingOrdersSeed(store, {
      mode: 'apply',
      ...input,
    });
    expect(secondApply).toMatchObject({ created: 0, updated: 4 });
    expect(store.records.size).toBe(4);

    const cleanup = await runMissingOrdersSeed(store, {
      mode: 'cleanup',
      ...input,
    });
    expect(cleanup).toMatchObject({ mode: 'cleanup', deleted: 4 });
    expect(store.deleteFilters).toEqual([{ seed_marker: MARKER }]);
    expect(store.records.size).toBe(0);
  });
});
