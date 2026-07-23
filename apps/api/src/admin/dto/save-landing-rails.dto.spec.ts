import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { SaveLandingRailsDto } from './update-admin.dto';
import { MAX_LANDING_RAILS } from 'src/offer/landing-rail.contract';

describe('SaveLandingRailsDto', () => {
  it('SaveLandingRailsDto > given a valid rail > then it passes validation', async () => {
    const dto = plainToInstance(SaveLandingRailsDto, {
      rails: [
        {
          railId: 'trending',
          title: 'Trending Brands',
          emoji: '',
          link: '/brand',
          position: 0,
          enabled: true,
          brandsDesktop: [{ offerId: 'offer-1', cashback: '5%' }],
          brandsMobile: [{ offerId: 'offer-1', cashback: '5%' }],
        },
      ],
    });

    expect(await validate(dto)).toHaveLength(0);
  });

  it('SaveLandingRailsDto > given a rail without railId > then it fails validation', async () => {
    const dto = plainToInstance(SaveLandingRailsDto, {
      rails: [{ title: 'No id' }],
    });

    const errors = await validate(dto);
    expect(errors.some((error) => error.property === 'rails')).toBe(true);
  });

  it('SaveLandingRailsDto > given more than the max rails > then it fails validation', async () => {
    const dto = plainToInstance(SaveLandingRailsDto, {
      rails: Array.from({ length: MAX_LANDING_RAILS + 1 }, (_, index) => ({
        railId: `rail-${index}`,
        title: `Rail ${index}`,
      })),
    });

    const errors = await validate(dto);
    expect(errors.some((error) => error.property === 'rails')).toBe(true);
  });

  it('SaveLandingRailsDto > given more than sixteen brands on a rail > then it fails validation', async () => {
    const dto = plainToInstance(SaveLandingRailsDto, {
      rails: [
        {
          railId: 'trending',
          title: 'Trending',
          brandsDesktop: Array.from({ length: 17 }, (_, index) => ({
            offerId: `offer-${index}`,
            cashback: '',
          })),
        },
      ],
    });

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});
