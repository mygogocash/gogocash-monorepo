import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getConnectionToken, getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { WithdrawFeeCouponsService } from './withdraw-fee-coupons.service';
import { WithdrawFeeCoupon } from 'src/withdraw/schemas/withdraw-fee-coupon.schema';
import { AdminActivityService } from '../activity/admin-activity.service';
import {
  CreateWithdrawFeeCouponDto,
  UpdateWithdrawFeeCouponDto,
} from './dto/withdraw-fee-coupon.dto';

describe('WithdrawFeeCouponsService', () => {
  const actor = {
    id: 'admin-1',
    label: 'ops@gogocash.co',
    role: 'superadmin',
  };
  const supportActor = { ...actor, role: 'support' };
  const approverActor = { ...actor, role: 'approver' };
  const superadminActor = { ...actor, role: 'superadmin' };
  const create = jest.fn();
  const find = jest.fn();
  const countDocuments = jest.fn();
  const findById = jest.fn();
  const append = jest.fn().mockResolvedValue(undefined);
  const appendRequired = jest.fn().mockResolvedValue(undefined);
  const withTransaction = jest.fn();
  const endSession = jest.fn().mockResolvedValue(undefined);
  const session = { withTransaction, endSession };
  const startSession = jest.fn().mockResolvedValue(session);

  beforeEach(async () => {
    create.mockReset();
    find.mockReset();
    countDocuments.mockReset();
    findById.mockReset();
    append.mockClear();
    appendRequired.mockReset().mockResolvedValue(undefined);
    withTransaction
      .mockReset()
      .mockImplementation(async (callback: () => Promise<void>) => callback());
    endSession.mockClear();
    startSession.mockClear();
  });

  async function buildService() {
    const moduleRef = await Test.createTestingModule({
      providers: [
        WithdrawFeeCouponsService,
        {
          provide: getModelToken(WithdrawFeeCoupon.name),
          useValue: {
            create,
            find,
            countDocuments,
            findById,
          },
        },
        {
          provide: AdminActivityService,
          useValue: { append, appendRequired },
        },
        { provide: getConnectionToken(), useValue: { startSession } },
      ],
    }).compile();
    return moduleRef.get(WithdrawFeeCouponsService);
  }

  const boundedCreateDto = (): CreateWithdrawFeeCouponDto => ({
    code: 'SAVE10',
    name: 'Save ten',
    discount_mode: 'percent',
    discount_value: 10,
    unlimited_quantity: false,
    quantity: 100,
    start_at: '2026-01-01T00:00:00.000Z',
    end_at: '2026-12-31T00:00:00.000Z',
  });

  function mockCreatedCoupon(
    overrides: Partial<WithdrawFeeCoupon> = {},
  ): void {
    const value = {
      _id: new Types.ObjectId(),
      code: 'SAVE10',
      discount_mode: 'percent',
      discount_value: 10,
      currency: 'THB',
      unlimited_quantity: false,
      quantity: 100,
      ...overrides,
    };
    const document = { toObject: () => value };
    create.mockImplementation(async (payload: unknown) =>
      Array.isArray(payload) ? [document] : document,
    );
  }

  function existingCoupon(overrides: Partial<WithdrawFeeCoupon> = {}) {
    const value = {
      _id: new Types.ObjectId(),
      code: 'SAVE10',
      name: 'Save ten',
      description: undefined,
      discount_mode: 'percent' as const,
      discount_value: 10,
      currency: 'THB',
      start_at: new Date('2026-01-01T00:00:00.000Z'),
      end_at: new Date('2026-12-31T00:00:00.000Z'),
      disabled: false,
      quantity: 100,
      quantity_used: 0,
      unlimited_quantity: false,
      usage_per_user: 1,
      applies_to: ['bank_transfer'],
      min_withdraw_amount: 0,
      ...overrides,
    };
    return {
      ...value,
      save: jest.fn().mockResolvedValue(undefined),
      toObject: jest.fn(() => ({ ...value })),
    };
  }

  it('create > given fixed mode without discount_value > then rejects', async () => {
    const service = await buildService();
    await expect(
      service.create(
        {
          code: 'SAVE10',
          name: 'Save',
          discount_mode: 'fixed',
          start_at: '2026-01-01T00:00:00.000Z',
          end_at: '2026-12-31T00:00:00.000Z',
        },
        actor,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(create).not.toHaveBeenCalled();
  });

  it('create > given limited inventory without quantity > then rejects', async () => {
    const service = await buildService();
    await expect(
      service.create(
        {
          code: 'LIMITED1',
          name: 'Limited',
          discount_mode: 'waive',
          unlimited_quantity: false,
          start_at: '2026-01-01T00:00:00.000Z',
          end_at: '2026-12-31T00:00:00.000Z',
        },
        actor,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(create).not.toHaveBeenCalled();
  });

  it('list > given regex metacharacters in search > then escapes them in the filter', async () => {
    const service = await buildService();
    find.mockReturnValue({
      sort: () => ({
        skip: () => ({
          limit: () => ({
            lean: jest.fn().mockResolvedValue([]),
          }),
        }),
      }),
    });
    countDocuments.mockResolvedValue(0);

    await service.list({ search: 'SAVE.*' });

    expect(find).toHaveBeenCalledWith({
      $or: [
        { code: { $regex: 'SAVE\\.\\*', $options: 'i' } },
        { name: { $regex: 'SAVE\\.\\*', $options: 'i' } },
      ],
    });
  });

  it('create > given waive mode > then persists with discount_value 0', async () => {
    const service = await buildService();
    mockCreatedCoupon({
      code: 'FREEFEE',
      discount_mode: 'waive',
      discount_value: 0,
    });

    const result = await service.create(
      {
        code: 'freefee',
        name: 'Free fee',
        discount_mode: 'waive',
        start_at: '2026-01-01T00:00:00.000Z',
        end_at: '2026-12-31T00:00:00.000Z',
      },
      actor,
    );

    expect(create).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          code: 'FREEFEE',
          discount_mode: 'waive',
          discount_value: 0,
          applies_to: ['bank_transfer'],
        }),
      ],
      { session },
    );
    expect(result).toMatchObject({ code: 'FREEFEE' });
    expect(appendRequired).toHaveBeenCalledWith(
      expect.objectContaining({
        actor_type: 'admin',
        actor_id: actor.id,
        actor_label: actor.label,
      }),
      session,
    );
  });

  it.each([
    ['quantity', 1.5],
    ['usage_per_user', 1.5],
  ] as const)(
    'create > rejects fractional %s in the service boundary',
    async (property, value) => {
      const service = await buildService();

      await expect(
        service.create(
          {
            code: 'FRACTION',
            name: 'Fractional',
            discount_mode: 'waive',
            unlimited_quantity: property === 'quantity' ? false : true,
            start_at: '2026-01-01T00:00:00.000Z',
            end_at: '2026-12-31T00:00:00.000Z',
            [property]: value,
          },
          actor,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(create).not.toHaveBeenCalled();
    },
  );

  describe('role-sensitive create authorization', () => {
    it.each(['support', 'editor'])(
      'denies bounded coupon creation to %s',
      async (role) => {
        const service = await buildService();
        mockCreatedCoupon();

        await expect(
          service.create(boundedCreateDto(), { ...actor, role }),
        ).rejects.toBeInstanceOf(ForbiddenException);
        expect(create).not.toHaveBeenCalled();
      },
    );

    it('allows an approver to create a bounded partial-discount coupon', async () => {
      const service = await buildService();
      mockCreatedCoupon();

      await expect(
        service.create(boundedCreateDto(), approverActor),
      ).resolves.toMatchObject({ code: 'SAVE10' });
      expect(create).toHaveBeenCalledWith(
        [expect.objectContaining({ code: 'SAVE10' })],
        { session },
      );
      expect(appendRequired).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'fee_coupon.created' }),
        session,
      );
      expect(withTransaction).toHaveBeenCalledTimes(1);
      expect(endSession).toHaveBeenCalledTimes(1);
    });

    it.each([
      {
        label: 'unlimited',
        patch: { unlimited_quantity: true, quantity: undefined },
      },
      {
        label: 'waive mode',
        patch: { discount_mode: 'waive' as const, discount_value: undefined },
      },
      {
        label: '100 percent',
        patch: { discount_mode: 'percent' as const, discount_value: 100 },
      },
    ])('denies $label coupon creation to an approver', async ({ patch }) => {
      const service = await buildService();
      mockCreatedCoupon();

      await expect(
        service.create({ ...boundedCreateDto(), ...patch }, approverActor),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(create).not.toHaveBeenCalled();
    });

    it('allows a superadmin to create an unlimited full-waiver coupon', async () => {
      const service = await buildService();
      mockCreatedCoupon({
        discount_mode: 'waive',
        discount_value: 0,
        unlimited_quantity: true,
        quantity: undefined,
      });

      await expect(
        service.create(
          {
            ...boundedCreateDto(),
            discount_mode: 'waive',
            discount_value: undefined,
            unlimited_quantity: true,
            quantity: undefined,
          },
          superadminActor,
        ),
      ).resolves.toMatchObject({
        discount_mode: 'waive',
        unlimited_quantity: true,
      });
    });

    it('aborts creation when the required audit append fails', async () => {
      const service = await buildService();
      mockCreatedCoupon();
      appendRequired.mockRejectedValueOnce(new Error('audit unavailable'));

      await expect(
        service.create(boundedCreateDto(), approverActor),
      ).rejects.toThrow('audit unavailable');
      expect(withTransaction).toHaveBeenCalledTimes(1);
      expect(appendRequired).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'fee_coupon.created' }),
        session,
      );
      expect(endSession).toHaveBeenCalledTimes(1);
    });
  });

  describe('role-sensitive update authorization', () => {
    const couponId = new Types.ObjectId().toHexString();

    it('denies support before loading or changing the coupon', async () => {
      const service = await buildService();

      await expect(
        service.update(couponId, { name: 'Renamed' }, supportActor),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(findById).not.toHaveBeenCalled();
    });

    it('allows an approver to update a bounded partial-discount coupon', async () => {
      const service = await buildService();
      const coupon = existingCoupon();
      findById.mockResolvedValue(coupon);

      await expect(
        service.update(couponId, { name: 'Renamed' }, approverActor),
      ).resolves.toMatchObject({ name: 'Save ten' });
      expect(findById).toHaveBeenCalledWith(couponId, null, { session });
      expect(coupon.save).toHaveBeenCalledWith({ session });
      expect(appendRequired).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'fee_coupon.updated' }),
        session,
      );
      expect(withTransaction).toHaveBeenCalledTimes(1);
      expect(endSession).toHaveBeenCalledTimes(1);
    });

    it.each([
      {
        label: 'unlimited',
        dto: { unlimited_quantity: true },
      },
      {
        label: 'waive mode',
        dto: { discount_mode: 'waive' as const },
      },
      {
        label: '100 percent',
        dto: { discount_mode: 'percent' as const, discount_value: 100 },
      },
    ] satisfies Array<{ label: string; dto: UpdateWithdrawFeeCouponDto }>)(
      'denies an approver updating a coupon to $label',
      async ({ dto }) => {
        const service = await buildService();
        const coupon = existingCoupon();
        findById.mockResolvedValue(coupon);

        await expect(
          service.update(couponId, dto, approverActor),
        ).rejects.toBeInstanceOf(ForbiddenException);
        expect(coupon.save).not.toHaveBeenCalled();
      },
    );

    it('allows a superadmin to update a coupon to unlimited full waiver', async () => {
      const service = await buildService();
      const coupon = existingCoupon();
      findById.mockResolvedValue(coupon);

      await expect(
        service.update(
          couponId,
          { discount_mode: 'waive', unlimited_quantity: true },
          superadminActor,
        ),
      ).resolves.toMatchObject({ code: 'SAVE10' });
      expect(coupon.save).toHaveBeenCalledTimes(1);
    });

    it('aborts an update when the required audit append fails', async () => {
      const service = await buildService();
      const coupon = existingCoupon();
      findById.mockResolvedValue(coupon);
      appendRequired.mockRejectedValueOnce(new Error('audit unavailable'));

      await expect(
        service.update(couponId, { name: 'Renamed' }, approverActor),
      ).rejects.toThrow('audit unavailable');
      expect(coupon.save).toHaveBeenCalledWith({ session });
      expect(appendRequired).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'fee_coupon.updated' }),
        session,
      );
      expect(withTransaction).toHaveBeenCalledTimes(1);
      expect(endSession).toHaveBeenCalledTimes(1);
    });
  });
});
