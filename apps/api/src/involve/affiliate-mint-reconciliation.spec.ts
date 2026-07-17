import { Types } from 'mongoose';
import { resolve } from 'node:path';

// Operational helper is plain CommonJS so it can run directly under Node.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const helper = require(
  resolve(
    __dirname,
    '../../../../scripts/reconcile-affiliate-mint-reservations.cjs',
  ),
);

type Row = Record<string, any>;

function sameValue(left: unknown, right: unknown): boolean {
  if (left instanceof Types.ObjectId || right instanceof Types.ObjectId) {
    return String(left) === String(right);
  }
  return left === right;
}

function matches(row: Row, filter: Row): boolean {
  return Object.entries(filter).every(([key, value]) =>
    sameValue(row[key], value),
  );
}

class FakeCursor {
  private max = Number.POSITIVE_INFINITY;

  constructor(private readonly rows: Row[]) {}

  sort() {
    this.rows.sort((left, right) =>
      String(left._id).localeCompare(String(right._id)),
    );
    return this;
  }

  limit(value: number) {
    this.max = value;
    return this;
  }

  async toArray() {
    return this.rows.slice(0, this.max);
  }
}

class FakeCollection {
  readonly updateCalls: Array<{ filter: Row; update: Row }> = [];

  constructor(
    readonly rows: Row[],
    private readonly indexRows: Row[] = [],
  ) {}

  async indexes() {
    return this.indexRows;
  }

  find(filter: Row) {
    return new FakeCursor(this.rows.filter((row) => matches(row, filter)));
  }

  async findOne(filter: Row) {
    return this.rows.find((row) => matches(row, filter)) ?? null;
  }

  async countDocuments(filter: Row) {
    return this.rows.filter((row) => matches(row, filter)).length;
  }

  async updateOne(filter: Row, update: Row) {
    this.updateCalls.push({ filter, update });
    const row = this.rows.find((candidate) => matches(candidate, filter));
    if (!row) return { matchedCount: 0, modifiedCount: 0 };
    Object.assign(row, update.$set ?? {});
    return { matchedCount: 1, modifiedCount: 1 };
  }
}

function makeDb({
  reservations = [],
  deeplinks = [],
  sentinels = [],
  destinationIndexes = [destinationIndex()],
}: {
  reservations?: Row[];
  deeplinks?: Row[];
  sentinels?: Row[];
  destinationIndexes?: Row[];
} = {}) {
  const collections = {
    affiliate_mint_reservations: new FakeCollection(reservations),
    deeplinks: new FakeCollection(deeplinks, destinationIndexes),
    environment_sentinels: new FakeCollection(sentinels),
  };
  return {
    collections,
    db: {
      collection: (name: keyof typeof collections) => collections[name],
    },
  };
}

function destinationIndex(overrides: Row = {}) {
  return {
    name: helper.DESTINATION_IDENTITY_INDEX,
    unique: true,
    key: {
      source: 1,
      user_id: 1,
      offer_id: 1,
      merchant_id: 1,
      destination_hash: 1,
    },
    partialFilterExpression: {
      source: { $type: 'string' },
      destination_hash: { $type: 'string' },
    },
    ...overrides,
  };
}

function reservationFixture(overrides: Row = {}) {
  const row: Row = {
    source: 'involve',
    user_id: new Types.ObjectId('507f1f77bcf86cd799439011'),
    offer_id: 5031,
    merchant_id: 103877,
    destination_url: 'https://merchant.example/deal?coupon=SAFE',
    status: 'provider_succeeded',
    tracked_deeplink: 'https://track.example/safe',
    provider_succeeded_at: new Date('2026-07-17T00:00:00.000Z'),
    ...overrides,
  };
  row.destination_hash =
    overrides.destination_hash ??
    helper.destinationIdentityHash(row.destination_url);
  row._id = overrides._id ?? helper.reservationIdentityId(row);
  return row;
}

function cacheFixture(reservation: Row, overrides: Row = {}) {
  return {
    _id: new Types.ObjectId(),
    source: reservation.source,
    user_id: reservation.user_id,
    offer_id: reservation.offer_id,
    merchant_id: reservation.merchant_id,
    destination_hash: reservation.destination_hash,
    destination_url: reservation.destination_url,
    deeplink: reservation.tracked_deeplink,
    ...overrides,
  };
}

function sentinel(environment = 'dev') {
  return {
    _id: helper.SENTINEL_ID,
    environment,
    purpose: helper.SENTINEL_PURPOSE,
    write_enabled: true,
  };
}

describe('guarded affiliate mint reconciliation command', () => {
  const now = new Date('2026-07-17T03:00:00.000Z');

  it('defaults to a zero-write redacted audit and only counts provider_started rows', async () => {
    const candidate = reservationFixture();
    const missing = reservationFixture({
      offer_id: 5032,
      destination_url: 'https://merchant.example/missing',
      tracked_deeplink: 'https://track.example/missing',
    });
    const uncertain = reservationFixture({
      offer_id: 5033,
      destination_url: 'https://merchant.example/uncertain',
      status: 'provider_started',
      tracked_deeplink: undefined,
    });
    const { db, collections } = makeDb({
      reservations: [candidate, missing, uncertain],
      deeplinks: [cacheFixture(candidate)],
    });

    const report = await helper.reconcileAffiliateMintReservations({
      db,
      environment: 'dev',
      now,
    });

    expect(report).toMatchObject({
      schema: helper.REPORT_SCHEMA,
      environment: 'dev',
      mode: 'audit',
      safety: { destinationIdentityIndexReady: true },
      counts: {
        scanned: 2,
        candidates: 1,
        missingCache: 1,
        mismatchedCache: 0,
        providerStartedUncertain: 1,
        changed: 0,
      },
    });
    expect(collections.affiliate_mint_reservations.updateCalls).toHaveLength(0);
    const serialized = JSON.stringify(report);
    expect(serialized).not.toContain(String(candidate.user_id));
    expect(serialized).not.toContain(candidate.destination_url);
    expect(serialized).not.toContain(candidate.tracked_deeplink);
    expect(serialized).not.toContain(candidate._id);
    expect(report.opaqueIds.candidates[0]).toMatch(/^[a-f0-9]{16}$/);
    expect(report.opaqueIds.providerStartedUncertain).toEqual([
      helper.opaqueId(uncertain._id),
    ]);
  });

  it('atomically commits an exact cache match and an idempotent rerun changes zero rows', async () => {
    const candidate = reservationFixture();
    const providerStarted = reservationFixture({
      offer_id: 5034,
      destination_url: 'https://merchant.example/started',
      status: 'provider_started',
      tracked_deeplink: undefined,
    });
    const { db, collections } = makeDb({
      reservations: [candidate, providerStarted],
      deeplinks: [cacheFixture(candidate)],
      sentinels: [sentinel()],
    });
    const options = {
      db,
      environment: 'dev',
      mode: 'apply',
      confirmation: helper.expectedConfirmation('dev'),
      now,
    };

    const first = await helper.reconcileAffiliateMintReservations(options);
    const second = await helper.reconcileAffiliateMintReservations(options);

    expect(first.counts.changed).toBe(1);
    expect(second.counts.changed).toBe(0);
    expect(second.counts.scanned).toBe(0);
    expect(candidate).toMatchObject({
      status: 'committed',
      committed_at: now,
      updated_at: now,
    });
    expect(candidate.expires_at).toEqual(
      new Date(now.getTime() + helper.RETENTION_MS),
    );
    expect(providerStarted.status).toBe('provider_started');
    expect(collections.affiliate_mint_reservations.updateCalls).toHaveLength(1);
    expect(
      collections.affiliate_mint_reservations.updateCalls[0].filter,
    ).toMatchObject({
      status: 'provider_succeeded',
      destination_url: candidate.destination_url,
      tracked_deeplink: candidate.tracked_deeplink,
    });
  });

  it.each([
    [
      'production environment',
      { environment: 'production', confirmation: 'anything' },
      'NONPRODUCTION_ENV_REQUIRED',
    ],
    [
      'missing confirmation',
      { environment: 'dev', confirmation: undefined },
      'CONFIRMATION_REQUIRED',
    ],
  ])(
    'refuses %s before any reservation update',
    async (_label, change, code) => {
      const candidate = reservationFixture();
      const { db, collections } = makeDb({
        reservations: [candidate],
        deeplinks: [cacheFixture(candidate)],
        sentinels: [sentinel()],
      });

      await expect(
        helper.reconcileAffiliateMintReservations({
          db,
          mode: 'apply',
          now,
          ...change,
        }),
      ).rejects.toMatchObject({ code });
      expect(collections.affiliate_mint_reservations.updateCalls).toHaveLength(
        0,
      );
    },
  );

  it.each([
    ['missing sentinel', []],
    ['wrong sentinel environment', [sentinel('staging')]],
    ['disabled sentinel', [{ ...sentinel(), write_enabled: false }]],
  ])('refuses apply with %s', async (_label, sentinels) => {
    const candidate = reservationFixture();
    const { db, collections } = makeDb({
      reservations: [candidate],
      deeplinks: [cacheFixture(candidate)],
      sentinels,
    });

    await expect(
      helper.reconcileAffiliateMintReservations({
        db,
        environment: 'dev',
        mode: 'apply',
        confirmation: helper.expectedConfirmation('dev'),
        now,
      }),
    ).rejects.toMatchObject({ code: 'SENTINEL_REQUIRED' });
    expect(collections.affiliate_mint_reservations.updateCalls).toHaveLength(0);
  });

  it('refuses the whole write batch on an exact-cache mismatch', async () => {
    const candidate = reservationFixture();
    const mismatch = reservationFixture({
      offer_id: 5035,
      destination_url: 'https://merchant.example/mismatch',
      tracked_deeplink: 'https://track.example/reservation',
    });
    const { db, collections } = makeDb({
      reservations: [candidate, mismatch],
      deeplinks: [
        cacheFixture(candidate),
        cacheFixture(mismatch, {
          deeplink: 'https://track.example/different-cache',
        }),
      ],
      sentinels: [sentinel()],
    });

    await expect(
      helper.reconcileAffiliateMintReservations({
        db,
        environment: 'dev',
        mode: 'apply',
        confirmation: helper.expectedConfirmation('dev'),
        now,
      }),
    ).rejects.toMatchObject({
      code: 'CACHE_MISMATCH',
      report: expect.objectContaining({
        counts: expect.objectContaining({ mismatchedCache: 1, changed: 0 }),
      }),
    });
    expect(collections.affiliate_mint_reservations.updateCalls).toHaveLength(0);
    expect(candidate.status).toBe('provider_succeeded');
    expect(mismatch.status).toBe('provider_succeeded');
  });

  it('refuses apply when the exact unique destination index is unavailable', async () => {
    const candidate = reservationFixture();
    const { db, collections } = makeDb({
      reservations: [candidate],
      deeplinks: [cacheFixture(candidate)],
      sentinels: [sentinel()],
      destinationIndexes: [],
    });

    await expect(
      helper.reconcileAffiliateMintReservations({
        db,
        environment: 'dev',
        mode: 'apply',
        confirmation: helper.expectedConfirmation('dev'),
        now,
      }),
    ).rejects.toMatchObject({
      code: 'DESTINATION_INDEX_REQUIRED',
      report: expect.objectContaining({
        safety: { destinationIdentityIndexReady: false },
      }),
    });
    expect(collections.affiliate_mint_reservations.updateCalls).toHaveLength(0);
  });

  it('refuses an ambiguous same-identity cache even if one duplicate is exact', async () => {
    const candidate = reservationFixture();
    const { db, collections } = makeDb({
      reservations: [candidate],
      deeplinks: [
        cacheFixture(candidate),
        cacheFixture(candidate, {
          _id: new Types.ObjectId(),
          deeplink: 'https://track.example/conflicting-duplicate',
        }),
      ],
      sentinels: [sentinel()],
    });

    await expect(
      helper.reconcileAffiliateMintReservations({
        db,
        environment: 'dev',
        mode: 'apply',
        confirmation: helper.expectedConfirmation('dev'),
        now,
      }),
    ).rejects.toMatchObject({
      code: 'CACHE_MISMATCH',
      report: expect.objectContaining({
        counts: expect.objectContaining({ mismatchedCache: 1, changed: 0 }),
      }),
    });
    expect(collections.affiliate_mint_reservations.updateCalls).toHaveLength(0);
    expect(candidate.status).toBe('provider_succeeded');
  });
});
