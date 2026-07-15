import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { SaveTopBrandsDto } from './update-admin.dto';

describe('SaveTopBrandsDto', () => {
  it('rejects more than sixteen homepage brands', async () => {
    const dto = plainToInstance(SaveTopBrandsDto, {
      brands: Array.from({ length: 17 }, (_, index) => ({
        offerId: `offer-${index}`,
        cashback: '999% ignored',
      })),
    });

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'brands')).toBe(true);
  });
});
