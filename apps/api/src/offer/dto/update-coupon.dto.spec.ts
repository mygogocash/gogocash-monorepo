import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { Types } from 'mongoose';
import { UpdateCouponDto } from './update-offer.dto';

describe('UpdateCouponDto validation', () => {
  const offerId = new Types.ObjectId().toHexString();

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
});
