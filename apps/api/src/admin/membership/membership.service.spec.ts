import { model, Types } from 'mongoose';

import { MembershipService } from './membership.service';
import { MembershipSchema } from './schemas/membership.schema';

function query(result: unknown) {
  const chain = {
    populate: jest.fn(),
    lean: jest.fn(),
    exec: jest.fn().mockResolvedValue(result),
  };
  chain.populate.mockReturnValue(chain);
  chain.lean.mockReturnValue(chain);
  return chain;
}

describe('MembershipService tier assignment boundary', () => {
  const userId = new Types.ObjectId();
  const tierId = new Types.ObjectId();
  let membershipTierModel: { findById: jest.Mock };
  let membershipModel: { findOneAndUpdate: jest.Mock };
  let service: MembershipService;

  beforeEach(() => {
    membershipTierModel = {
      findById: jest.fn().mockReturnValue(query({ _id: tierId })),
    };
    membershipModel = {
      findOneAndUpdate: jest.fn().mockReturnValue(
        query({
          user_id: userId,
          tier_id: tierId,
          tier_assignment_started_at: new Date('2026-07-17T12:00:00.000Z'),
        }),
      ),
    };
    service = new MembershipService(
      {} as never,
      membershipTierModel as never,
      membershipModel as never,
    );
  });

  it('defaults new membership tier assignments to the document creation time', () => {
    const path = MembershipSchema.path('tier_assignment_started_at');
    expect(path).toBeDefined();
    expect(path.options.required).toBe(true);
    expect(typeof path.options.default).toBe('function');

    const before = Date.now();
    const MembershipModel = model(
      `MembershipBoundary_${before}`,
      MembershipSchema,
    );
    const document = new MembershipModel({
      user_id: userId,
      tier_id: tierId,
      start_date: new Date('2026-07-01T00:00:00.000Z'),
      end_date: new Date('2026-07-31T23:59:59.999Z'),
    });
    const after = Date.now();
    const value = document.get('tier_assignment_started_at');
    expect(value).toBeInstanceOf(Date);
    expect(value.getTime()).toBeGreaterThanOrEqual(before);
    expect(value.getTime()).toBeLessThanOrEqual(after);
  });

  it('atomically advances the boundary only when the stored tier differs', async () => {
    await expect(
      service.changeTier(userId.toHexString(), tierId.toHexString()),
    ).resolves.toMatchObject({ tier_id: tierId });

    expect(membershipModel.findOneAndUpdate).toHaveBeenCalledWith(
      { user_id: userId },
      [
        {
          $set: {
            tier_id: tierId,
            tier_assignment_started_at: {
              $cond: [
                { $eq: ['$tier_id', tierId] },
                '$tier_assignment_started_at',
                '$$NOW',
              ],
            },
          },
        },
      ],
      { new: true, updatePipeline: true },
    );
  });

  it('preserves a same-tier missing boundary for the guarded migration to own', async () => {
    await service.changeTier(userId.toHexString(), tierId.toHexString());

    const pipeline = membershipModel.findOneAndUpdate.mock.calls[0]?.[1];
    expect(pipeline[0].$set.tier_assignment_started_at.$cond[1]).toBe(
      '$tier_assignment_started_at',
    );
    expect(
      JSON.stringify(pipeline[0].$set.tier_assignment_started_at),
    ).not.toContain('$ifNull');
  });
});
