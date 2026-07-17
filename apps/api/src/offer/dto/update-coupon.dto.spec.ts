import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { Types } from 'mongoose';
import { UpdateCouponDto } from './update-offer.dto';

describe('UpdateCouponDto validation', () => {
  const offerId = new Types.ObjectId().toHexString();
  const couponPayload = (disabled: unknown) => ({
    name: 'Boundary coupon',
    offer_id: offerId,
    start_date: '2026-07-01',
    end_date: '2026-07-31',
    discount: 10,
    quantity: 1,
    disabled,
  });

  it.each([
    [false, false],
    [true, true],
    ['false', false],
    ['true', true],
  ])(
    'given disabled=%p > then accepts and normalizes it to boolean %p',
    async (input, expected) => {
      const dto = plainToInstance(UpdateCouponDto, couponPayload(input));

      expect(await validate(dto)).toHaveLength(0);
      expect(dto.disabled).toBe(expected);
      expect(typeof dto.disabled).toBe('boolean');
    },
  );

  it.each([123, [], {}, null])(
    'given non-string min_spend=%p > then rejects it without throwing',
    async (minSpend) => {
      const dto = plainToInstance(UpdateCouponDto, {
        ...couponPayload(false),
        min_spend: minSpend,
      });

      await expect(validate(dto)).resolves.toEqual(
        expect.arrayContaining([
          expect.objectContaining({ property: 'min_spend' }),
        ]),
      );
    },
  );

  it('given omitted redemption fields > then preserves sparse validation semantics', async () => {
    const dto = plainToInstance(UpdateCouponDto, couponPayload(false));

    expect(await validate(dto)).toHaveLength(0);
    expect(dto.one_time_use_enabled).toBeUndefined();
    expect(dto.usage_per_user).toBeUndefined();
  });

  it.each([
    [{ one_time_use_enabled: null }, 'one_time_use_enabled'],
    [{ usage_per_user: null }, 'usage_per_user'],
  ])(
    'given an explicitly null redemption field %p > then rejects %s',
    async (fields, property) => {
      const dto = plainToInstance(UpdateCouponDto, {
        ...couponPayload(false),
        ...fields,
      });

      const errors = await validate(dto);
      expect(errors.some((error) => error.property === property)).toBe(true);
    },
  );

  it.each(['FALSE', 'true ', 0, 1, null, [], {}])(
    'given invalid disabled=%p > then rejects it instead of truthy coercion',
    async (input) => {
      const dto = plainToInstance(UpdateCouponDto, couponPayload(input));
      const errors = await validate(dto);

      expect(errors.some((error) => error.property === 'disabled')).toBe(true);
    },
  );

  it('given a create payload without code > then validation passes', async () => {
    const dto = plainToInstance(UpdateCouponDto, {
      name: 'ABC',
      description: '',
      code: '',
      offer_id: offerId,
      start_date: '2026-06-27',
      end_date: '2026-07-11',
      eligibility: '',
      min_spend: '',
      discount: 100,
      quantity: 0,
      link: '',
      disabled: false,
    });

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('given only required create fields > then validation passes', async () => {
    const dto = plainToInstance(UpdateCouponDto, {
      name: 'Summer',
      offer_id: offerId,
      start_date: '2026-06-27',
      end_date: '2026-07-11',
      discount: 10,
      quantity: 0,
    });

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('given the full customer display contract > then validation passes', async () => {
    const dto = plainToInstance(UpdateCouponDto, {
      name: 'Member deal',
      offer_id: offerId,
      start_date: '2026-07-01',
      end_date: '2026-07-31',
      code_enabled: false,
      one_time_use_enabled: false,
      usage_per_user: 3,
      unlimited_amount_enabled: false,
      max_cap: 500,
      max_cap_enabled: true,
      max_cap_currency: 'THB',
      min_spend_currency: 'THB',
      discount_type: 'cash',
      discount_currency: 'THB',
      start_time: '09:30',
      end_time: '22:15',
      terms_and_conditions: 'Valid for members only.',
    });

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
    expect(dto).toMatchObject({
      discount_type: 'cash',
      discount_currency: 'THB',
      start_time: '09:30',
      end_time: '22:15',
    });
  });

  it.each(['9:30', '09:30:00', '24:00', '09:60', 'noon'])(
    'given invalid coupon time %p > then rejects the exact HH:mm contract',
    async (time) => {
      const dto = plainToInstance(UpdateCouponDto, {
        ...couponPayload(false),
        start_time: time,
      });

      const errors = await validate(dto);
      expect(errors.some((error) => error.property === 'start_time')).toBe(
        true,
      );
    },
  );

  it('given code_enabled=true without a nonempty code > then rejects it', async () => {
    const dto = plainToInstance(UpdateCouponDto, {
      ...couponPayload(false),
      code_enabled: true,
      code: '   ',
    });

    const errors = await validate(dto);
    expect(errors.some((error) => error.property === 'code')).toBe(true);
  });

  it('given a malformed explicitly supplied disabled code > then still validates its type', async () => {
    const dto = plainToInstance(UpdateCouponDto, {
      ...couponPayload(false),
      code_enabled: false,
      code: 123,
    });

    const errors = await validate(dto);
    expect(errors.some((error) => error.property === 'code')).toBe(true);
  });

  it.each([
    [{ max_cap_enabled: true }, 'max_cap'],
    [{ max_cap_enabled: true, max_cap: 0, max_cap_currency: 'THB' }, 'max_cap'],
    [{ max_cap_enabled: true, max_cap: 100 }, 'max_cap_currency'],
  ])(
    'given an incomplete enabled max cap %p > then rejects %s',
    async (fields, property) => {
      const dto = plainToInstance(UpdateCouponDto, {
        ...couponPayload(false),
        ...fields,
      });

      const errors = await validate(dto);
      expect(errors.some((error) => error.property === property)).toBe(true);
    },
  );

  it.each([
    [{ max_cap_enabled: false, max_cap: -1 }, 'max_cap'],
    [{ max_cap_enabled: false, max_cap_currency: 123 }, 'max_cap_currency'],
  ])(
    'given an explicitly supplied malformed disabled max cap %p > then rejects %s',
    async (fields, property) => {
      const dto = plainToInstance(UpdateCouponDto, {
        ...couponPayload(false),
        ...fields,
      });
      const errors = await validate(dto);
      expect(errors.some((error) => error.property === property)).toBe(true);
    },
  );

  it.each([
    [{ discount_type: 'cash' }, 'discount_currency'],
    [{ discount_type: 'cash', discount_currency: '   ' }, 'discount_currency'],
    [{ min_spend: '500' }, 'min_spend_currency'],
    [{ min_spend: '500', min_spend_currency: '   ' }, 'min_spend_currency'],
  ])(
    'given active money configuration %p without currency > then rejects %s',
    async (fields, property) => {
      const dto = plainToInstance(UpdateCouponDto, {
        ...couponPayload(false),
        ...fields,
      });
      const errors = await validate(dto);
      expect(errors.some((error) => error.property === property)).toBe(true);
    },
  );
});
