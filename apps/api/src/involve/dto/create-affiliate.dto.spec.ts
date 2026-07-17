import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateAffiliateDto } from './create-involve.dto';

describe('CreateAffiliateDto destination contract', () => {
  it('accepts an explicit empty destination for a general Shop Now link', async () => {
    const dto = plainToInstance(CreateAffiliateDto, {
      offer_id: 5031,
      merchant_id: 103877,
      deeplink: '',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it.each([undefined, null, 123, [], {}])(
    'rejects a missing or non-string destination %p',
    async (deeplink) => {
      const dto = plainToInstance(CreateAffiliateDto, {
        offer_id: 5031,
        merchant_id: 103877,
        deeplink,
      });

      const errors = await validate(dto);
      expect(errors.some((error) => error.property === 'deeplink')).toBe(true);
    },
  );

  it('accepts a destination at the 2,048-character request boundary', async () => {
    const dto = plainToInstance(CreateAffiliateDto, {
      offer_id: 5031,
      merchant_id: 103877,
      deeplink: `https://merchant.example/?q=${'a'.repeat(2020)}`,
    });

    expect(dto.deeplink).toHaveLength(2048);
    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('rejects a destination over 2,048 characters', async () => {
    const dto = plainToInstance(CreateAffiliateDto, {
      offer_id: 5031,
      merchant_id: 103877,
      deeplink: `https://merchant.example/?q=${'a'.repeat(2021)}`,
    });

    expect(dto.deeplink).toHaveLength(2049);
    const errors = await validate(dto);
    expect(errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          property: 'deeplink',
          constraints: expect.objectContaining({
            maxLength: expect.any(String),
          }),
        }),
      ]),
    );
  });
});
