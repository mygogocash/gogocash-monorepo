import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateSearchRuleDto, UpdateSearchRuleDto } from './search.dto';

describe('search rule DTO contract', () => {
  it('accepts the persistent offer-targeted rule shape', async () => {
    const dto = plainToInstance(CreateSearchRuleDto, {
      offer_id: '507f1f77bcf86cd799439011',
      treatment: 'pinned',
      keywords: ['travel', 'hotel'],
      weight: 10,
      is_active: true,
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('rejects invalid treatments, offer ids, keyword values, and weights', async () => {
    const dto = plainToInstance(CreateSearchRuleDto, {
      offer_id: 'not-an-offer-id',
      treatment: 'hidden',
      keywords: ['valid', 123],
      weight: -1,
    });

    const errors = await validate(dto);

    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(['offer_id', 'treatment', 'keywords', 'weight']),
    );
  });

  it('allows a partial update while validating supplied fields', async () => {
    await expect(
      validate(
        plainToInstance(UpdateSearchRuleDto, {
          keywords: ['cashback'],
          is_active: false,
        }),
      ),
    ).resolves.toHaveLength(0);
  });
});
