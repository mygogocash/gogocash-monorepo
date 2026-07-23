import { existsSync } from 'node:fs';
import { join } from 'node:path';

import * as migration from './missing-orders.migration';

const NOW = new Date('2026-07-17T00:00:00.000Z');
const USER_ID = '507f1f77bcf86cd799439011';
const OFFER_INVOLVE = '507f1f77bcf86cd799439012';
const OFFER_OPTIMISE = '507f1f77bcf86cd799439013';

type Row = Record<string, any>;

class MemoryMigrationStore {
  readonly inserts: Row[] = [];
  readonly replacements: { id: string; document: Row }[] = [];

  constructor(
    readonly legacy: { missionorders: Row[]; missingorders: Row[] },
    readonly canonical: Row[],
    readonly offers: Row[],
    readonly users: Row[] = [
      {
        _id: USER_ID,
        username: 'Claim Seeker',
        email: 'seeker@example.com',
        mobile: '+66812345678',
      },
    ],
  ) {}

  async readLegacy(collection: 'missionorders' | 'missingorders') {
    return this.legacy[collection].filter((row) => row.schema_version !== 2);
  }

  async readCanonical() {
    return this.canonical;
  }

  async resolveOffersByObjectId(id: string) {
    return this.offers.filter((offer) => String(offer._id) === id);
  }

  async resolveOffersBySource(source: string, providerOfferId: number) {
    return this.offers.filter(
      (offer) => offer.source === source && offer.offer_id === providerOfferId,
    );
  }

  async resolveUserById(id: string) {
    return this.users.find((user) => String(user._id) === id) ?? null;
  }

  async insertCanonical(document: Row) {
    const id = document._id ?? `canonical-${this.canonical.length + 1}`;
    const inserted = { ...document, _id: id };
    this.inserts.push(inserted);
    this.canonical.push(inserted);
    return id;
  }

  async replaceCanonical(id: string, document: Row, _preimage: Row) {
    const replacement = { ...document, _id: id };
    this.replacements.push({ id, document: replacement });
    const existing = this.canonical.findIndex((row) => String(row._id) === id);
    if (existing >= 0) this.canonical[existing] = replacement;
    else this.canonical.push(replacement);
    this.legacy.missionorders = this.legacy.missionorders.filter(
      (row) => String(row._id) !== id,
    );
    return true;
  }
}

function offer(
  id: string,
  source: string,
  providerOfferId: number,
  name: string,
) {
  return { _id: id, source, offer_id: providerOfferId, offer_name: name };
}

function legacyAdmin(overrides: Row = {}): Row {
  return {
    _id: 'legacy-admin-1',
    user_id: USER_ID,
    source: 'involve',
    offer_id: 77,
    offer_name: 'Involve Shop',
    order_id: 'ORDER-1',
    order_date: new Date('2026-07-01T00:00:00.000Z'),
    order_amount: 100,
    currency: 'THB',
    status: 'investigating',
    notes: [],
    createdAt: new Date('2026-07-01T01:00:00.000Z'),
    updatedAt: new Date('2026-07-03T01:00:00.000Z'),
    ...overrides,
  };
}

function legacyCustomer(overrides: Row = {}): Row {
  return {
    _id: 'legacy-customer-1',
    user_id: USER_ID,
    offer_id: OFFER_INVOLVE,
    orderId: 'ORDER-2',
    purchaseDate: '2026-07-02',
    amount: '250.50',
    note: 'Customer note',
    attachments: ['private://receipt-2.jpg'],
    status: 'pending',
    createdAt: new Date('2026-07-02T01:00:00.000Z'),
    updatedAt: new Date('2026-07-02T02:00:00.000Z'),
    ...overrides,
  };
}

function makeStore(input: {
  missionorders?: Row[];
  missingorders?: Row[];
  canonical?: Row[];
  offers?: Row[];
}) {
  return new MemoryMigrationStore(
    {
      missionorders: input.missionorders ?? [],
      missingorders: input.missingorders ?? [],
    },
    input.canonical ?? [],
    input.offers ?? [
      offer(OFFER_INVOLVE, 'involve', 77, 'Involve Shop'),
      offer(OFFER_OPTIMISE, 'optimise', 77, 'Optimise Shop'),
    ],
  );
}

describe('missing-orders canonical migration module', () => {
  it('exists as a testable module separate from the guarded CLI', () => {
    expect(existsSync(join(__dirname, 'missing-orders.migration.ts'))).toBe(
      true,
    );
    expect(typeof migration.buildMissionOrderDedupeKey).toBe('function');
    expect(typeof migration.mapLegacyMissionOrder).toBe('function');
    expect(typeof migration.runMissingOrdersMigration).toBe('function');
  });

  it('ships a loader-independent CLI entry inside the API SWC build tree', () => {
    expect(existsSync(join(__dirname, 'missing-orders.cli.ts'))).toBe(true);
  });

  it('maps legacy aliases into the canonical DTO and investigating into under_review', async () => {
    const store = makeStore({ missionorders: [legacyCustomer()] });

    const result = await migration.mapLegacyMissionOrder(
      { collection: 'missionorders', row: legacyCustomer() },
      store as never,
      { migratedAt: NOW },
    );

    expect(result).toEqual({
      ok: true,
      document: expect.objectContaining({
        user_id: USER_ID,
        offer_id: OFFER_INVOLVE,
        customer_snapshot: {
          name: 'Claim Seeker',
          email: 'seeker@example.com',
          phone: '+66812345678',
        },
        offer_snapshot: {
          source: 'involve',
          provider_offer_id: 77,
          name: 'Involve Shop',
        },
        order_id: 'ORDER-2',
        purchase_date: new Date('2026-07-02T00:00:00.000Z'),
        order_amount: 250.5,
        remarks: 'Customer note',
        evidence_refs: ['private://receipt-2.jpg'],
        status: 'pending',
        schema_version: 2,
        legacy_collection: 'missionorders',
        legacy_id: 'legacy-customer-1',
        dedupe_key: expect.stringMatching(/^[a-f0-9]{64}$/),
        migration_checksum: expect.stringMatching(/^[a-f0-9]{64}$/),
        migrated_at: NOW,
      }),
      sourceUpdatedAt: new Date('2026-07-02T02:00:00.000Z'),
    });

    const investigating = await migration.mapLegacyMissionOrder(
      { collection: 'missingorders', row: legacyAdmin() },
      store as never,
      { migratedAt: NOW },
    );
    expect(investigating).toMatchObject({
      ok: true,
      document: {
        status: 'under_review',
        purchase_date: new Date('2026-07-01T00:00:00.000Z'),
      },
    });
  });

  it('keeps equal provider numbers distinct by resolving explicit source plus offer_id', async () => {
    const store = makeStore({
      missingorders: [
        legacyAdmin({ _id: 'involve-row', source: 'involve' }),
        legacyAdmin({
          _id: 'optimise-row',
          source: 'optimise',
          order_id: 'ORDER-OPT',
        }),
      ],
    });

    const report = await migration.runMissingOrdersMigration(store as never, {
      apply: true,
      now: NOW,
      runId: 'source-aware',
    });

    expect(report.applied).toMatchObject({
      inserted: 2,
      updated: 0,
      quarantined: 0,
      errors: 0,
    });
    expect(store.inserts.map((row) => String(row.offer_id)).sort()).toEqual(
      [OFFER_INVOLVE, OFFER_OPTIMISE].sort(),
    );
    expect(
      store.inserts.map((row) => row.offer_snapshot.source).sort(),
    ).toEqual(['involve', 'optimise']);
  });

  it('defaults to dry-run and performs zero writes while reporting exact counts and checksums', async () => {
    const store = makeStore({ missingorders: [legacyAdmin()] });

    const report = await migration.runMissingOrdersMigration(store as never, {
      now: NOW,
      runId: 'dry-run',
    });

    expect(report.mode).toBe('dry-run');
    expect(store.inserts).toHaveLength(0);
    expect(store.replacements).toHaveLength(0);
    expect(report.sourceCounts).toEqual({
      missionorders: 0,
      missingorders: 1,
      total: 1,
    });
    expect(report.canonicalCounts).toEqual({
      before: 0,
      after: 0,
      projectedAfter: 1,
    });
    expect(report.planned).toMatchObject({
      inserted: 1,
      updated: 0,
      skipped: 0,
      quarantined: 0,
      errors: 0,
    });
    expect(report.applied).toMatchObject({ inserted: 0, updated: 0 });
    expect(report.checksums.legacy.missingorders).toMatch(/^[a-f0-9]{64}$/);
    expect(report.checksums.canonical.before).toMatch(/^[a-f0-9]{64}$/);
    expect(report.backup.collections).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'missingorders', count: 1 }),
        expect.objectContaining({ name: 'missionorders', count: 0 }),
      ]),
    );
    expect(report.rollback.changes).toEqual([]);
  });

  it('caps generated report evidence during collection before any mutation', async () => {
    const store = makeStore({
      missingorders: [
        legacyAdmin({
          _id: 'x'.repeat(migration.MAX_MISSING_ORDERS_REPORT_BYTES),
          user_id: undefined,
        }),
      ],
    });

    await expect(
      migration.runMissingOrdersMigration(store as never, {
        apply: true,
        now: NOW,
      }),
    ).rejects.toThrow(
      'Generated migration report exceeds the 50 MiB safety limit',
    );
    expect(store.inserts).toHaveLength(0);
    expect(store.replacements).toHaveLength(0);
  });

  it('fsync-journals the complete reverse-CAS change before using a preallocated insert id', async () => {
    const store = makeStore({ missingorders: [legacyAdmin()] });
    const append = jest.fn().mockResolvedValue(undefined);
    store.insertCanonical = jest.fn(async (document: Row) => {
      expect(append).toHaveBeenCalledTimes(1);
      expect(document._id).toHaveProperty('toHexString');
      return document._id;
    });

    const report = await migration.runMissingOrdersMigration(store as never, {
      apply: true,
      now: NOW,
      runId: 'journal-before-write',
      rollbackJournal: { append, close: jest.fn() },
    });

    expect(report.ok).toBe(true);
    expect(append).toHaveBeenCalledWith(
      expect.objectContaining({
        operation: 'delete_inserted',
        canonicalId: expect.stringMatching(/^[a-f0-9]{24}$/),
        afterDocumentEjson: expect.stringContaining('$oid'),
      }),
    );
  });

  it('returns the built failure report when the final verification read fails after a journaled write', async () => {
    const store = makeStore({ missingorders: [legacyAdmin()] });
    const originalReadCanonical = store.readCanonical.bind(store);
    store.readCanonical = jest
      .fn()
      .mockImplementationOnce(originalReadCanonical)
      .mockRejectedValueOnce(new Error('verification read disconnected'));
    const append = jest.fn().mockResolvedValue(undefined);

    const report = await migration.runMissingOrdersMigration(store as never, {
      apply: true,
      now: NOW,
      rollbackJournal: { append, close: jest.fn() },
    });

    expect(report.ok).toBe(false);
    expect(report.applied.errors).toBe(1);
    expect(report.malformed).toContainEqual(
      expect.objectContaining({
        reason: expect.stringContaining('final canonical read failed'),
      }),
    );
    expect(append).toHaveBeenCalledTimes(1);
  });

  it('quarantines missing, ambiguous, zero-match, and multiple-match numeric offer mappings', async () => {
    const store = makeStore({
      missingorders: [
        legacyAdmin({ _id: 'missing-source', source: undefined }),
        legacyAdmin({
          _id: 'ambiguous-source',
          source: ['involve', 'optimise'],
        }),
        legacyAdmin({ _id: 'zero-match', source: 'manual', offer_id: 999 }),
        legacyAdmin({ _id: 'multi-match', source: 'involve', offer_id: 88 }),
      ],
      offers: [
        offer(OFFER_INVOLVE, 'involve', 77, 'Involve Shop'),
        offer('507f1f77bcf86cd799439020', 'involve', 88, 'Duplicate A'),
        offer('507f1f77bcf86cd799439021', 'involve', 88, 'Duplicate B'),
      ],
    });

    const report = await migration.runMissingOrdersMigration(store as never, {
      apply: true,
      now: NOW,
      runId: 'quarantine',
    });

    expect(store.inserts).toHaveLength(0);
    expect(report.applied).toMatchObject({
      inserted: 0,
      updated: 0,
      quarantined: 4,
      errors: 0,
    });
    expect(report.quarantine.map((entry: Row) => entry.reason).sort()).toEqual([
      'ambiguous_offer_source',
      'missing_offer_source',
      'multiple_offer_matches',
      'offer_not_found',
    ]);
  });

  it('uses deterministic newer-row precedence and never overwrites a newer canonical claim', async () => {
    const dedupeKey = migration.buildMissionOrderDedupeKey(
      USER_ID,
      OFFER_INVOLVE,
      'ORDER-1',
    );
    const canonical = {
      _id: 'canonical-newer',
      schema_version: 2,
      dedupe_key: dedupeKey,
      legacy_collection: 'missionorders',
      legacy_id: 'other-origin',
      updatedAt: new Date('2026-07-10T00:00:00.000Z'),
      migrated_at: new Date('2026-07-05T00:00:00.000Z'),
    };
    const store = makeStore({
      missingorders: [
        legacyAdmin({ updatedAt: new Date('2026-07-03T00:00:00.000Z') }),
      ],
      canonical: [canonical],
    });

    const report = await migration.runMissingOrdersMigration(store as never, {
      apply: true,
      now: NOW,
      runId: 'newer-wins',
    });

    expect(report.applied).toMatchObject({
      inserted: 0,
      updated: 0,
      skipped: 1,
    });
    expect(store.replacements).toHaveLength(0);
    expect(store.canonical[0]).toBe(canonical);
    expect(report.conflicts).toEqual([
      expect.objectContaining({ reason: 'canonical_dedupe_conflict' }),
    ]);
  });

  it('does not merge two legacy rows that collide on provenance', async () => {
    const store = makeStore({
      missingorders: [
        legacyAdmin({ _id: 'duplicate-provenance' }),
        legacyAdmin({ _id: 'duplicate-provenance' }),
      ],
    });

    const report = await migration.runMissingOrdersMigration(store as never, {
      apply: true,
      now: NOW,
      runId: 'provenance-collision',
    });

    expect(store.inserts).toHaveLength(1);
    expect(report.applied).toMatchObject({ inserted: 1, quarantined: 1 });
    expect(report.conflicts).toEqual([
      expect.objectContaining({ reason: 'provenance_collision' }),
    ]);
  });

  it('is idempotent: rerunning the same provenance performs no writes', async () => {
    const store = makeStore({ missingorders: [legacyAdmin()] });

    const first = await migration.runMissingOrdersMigration(store as never, {
      apply: true,
      now: NOW,
      runId: 'first',
    });
    const second = await migration.runMissingOrdersMigration(store as never, {
      apply: true,
      now: new Date('2026-07-18T00:00:00.000Z'),
      runId: 'second',
    });

    expect(first.applied.inserted).toBe(1);
    expect(second.applied).toMatchObject({
      inserted: 0,
      updated: 0,
      skipped: 1,
      quarantined: 0,
      errors: 0,
    });
    expect(store.inserts).toHaveLength(1);
  });

  it('uses a deterministic timestamp fallback so timestamp-less rows are idempotent', async () => {
    const store = makeStore({
      missingorders: [
        legacyAdmin({ createdAt: undefined, updatedAt: undefined }),
      ],
    });

    const first = await migration.runMissingOrdersMigration(store as never, {
      apply: true,
      now: NOW,
      runId: 'timestamp-less-first',
    });
    const second = await migration.runMissingOrdersMigration(store as never, {
      apply: true,
      now: new Date('2026-07-18T00:00:00.000Z'),
      runId: 'timestamp-less-second',
    });

    expect(first.applied.inserted).toBe(1);
    expect(second.applied).toMatchObject({
      inserted: 0,
      updated: 0,
      skipped: 1,
      errors: 0,
    });
    expect(store.replacements).toHaveLength(0);
  });

  it('reserves the newest dedupe winner even when its write fails', async () => {
    const store = makeStore({
      missingorders: [
        legacyAdmin({
          _id: 'older-alias',
          updatedAt: new Date('2026-07-02T00:00:00.000Z'),
        }),
        legacyAdmin({
          _id: 'newer-alias',
          updatedAt: new Date('2026-07-04T00:00:00.000Z'),
        }),
      ],
    });
    store.insertCanonical = jest
      .fn()
      .mockRejectedValueOnce(new Error('simulated write failure'))
      .mockResolvedValueOnce('must-not-be-written');

    const report = await migration.runMissingOrdersMigration(store as never, {
      apply: true,
      now: NOW,
      runId: 'failed-winner',
    });

    expect(store.insertCanonical).toHaveBeenCalledTimes(1);
    expect(report.applied).toMatchObject({
      inserted: 0,
      updated: 0,
      skipped: 1,
      errors: 1,
    });
    expect(report.conflicts).toEqual([
      expect.objectContaining({
        legacyId: 'older-alias',
        reason: 'legacy_dedupe_conflict',
      }),
    ]);
  });

  it('upgrades legacy missionorders in place without inserting a duplicate _id', async () => {
    const store = makeStore({ missionorders: [legacyCustomer()] });

    const first = await migration.runMissingOrdersMigration(store as never, {
      apply: true,
      now: NOW,
      runId: 'missionorders-in-place',
    });
    const second = await migration.runMissingOrdersMigration(store as never, {
      apply: true,
      now: new Date('2026-07-18T00:00:00.000Z'),
      runId: 'missionorders-rerun',
    });

    expect(first.applied).toMatchObject({
      inserted: 0,
      updated: 1,
      skipped: 0,
      errors: 0,
    });
    expect(store.inserts).toHaveLength(0);
    expect(store.replacements).toHaveLength(1);
    expect(store.replacements[0]).toMatchObject({
      id: 'legacy-customer-1',
      document: {
        schema_version: 2,
        legacy_collection: 'missionorders',
        legacy_id: 'legacy-customer-1',
      },
    });
    expect(first.rollback.changes).toEqual([
      expect.objectContaining({
        operation: 'restore_replaced',
        canonicalId: 'legacy-customer-1',
        beforeDocumentEjson: expect.stringContaining('legacy-customer-1'),
      }),
    ]);
    expect(second.applied).toEqual({
      inserted: 0,
      updated: 0,
      skipped: 0,
      quarantined: 0,
      errors: 0,
    });
  });

  it('updates only an unchanged older canonical row with the same provenance', async () => {
    const dedupeKey = migration.buildMissionOrderDedupeKey(
      USER_ID,
      OFFER_INVOLVE,
      'ORDER-1',
    );
    const store = makeStore({
      missingorders: [
        legacyAdmin({
          note: 'new source note',
          updatedAt: new Date('2026-07-04T00:00:00.000Z'),
        }),
      ],
      canonical: [
        {
          _id: 'canonical-old',
          schema_version: 2,
          dedupe_key: dedupeKey,
          legacy_collection: 'missingorders',
          legacy_id: 'legacy-admin-1',
          migration_checksum: 'old-checksum',
          source_updated_at: new Date('2026-07-01T00:00:00.000Z'),
          migrated_at: new Date('2026-07-02T00:00:00.000Z'),
          updatedAt: new Date('2026-07-01T00:00:00.000Z'),
        },
      ],
    });

    const report = await migration.runMissingOrdersMigration(store as never, {
      apply: true,
      now: NOW,
      runId: 'safe-update',
    });

    expect(report.applied).toMatchObject({
      inserted: 0,
      updated: 1,
      skipped: 0,
    });
    expect(store.replacements).toHaveLength(1);
    expect(store.replacements[0]).toMatchObject({
      id: 'canonical-old',
      document: {
        legacy_collection: 'missingorders',
        legacy_id: 'legacy-admin-1',
        remarks: 'new source note',
      },
    });
  });

  it('reports a concurrent canonical workflow write as a CAS conflict without overwriting it', async () => {
    const dedupeKey = migration.buildMissionOrderDedupeKey(
      USER_ID,
      OFFER_INVOLVE,
      'ORDER-1',
    );
    const preimage = {
      _id: 'canonical-concurrent',
      __v: 3,
      schema_version: 2,
      dedupe_key: dedupeKey,
      legacy_collection: 'missingorders',
      legacy_id: 'legacy-admin-1',
      migration_checksum: 'old-checksum',
      source_updated_at: new Date('2026-07-01T00:00:00.000Z'),
      migrated_at: new Date('2026-07-02T00:00:00.000Z'),
      updatedAt: new Date('2026-07-01T00:00:00.000Z'),
      status: 'pending',
      notes: [],
    };
    const store = makeStore({
      missingorders: [
        legacyAdmin({ updatedAt: new Date('2026-07-04T00:00:00.000Z') }),
      ],
      canonical: [preimage],
    });
    store.replaceCanonical = jest.fn().mockResolvedValue(false);

    const report = await migration.runMissingOrdersMigration(store as never, {
      apply: true,
      now: NOW,
      runId: 'canonical-cas-conflict',
    });

    expect(store.replaceCanonical).toHaveBeenCalledWith(
      'canonical-concurrent',
      expect.any(Object),
      preimage,
    );
    expect(report.applied).toMatchObject({
      updated: 0,
      skipped: 1,
      errors: 0,
    });
    expect(report.conflicts).toContainEqual(
      expect.objectContaining({
        canonicalId: 'canonical-concurrent',
        reason: 'concurrent_write_conflict',
      }),
    );
    expect(report.rollback.changes).toEqual([
      expect.objectContaining({
        canonicalId: 'canonical-concurrent',
        journalState: 'not_applied',
      }),
    ]);
  });

  it('stops every later apply mutation and durably journals a failed CAS intent', async () => {
    const dedupeKey = migration.buildMissionOrderDedupeKey(
      USER_ID,
      OFFER_INVOLVE,
      'ORDER-1',
    );
    const store = makeStore({
      missionorders: [legacyCustomer()],
      missingorders: [
        legacyAdmin({
          _id: 'must-not-run',
          order_id: 'LATER',
          updatedAt: new Date('2026-07-01T00:00:00.000Z'),
        }),
      ],
      canonical: [
        {
          _id: 'canonical-concurrent',
          schema_version: 2,
          dedupe_key: dedupeKey,
          legacy_collection: 'missionorders',
          legacy_id: 'legacy-customer-1',
          migration_checksum: 'old-checksum',
          source_updated_at: new Date('2026-07-01T00:00:00.000Z'),
          migrated_at: new Date('2026-07-02T00:00:00.000Z'),
          updatedAt: new Date('2026-07-01T00:00:00.000Z'),
        },
      ],
    });
    store.replaceCanonical = jest.fn().mockResolvedValue(false);
    const append = jest.fn().mockResolvedValue(undefined);
    const markNotApplied = jest.fn().mockResolvedValue(undefined);

    const report = await migration.runMissingOrdersMigration(store as never, {
      apply: true,
      now: NOW,
      rollbackJournal: { append, markNotApplied, close: jest.fn() },
    });

    expect(store.replaceCanonical).toHaveBeenCalledTimes(1);
    expect(store.inserts).toHaveLength(0);
    expect(markNotApplied).toHaveBeenCalledWith('canonical-concurrent');
    expect(report).toMatchObject({
      ok: false,
      aborted: { reason: 'concurrent_write_conflict' },
      rollback: {
        changes: [
          expect.objectContaining({
            canonicalId: 'canonical-concurrent',
            journalState: 'not_applied',
          }),
        ],
      },
    });
  });

  it('keeps the CAS abort latched when not_applied journal finalization fails', async () => {
    const dedupeKey = migration.buildMissionOrderDedupeKey(
      USER_ID,
      OFFER_INVOLVE,
      'ORDER-1',
    );
    const store = makeStore({
      missionorders: [legacyCustomer()],
      missingorders: [
        legacyAdmin({
          _id: 'must-never-run-after-journal-failure',
          order_id: 'LATER',
          updatedAt: new Date('2026-07-01T00:00:00.000Z'),
        }),
      ],
      canonical: [
        {
          _id: 'canonical-concurrent',
          schema_version: 2,
          dedupe_key: dedupeKey,
          legacy_collection: 'missionorders',
          legacy_id: 'legacy-customer-1',
          migration_checksum: 'old-checksum',
          source_updated_at: new Date('2026-07-01T00:00:00.000Z'),
          migrated_at: new Date('2026-07-02T00:00:00.000Z'),
          updatedAt: new Date('2026-07-01T00:00:00.000Z'),
        },
      ],
    });
    store.replaceCanonical = jest.fn().mockResolvedValue(false);
    const markNotApplied = jest
      .fn()
      .mockRejectedValue(new Error('journal fsync failed'));

    const report = await migration.runMissingOrdersMigration(store as never, {
      apply: true,
      now: NOW,
      rollbackJournal: {
        append: jest.fn().mockResolvedValue(undefined),
        markNotApplied,
        close: jest.fn(),
      },
    });

    expect(store.replaceCanonical).toHaveBeenCalledTimes(1);
    expect(store.inserts).toHaveLength(0);
    expect(markNotApplied).toHaveBeenCalledWith('canonical-concurrent');
    expect(report).toMatchObject({
      ok: false,
      aborted: { reason: 'concurrent_write_conflict' },
      applied: { skipped: 1, errors: 1 },
      malformed: [
        expect.objectContaining({
          reason: expect.stringContaining(
            'journal not_applied finalization failed: journal fsync failed',
          ),
        }),
      ],
      rollback: { changes: [] },
    });
  });

  it('requires the exact legacy preimage before upgrading a timestamp-less missionorders row', async () => {
    const legacy = legacyCustomer({
      createdAt: undefined,
      updatedAt: undefined,
    });
    const store = makeStore({ missionorders: [legacy] });
    store.replaceCanonical = jest.fn().mockResolvedValue(false);

    const report = await migration.runMissingOrdersMigration(store as never, {
      apply: true,
      now: NOW,
      runId: 'legacy-cas-conflict',
    });

    expect(store.replaceCanonical).toHaveBeenCalledWith(
      'legacy-customer-1',
      expect.any(Object),
      legacy,
    );
    expect(report.applied).toMatchObject({
      updated: 0,
      skipped: 1,
      errors: 0,
    });
    expect(report.conflicts).toContainEqual(
      expect.objectContaining({
        canonicalId: 'legacy-customer-1',
        reason: 'concurrent_write_conflict',
      }),
    );
  });

  it('quarantines an unsafe exact preimage without writing or producing rollback metadata', async () => {
    const store = makeStore({ missionorders: [legacyCustomer()] });
    store.replaceCanonical = jest.fn().mockRejectedValue(
      Object.assign(new Error('unsafe undefined preimage'), {
        code: 'unsafe_missing_orders_preimage',
      }),
    );

    const report = await migration.runMissingOrdersMigration(store as never, {
      apply: true,
      now: NOW,
      runId: 'unsafe-preimage',
    });

    expect(report.planned).toMatchObject({ updated: 0, quarantined: 1 });
    expect(report.applied).toMatchObject({
      updated: 0,
      skipped: 0,
      quarantined: 1,
      errors: 0,
    });
    expect(report.quarantine).toContainEqual(
      expect.objectContaining({
        legacyCollection: 'missionorders',
        legacyId: 'legacy-customer-1',
        reason: 'unsafe_preimage',
      }),
    );
    expect(report.rollback.changes).toEqual([]);
  });

  it('reports malformed rows and records rollback metadata for every applied change', async () => {
    const store = makeStore({
      missingorders: [
        legacyAdmin({ _id: 'valid-row' }),
        legacyAdmin({
          _id: 'malformed-row',
          user_id: undefined,
          order_amount: 'not-a-number',
        }),
      ],
    });

    const report = await migration.runMissingOrdersMigration(store as never, {
      apply: true,
      now: NOW,
      runId: 'rollback-proof',
    });

    expect(report.applied).toMatchObject({ inserted: 1, errors: 1 });
    expect(report.malformed).toEqual([
      expect.objectContaining({
        legacyId: 'malformed-row',
        reason: expect.stringContaining('user_id'),
      }),
    ]);
    expect(report.rollback).toEqual(
      expect.objectContaining({
        runId: 'rollback-proof',
        changes: [
          expect.objectContaining({
            operation: 'delete_inserted',
            canonicalId: expect.any(String),
            provenance: {
              legacyCollection: 'missingorders',
              legacyId: 'valid-row',
            },
            afterChecksum: expect.stringMatching(/^[a-f0-9]{64}$/),
          }),
        ],
      }),
    );
  });
});
