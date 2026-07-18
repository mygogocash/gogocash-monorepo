import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { WithdrawFeeCouponsService } from './withdraw-fee-coupons.service';
import { WithdrawFeeCoupon } from 'src/withdraw/schemas/withdraw-fee-coupon.schema';

describe('WithdrawFeeCouponsService', () => {
  const create = jest.fn();
  const find = jest.fn();
  const countDocuments = jest.fn();
  const findById = jest.fn();

  beforeEach(async () => {
    create.mockReset();
    find.mockReset();
    countDocuments.mockReset();
    findById.mockReset();
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
      ],
    }).compile();
    return moduleRef.get(WithdrawFeeCouponsService);
  }

  it('create > given fixed mode without discount_value > then rejects', async () => {
    const service = await buildService();
    await expect(
      service.create({
        code: 'SAVE10',
        name: 'Save',
        discount_mode: 'fixed',
        start_at: '2026-01-01T00:00:00.000Z',
        end_at: '2026-12-31T00:00:00.000Z',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(create).not.toHaveBeenCalled();
  });

  it('create > given waive mode > then persists with discount_value 0', async () => {
    const service = await buildService();
    create.mockResolvedValue({
      toObject: () => ({
        code: 'FREEFEE',
        discount_mode: 'waive',
        discount_value: 0,
      }),
    });

    const result = await service.create({
      code: 'freefee',
      name: 'Free fee',
      discount_mode: 'waive',
      start_at: '2026-01-01T00:00:00.000Z',
      end_at: '2026-12-31T00:00:00.000Z',
    });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'FREEFEE',
        discount_mode: 'waive',
        discount_value: 0,
        applies_to: ['bank_transfer'],
      }),
    );
    expect(result).toMatchObject({ code: 'FREEFEE' });
  });
});
