import { Mongoose, Types } from 'mongoose';

import { MissionOrderSchema } from 'src/offer/schemas/missing-order.schema';

import { MissingOrdersService } from './missing-orders.service';

const CLAIM_ID = new Types.ObjectId('507f1f77bcf86cd799439010');
const USER_ID = new Types.ObjectId('507f1f77bcf86cd799439011');
const OFFER_ID = new Types.ObjectId('507f1f77bcf86cd799439012');

function canonicalClaim(overrides: Record<string, unknown> = {}) {
  return {
    _id: CLAIM_ID,
    user_id: USER_ID,
    offer_id: OFFER_ID,
    customer_snapshot: {
      name: 'Claim Seeker',
      email: 'seeker@example.com',
      phone: '+66812345678',
    },
    offer_snapshot: {
      source: 'involve',
      provider_offer_id: 5031,
      name: 'Example Store',
    },
    order_id: 'ORDER-9',
    purchase_date: new Date('2026-07-01T00:00:00.000Z'),
    order_amount: 1299.5,
    currency: 'THB',
    remarks: 'Tracking was missing',
    evidence_refs: ['private://missing-orders/receipt.jpg'],
    status: 'pending',
    assigned_to: null,
    resolution_note: null,
    rejection_reason: null,
    resolved_at: null,
    notes: [
      {
        admin_id: 'admin-1',
        admin_name: 'Support One',
        text: 'Requested provider confirmation',
        created_at: new Date('2026-07-02T03:04:05.000Z'),
      },
    ],
    schema_version: 2,
    createdAt: new Date('2026-07-01T01:02:03.000Z'),
    updatedAt: new Date('2026-07-02T03:04:05.000Z'),
    ...overrides,
  };
}

function queryReturning(result: unknown) {
  const query: Record<string, jest.Mock> = {};
  for (const method of ['sort', 'skip', 'limit', 'lean']) {
    query[method] = jest.fn().mockReturnValue(query);
  }
  query.exec = jest.fn().mockResolvedValue(result);
  return query;
}

function makeModel(row: Record<string, unknown> = canonicalClaim()) {
  const listQuery = queryReturning([row]);
  const detailQuery = queryReturning(row);
  const updateQuery = queryReturning(row);
  return {
    aggregate: jest
      .fn()
      .mockResolvedValueOnce([
        { _id: 'pending', count: 2 },
        { _id: 'investigating', count: 1 },
        { _id: 'approved', count: 3 },
        { _id: 'rejected', count: 1 },
      ])
      .mockResolvedValueOnce([{ avgHours: 6.5 }]),
    countDocuments: jest.fn((filter: { status?: string } = {}) =>
      queryReturning(
        filter.status === 'approved' ? 3 : filter.status === 'rejected' ? 1 : 1,
      ),
    ),
    find: jest.fn().mockReturnValue(listQuery),
    findById: jest.fn().mockReturnValue(detailQuery),
    findByIdAndUpdate: jest.fn().mockReturnValue(updateQuery),
    listQuery,
    detailQuery,
    updateQuery,
  };
}

describe('MissingOrdersService canonical MissionOrder contract', () => {
  it('registers the canonical model in missionorders with normalized status and immutable provenance indexes', () => {
    expect(MissionOrderSchema.get('collection')).toBe('missionorders');
    expect(MissionOrderSchema.path('status').options.enum).toEqual([
      'pending',
      'under_review',
      'approved',
      'rejected',
    ]);

    const indexes = MissionOrderSchema.indexes();
    expect(indexes).toEqual(
      expect.arrayContaining([
        [
          { legacy_collection: 1, legacy_id: 1 },
          expect.objectContaining({
            unique: true,
            partialFilterExpression: {
              legacy_collection: { $exists: true },
              legacy_id: { $exists: true },
            },
          }),
        ],
        [
          { dedupe_key: 1 },
          expect.objectContaining({
            unique: true,
            partialFilterExpression: { dedupe_key: { $type: 'string' } },
          }),
        ],
      ]),
    );
  });

  it('maps a customer-submitted canonical row to the explicit Admin claim DTO', async () => {
    const model = makeModel();
    const service = new MissingOrdersService(model as never);

    const result = await service.findAll({ page: '1', limit: '20' });

    expect(result.data).toEqual([
      {
        id: CLAIM_ID.toHexString(),
        userId: USER_ID.toHexString(),
        userName: 'Claim Seeker',
        email: 'seeker@example.com',
        phone: '+66812345678',
        merchantId: OFFER_ID.toHexString(),
        merchantName: 'Example Store',
        offerSource: 'involve',
        providerOfferId: 5031,
        orderId: 'ORDER-9',
        orderAmount: 1299.5,
        currency: 'THB',
        purchaseDate: '2026-07-01T00:00:00.000Z',
        expectedCashback: null,
        overrideCashback: null,
        submittedDate: '2026-07-01T01:02:03.000Z',
        remarks: 'Tracking was missing',
        status: 'pending',
        assignedTo: null,
        evidence: ['private://missing-orders/receipt.jpg'],
        notes: [
          {
            adminId: 'admin-1',
            adminName: 'Support One',
            note: 'Requested provider confirmation',
            timestamp: '2026-07-02T03:04:05.000Z',
          },
        ],
        resolutionNote: null,
        rejectionReason: null,
        resolvedAt: null,
        schemaVersion: 2,
      },
    ]);
    expect(result).toMatchObject({
      meta: { limit: 20, page: 1, total: 1, totalPages: 1 },
    });
  });

  it('accepts a phone-only Firebase customer snapshot and maps missing identity fields safely', async () => {
    const isolatedMongoose = new Mongoose();
    const PhoneOnlyMissionOrder = isolatedMongoose.model(
      'PhoneOnlyMissionOrder',
      MissionOrderSchema.clone(),
    );
    const phoneOnly = new PhoneOnlyMissionOrder(
      canonicalClaim({
        customer_snapshot: {
          name: null,
          email: null,
          phone: '+66812345678',
        },
      }),
    );

    await expect(phoneOnly.validate()).resolves.toBeUndefined();

    const model = makeModel(
      phoneOnly.toObject() as unknown as Record<string, unknown>,
    );
    const service = new MissingOrdersService(model as never);
    const result = await service.findOne(CLAIM_ID.toHexString());

    expect(result).toMatchObject({
      userName: 'Customer',
      email: null,
      phone: '+66812345678',
    });
    expect(result).not.toHaveProperty('dedupeKey');
    expect(result).not.toHaveProperty('migrationChecksum');
  });

  it('applies the Admin date range and escaped search to canonical fields', async () => {
    const model = makeModel();
    const service = new MissingOrdersService(model as never);

    await service.findAll({
      page: '1',
      limit: '20',
      search: 'ORDER.*(',
      from: '2026-07-01',
      to: '2026-07-31',
    } as never);

    expect(model.find).toHaveBeenCalledWith({
      createdAt: {
        $gte: new Date('2026-07-01T00:00:00.000Z'),
        $lte: new Date('2026-07-31T23:59:59.999Z'),
      },
      $or: [
        { order_id: { $regex: 'ORDER\\.\\*\\(', $options: 'i' } },
        {
          'customer_snapshot.name': {
            $regex: 'ORDER\\.\\*\\(',
            $options: 'i',
          },
        },
        {
          'customer_snapshot.email': {
            $regex: 'ORDER\\.\\*\\(',
            $options: 'i',
          },
        },
        {
          'offer_snapshot.name': {
            $regex: 'ORDER\\.\\*\\(',
            $options: 'i',
          },
        },
      ],
    });
  });

  it('normalizes investigating in stats and exposes the shape consumed by Admin', async () => {
    const model = makeModel();
    const service = new MissingOrdersService(model as never);

    await expect(service.getStats()).resolves.toEqual({
      byStatus: {
        pending: 2,
        under_review: 1,
        approved: 3,
        rejected: 1,
      },
      totalOpen: 3,
      pendingReview: 3,
      approvedWeek: 3,
      rejectedWeek: 1,
      avgResolutionHours: 6.5,
    });
  });

  it('assigns a claim into under_review and maps the response DTO', async () => {
    const row = canonicalClaim({
      status: 'under_review',
      assigned_to: 'admin-7',
    });
    const model = makeModel(row);
    const service = new MissingOrdersService(model as never);

    const result = await service.assign(CLAIM_ID.toHexString(), 'admin-7');

    expect(model.findByIdAndUpdate).toHaveBeenCalledWith(
      CLAIM_ID,
      { $set: { assigned_to: 'admin-7', status: 'under_review' } },
      { new: true },
    );
    expect(result).toMatchObject({
      id: CLAIM_ID.toHexString(),
      assignedTo: 'admin-7',
      status: 'under_review',
    });
  });

  it.each([
    ['approve', 'approved'],
    ['reject', 'rejected'],
  ] as const)(
    '%s changes workflow state without any money or points mutation',
    async (method, expectedStatus) => {
      const row = canonicalClaim({ status: expectedStatus });
      const model = makeModel(row);
      const service = new MissingOrdersService(model as never);

      const result = await service[method](CLAIM_ID.toHexString(), 'Reviewed');

      const update = model.findByIdAndUpdate.mock.calls[0][1];
      expect(update).toEqual({
        $set: expect.objectContaining({
          status: expectedStatus,
          resolution_note: 'Reviewed',
          ...(method === 'reject' ? { rejection_reason: 'Reviewed' } : {}),
          resolved_at: expect.any(Date),
        }),
      });
      expect(JSON.stringify(update)).not.toMatch(
        /\$inc|wallet|cashback|point/i,
      );
      expect(result.status).toBe(expectedStatus);
    },
  );

  it('persists a durable note and returns the mapped note history', async () => {
    const model = makeModel();
    const service = new MissingOrdersService(model as never);

    const result = await service.addNote(
      CLAIM_ID.toHexString(),
      'admin-1',
      'Support One',
      'Requested provider confirmation',
    );

    expect(model.findByIdAndUpdate).toHaveBeenCalledWith(
      CLAIM_ID,
      {
        $push: {
          notes: {
            admin_id: 'admin-1',
            admin_name: 'Support One',
            text: 'Requested provider confirmation',
            created_at: expect.any(Date),
          },
        },
      },
      { new: true },
    );
    expect(result.notes).toEqual([
      expect.objectContaining({
        adminId: 'admin-1',
        note: 'Requested provider confirmation',
      }),
    ]);
  });
});
