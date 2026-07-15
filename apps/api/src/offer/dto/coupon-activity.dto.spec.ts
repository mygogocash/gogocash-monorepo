import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  RecordCouponEngagementDto,
  RecordCouponRedemptionDto,
} from './coupon-activity.dto';

describe('coupon activity DTOs', () => {
  it('accepts only public view/copy event types', async () => {
    await expect(
      validate(
        plainToInstance(RecordCouponEngagementDto, {
          eventId: 'view-page-123456',
          eventType: 'view',
        }),
      ),
    ).resolves.toHaveLength(0);

    const forgedRedemption = await validate(
      plainToInstance(RecordCouponEngagementDto, {
        eventId: 'forged-redemption-123456',
        eventType: 'redemption',
      }),
    );
    expect(forgedRedemption).not.toHaveLength(0);
  });

  it('validates trusted redemption references and optional identity fields', async () => {
    await expect(
      validate(
        plainToInstance(RecordCouponRedemptionDto, {
          occurredAt: '2026-07-15T08:30:00.000Z',
          referenceId: 'merchant-order-42',
          userEmail: 'member@example.com',
          userId: 'customer-42',
        }),
      ),
    ).resolves.toHaveLength(0);

    const invalid = await validate(
      plainToInstance(RecordCouponRedemptionDto, {
        referenceId: 'x',
        userEmail: 'not-an-email',
      }),
    );
    expect(invalid.length).toBeGreaterThan(0);
  });
});
