import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { UpdateBannerHomeDto } from './update-admin.dto';

/**
 * Admin banner-home accepts per-slot multipart updates: only the edited slot's
 * link/enabled/dates (and optional file) are sent. Omitted slots must not 400.
 */
const errorsFor = async (plain: Record<string, unknown>) =>
  validate(plainToInstance(UpdateBannerHomeDto, plain));

const hasError = (errors: { property: string }[], property: string): boolean =>
  errors.some((e) => e.property === property);

describe('UpdateBannerHomeDto validation', () => {
  it('given a single-slot partial body > then there are no validation errors', async () => {
    const errors = await errorsFor({
      link_3: '/promo',
      enabled_3: 'true',
      start_date_3: '2026-07-01',
      end_date_3: '2026-07-31',
    });

    expect(errors).toHaveLength(0);
  });

  it('given clear_image for one slot > then there are no validation errors', async () => {
    const errors = await errorsFor({
      link_2: '',
      enabled_2: 'false',
      start_date_2: '',
      end_date_2: '',
      clear_image_2: 'true',
    });

    expect(errors).toHaveLength(0);
  });

  it('given a non-string link for a sent slot > then validation reports that link error', async () => {
    const errors = await errorsFor({
      link_1: 123,
    });

    expect(hasError(errors, 'link_1')).toBe(true);
  });
});
