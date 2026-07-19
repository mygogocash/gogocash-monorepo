import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  CreateWithdrawFeeCouponDto,
  UpdateWithdrawFeeCouponDto,
} from './withdraw-fee-coupon.dto';

const validCreate = {
  code: 'SAVE10',
  name: 'Save ten',
  discount_mode: 'waive',
  start_at: '2026-01-01T00:00:00.000Z',
  end_at: '2026-12-31T00:00:00.000Z',
};

describe('withdraw fee coupon integer contract', () => {
  it.each(['quantity', 'usage_per_user'] as const)(
    'rejects fractional create %s',
    async (property) => {
      const dto = plainToInstance(CreateWithdrawFeeCouponDto, {
        ...validCreate,
        [property]: 1.5,
      });
      const errors = await validate(dto);

      expect(errors.map((error) => error.property)).toContain(property);
    },
  );

  it.each(['quantity', 'usage_per_user'] as const)(
    'rejects fractional update %s',
    async (property) => {
      const dto = plainToInstance(UpdateWithdrawFeeCouponDto, {
        [property]: 1.5,
      });
      const errors = await validate(dto);

      expect(errors.map((error) => error.property)).toContain(property);
    },
  );
});
