import { Int32, Long } from 'mongodb';

import {
  runMissingOrdersMigration,
  runMissingOrdersRollback,
} from './missing-orders.migration';

const NOW = new Date('2026-07-17T00:00:00.000Z');
const USER_ID = '507f1f77bcf86cd799439011';
const OFFER_ID = '507f1f77bcf86cd799439012';

type Row = Record<string, any>;

function exact(value: unknown): string {
  return JSON.stringify(value, (_key, nested) =>
    nested && typeof nested === 'object' && 'toHexString' in nested
      ? nested.toHexString()
      : nested,
  );
}

class RollbackMemoryStore {
  readonly missionorders: Row[];
  readonly missingorders: Row[];
  writes = 0;

  constructor() {
    this.missionorders = [
      {
        _id: 'legacy-customer-1',
        user_id: USER_ID,
        offer_id: OFFER_ID,
        orderId: 'CUSTOMER-ORDER',
        amount: '250.50',
        raw_int: new Int32(7),
        raw_long: Long.fromString('9007199254740993'),
        status: 'pending',
        createdAt: new Date('2026-07-01T00:00:00.000Z'),
        updatedAt: new Date('2026-07-02T00:00:00.000Z'),
      },
    ];
    this.missingorders = [
      {
        _id: 'legacy-admin-1',
        user_id: USER_ID,
        source: 'involve',
        offer_id: 351,
        order_id: 'ADMIN-ORDER',
        order_amount: 100,
        status: 'investigating',
        createdAt: new Date('2026-07-01T00:00:00.000Z'),
        updatedAt: new Date('2026-07-03T00:00:00.000Z'),
      },
    ];
  }

  async readLegacy(collection: 'missionorders' | 'missingorders') {
    return collection === 'missionorders'
      ? this.missionorders.filter((row) => row.schema_version !== 2)
      : this.missingorders;
  }

  async readCanonical() {
    return this.missionorders.filter((row) => row.schema_version === 2);
  }

  async resolveOffersByObjectId(id: string) {
    return id === OFFER_ID
      ? [
          {
            _id: OFFER_ID,
            source: 'involve',
            offer_id: 351,
            offer_name: 'Rollback Shop',
          },
        ]
      : [];
  }

  async resolveOffersBySource(source: string, providerOfferId: number) {
    return source === 'involve' && providerOfferId === 351
      ? [
          {
            _id: OFFER_ID,
            source,
            offer_id: providerOfferId,
            offer_name: 'Rollback Shop',
          },
        ]
      : [];
  }

  async resolveUserById(id: string) {
    return id === USER_ID
      ? { _id: USER_ID, username: 'Rollback Customer' }
      : null;
  }

  async insertCanonical(document: Row) {
    const id = document._id ?? 'inserted-canonical-1';
    this.missionorders.push({ ...document, _id: id });
    this.writes += 1;
    return id;
  }

  async replaceCanonical(id: string, document: Row, preimage: Row) {
    const index = this.missionorders.findIndex((row) => String(row._id) === id);
    if (index < 0 || exact(this.missionorders[index]) !== exact(preimage)) {
      return false;
    }
    this.missionorders[index] = { ...document, _id: id };
    this.writes += 1;
    return true;
  }

  async readCanonicalById(id: string) {
    const row = this.missionorders.find((entry) => String(entry._id) === id);
    return row ? { ...row } : null;
  }

  async deleteCanonical(id: string, preimage: Row) {
    const index = this.missionorders.findIndex((row) => String(row._id) === id);
    if (index < 0 || exact(this.missionorders[index]) !== exact(preimage)) {
      return false;
    }
    this.missionorders.splice(index, 1);
    this.writes += 1;
    return true;
  }

  async restoreCanonical(id: string, document: Row, preimage: Row) {
    return this.replaceCanonical(id, document, preimage);
  }
}

describe('missing-orders reverse-CAS rollback', () => {
  it('reverses exactly one apply report and is idempotent on rerun', async () => {
    const store = new RollbackMemoryStore();
    const legacyBefore = { ...store.missionorders[0] };
    const applyReport = await runMissingOrdersMigration(store, {
      apply: true,
      now: NOW,
      runId: 'apply-for-rollback',
    });

    expect(applyReport.rollback).toMatchObject({
      runId: 'apply-for-rollback',
      manifestChecksum: expect.stringMatching(/^[a-f0-9]{64}$/),
      changes: expect.arrayContaining([
        expect.objectContaining({ operation: 'restore_replaced' }),
        expect.objectContaining({ operation: 'delete_inserted' }),
      ]),
    });

    const rollback = await runMissingOrdersRollback(store, applyReport, {
      apply: true,
    });
    expect(rollback).toMatchObject({
      mode: 'apply',
      sourceRunId: 'apply-for-rollback',
      applied: { deleted: 1, restored: 1 },
      skipped: {
        alreadyReverted: 0,
        concurrentModified: 0,
        concurrentWriteConflict: 0,
      },
      errors: [],
    });
    expect(store.missionorders).toEqual([legacyBefore]);
    expect(store.missionorders[0].raw_int).toBeInstanceOf(Int32);
    expect(store.missionorders[0].raw_long).toBeInstanceOf(Long);

    const writesAfterRollback = store.writes;
    const rerun = await runMissingOrdersRollback(store, applyReport, {
      apply: true,
    });
    expect(rerun).toMatchObject({
      applied: { deleted: 0, restored: 0 },
      skipped: { alreadyReverted: 2 },
      errors: [],
    });
    expect(store.writes).toBe(writesAfterRollback);
  });

  it('rejects a report or rollback checksum mismatch before reading live data', async () => {
    const store = new RollbackMemoryStore();
    const applyReport = await runMissingOrdersMigration(store, {
      apply: true,
      now: NOW,
      runId: 'tamper-proof-report',
    });
    const readSpy = jest.spyOn(store, 'readCanonicalById');
    const tampered = JSON.parse(JSON.stringify(applyReport));
    tampered.checksums.canonical.after = '0'.repeat(64);

    await expect(
      runMissingOrdersRollback(store, tampered, { apply: true }),
    ).rejects.toThrow('rollback manifest checksum');
    expect(readSpy).not.toHaveBeenCalled();
  });

  it('treats a durably journaled failed CAS intent as already reverted', async () => {
    const store = new RollbackMemoryStore();
    store.missingorders.length = 0;
    store.replaceCanonical = jest.fn().mockResolvedValue(false);
    const markNotApplied = jest.fn().mockResolvedValue(undefined);
    const applyReport = await runMissingOrdersMigration(store, {
      apply: true,
      now: NOW,
      runId: 'journaled-never-applied',
      rollbackJournal: {
        append: jest.fn().mockResolvedValue(undefined),
        markNotApplied,
        close: jest.fn(),
      },
    });

    const rollback = await runMissingOrdersRollback(store, applyReport, {
      apply: true,
    });

    expect(markNotApplied).toHaveBeenCalledWith('legacy-customer-1');
    expect(rollback).toMatchObject({
      applied: { deleted: 0, restored: 0 },
      skipped: { alreadyReverted: 1, concurrentModified: 0 },
      errors: [],
      changes: [expect.objectContaining({ outcome: 'journaled_not_applied' })],
    });
  });

  it('preserves a post-apply concurrent mutation and reports the skipped row', async () => {
    const store = new RollbackMemoryStore();
    const applyReport = await runMissingOrdersMigration(store, {
      apply: true,
      now: NOW,
      runId: 'concurrent-after-apply',
    });
    const insertedId = applyReport.rollback.changes.find(
      (change) => change.operation === 'delete_inserted',
    )!.canonicalId;
    const inserted = store.missionorders.find(
      (row) => String(row._id) === insertedId,
    )!;
    inserted.status = 'approved';
    inserted.resolution_note = 'Approved after migration';

    const rollback = await runMissingOrdersRollback(store, applyReport, {
      apply: true,
    });

    expect(rollback).toMatchObject({
      applied: { deleted: 0, restored: 1 },
      skipped: { concurrentModified: 1 },
      errors: [],
    });
    expect(
      store.missionorders.find((row) => String(row._id) === insertedId),
    ).toMatchObject({
      status: 'approved',
      resolution_note: 'Approved after migration',
    });
  });

  it('preserves a write racing between rollback read and reverse-CAS', async () => {
    const store = new RollbackMemoryStore();
    const applyReport = await runMissingOrdersMigration(store, {
      apply: true,
      now: NOW,
      runId: 'rollback-write-race',
    });
    const insertedId = applyReport.rollback.changes.find(
      (change) => change.operation === 'delete_inserted',
    )!.canonicalId;
    const originalDelete = store.deleteCanonical.bind(store);
    store.deleteCanonical = jest.fn(async (id: string, preimage: Row) => {
      const current = store.missionorders.find(
        (row) => String(row._id) === id,
      )!;
      current.status = 'approved';
      current.resolution_note = 'Concurrent approval during rollback';
      return originalDelete(id, preimage);
    });

    const rollback = await runMissingOrdersRollback(store, applyReport, {
      apply: true,
    });

    expect(rollback).toMatchObject({
      applied: { deleted: 0, restored: 0 },
      skipped: { concurrentWriteConflict: 1 },
      ok: false,
    });
    expect(
      store.missionorders.find((row) => String(row._id) === insertedId),
    ).toMatchObject({
      status: 'approved',
      resolution_note: 'Concurrent approval during rollback',
    });
  });
});
