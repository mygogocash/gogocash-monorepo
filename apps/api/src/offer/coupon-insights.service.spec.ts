import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { CouponInsightsService } from './coupon-insights.service';

const couponId = new Types.ObjectId().toHexString();

function chainResult<T>(value: T) {
  const query = {
    lean: jest.fn().mockResolvedValue(value),
    limit: jest.fn(),
    populate: jest.fn(),
    select: jest.fn(),
    skip: jest.fn(),
    sort: jest.fn(),
  };
  query.limit.mockReturnValue(query);
  query.populate.mockReturnValue(query);
  query.select.mockReturnValue(query);
  query.skip.mockReturnValue(query);
  query.sort.mockReturnValue(query);
  return query;
}

describe('CouponInsightsService', () => {
  const couponModel = {
    exists: jest.fn(),
    findById: jest.fn(),
    updateOne: jest.fn(),
  };
  const activityModel = {
    countDocuments: jest.fn(),
    find: jest.fn(),
    updateOne: jest.fn(),
  };
  let service: CouponInsightsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CouponInsightsService(
      couponModel as never,
      activityModel as never,
    );
    couponModel.exists.mockResolvedValue({ _id: couponId });
  });

  it('rejects an invalid coupon id before querying Mongo', async () => {
    await expect(
      service.recordEngagement('not-an-object-id', {
        eventId: 'view-page-123456',
        eventType: 'view',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(couponModel.exists).not.toHaveBeenCalled();
  });

  it('records a public view once through a server-scoped idempotency key', async () => {
    activityModel.updateOne.mockResolvedValue({ upsertedCount: 1 });

    await expect(
      service.recordEngagement(couponId, {
        eventId: 'view-page-123456',
        eventType: 'view',
      }),
    ).resolves.toEqual({ recorded: true });

    expect(activityModel.updateOne).toHaveBeenCalledWith(
      { dedupe_key: `${couponId}:view:view-page-123456` },
      {
        $setOnInsert: expect.objectContaining({
          coupon_id: expect.any(Types.ObjectId),
          dedupe_key: `${couponId}:view:view-page-123456`,
          event_type: 'view',
        }),
      },
      { upsert: true },
    );
  });

  it('treats a duplicate public-event race as an idempotent no-op', async () => {
    activityModel.updateOne.mockRejectedValue({ code: 11000 });

    await expect(
      service.recordEngagement(couponId, {
        eventId: 'view-page-123456',
        eventType: 'view',
      }),
    ).resolves.toEqual({ recorded: false });
  });

  it('records a trusted redemption idempotently and reconciles quantity_used', async () => {
    activityModel.updateOne.mockResolvedValue({ upsertedCount: 1 });
    activityModel.countDocuments.mockResolvedValue(3);
    couponModel.updateOne.mockResolvedValue({ modifiedCount: 1 });

    await expect(
      service.recordRedemption(
        couponId,
        {
          occurredAt: '2026-07-15T08:30:00.000Z',
          referenceId: 'merchant-order-42',
          userEmail: 'member@example.com',
          userId: 'customer-42',
        },
        {
          adminEmail: 'operator@gogocash.co',
          adminId: 'admin-42',
        },
      ),
    ).resolves.toEqual({ recorded: true });

    expect(activityModel.updateOne).toHaveBeenCalledWith(
      { dedupe_key: `${couponId}:redemption:merchant-order-42` },
      {
        $setOnInsert: expect.objectContaining({
          event_type: 'redemption',
          recorded_by_admin_email: 'operator@gogocash.co',
          recorded_by_admin_id: 'admin-42',
          reference_id: 'merchant-order-42',
          user_email: 'member@example.com',
          user_id: 'customer-42',
        }),
      },
      { upsert: true },
    );
    expect(couponModel.updateOne).toHaveBeenCalledWith(
      { _id: expect.any(Types.ObjectId) },
      expect.arrayContaining([
        expect.objectContaining({
          $set: expect.objectContaining({ quantity_used: expect.anything() }),
        }),
      ]),
    );
  });

  it('reconciles quantity_used when a trusted redemption is retried', async () => {
    activityModel.updateOne.mockResolvedValue({ upsertedCount: 0 });
    activityModel.countDocuments.mockResolvedValue(3);
    couponModel.updateOne.mockResolvedValue({ modifiedCount: 0 });

    await expect(
      service.recordRedemption(
        couponId,
        {
          referenceId: 'merchant-order-42',
        },
        {
          adminId: 'admin-42',
        },
      ),
    ).resolves.toEqual({ recorded: false });

    expect(activityModel.countDocuments).toHaveBeenCalledWith({
      coupon_id: expect.any(Types.ObjectId),
      event_type: 'redemption',
    });
    expect(couponModel.updateOne).toHaveBeenCalledTimes(1);
  });

  it('returns per-coupon real metrics and paginated redemption rows', async () => {
    const couponQuery = chainResult({
      _id: couponId,
      code: 'SAVE10',
      discount: 10,
      name: 'Save ten',
      offer_id: { offer_name: 'Example Shop' },
      quantity_used: 4,
    });
    const redemptionQuery = chainResult([
      {
        _id: 'activity-1',
        occurred_at: new Date('2026-07-15T08:30:00.000Z'),
        reference_id: 'merchant-order-42',
        user_email: 'member@example.com',
        user_id: 'customer-42',
      },
    ]);
    couponModel.findById.mockReturnValue(couponQuery);
    activityModel.find.mockReturnValue(redemptionQuery);
    activityModel.countDocuments.mockImplementation(
      (filter: { event_type: string }) =>
        Promise.resolve(
          filter.event_type === 'view'
            ? 10
            : filter.event_type === 'copy'
              ? 4
              : 3,
        ),
    );

    await expect(
      service.getInsights(couponId, { limit: 25, page: 1 }),
    ).resolves.toEqual({
      coupon: {
        code: 'SAVE10',
        discount: 10,
        id: couponId,
        name: 'Save ten',
        offerName: 'Example Shop',
      },
      metrics: {
        codeCopies: 4,
        copyRate: 40,
        detailViews: 10,
        usageAmount: 4,
        usageUnit: 'redemptions',
      },
      redemptions: {
        data: [
          {
            id: 'activity-1',
            referenceId: 'merchant-order-42',
            status: 'redeemed',
            usedAt: '2026-07-15T08:30:00.000Z',
          },
        ],
        limit: 25,
        page: 1,
        total: 3,
        totalPages: 1,
      },
    });
  });

  it('fails clearly when the coupon does not exist', async () => {
    couponModel.findById.mockReturnValue(chainResult(null));

    await expect(
      service.getInsights(couponId, { limit: 25, page: 1 }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
