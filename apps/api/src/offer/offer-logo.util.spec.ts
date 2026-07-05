import { resolvePublicOfferLogo } from './offer-logo.util';

describe('resolvePublicOfferLogo', () => {
  it('resolvePublicOfferLogo > given admin desktop logo > then prefers it over circle and legacy', () => {
    expect(
      resolvePublicOfferLogo({
        logo_desktop: 'https://media/admin-logo.png',
        logo_circle: 'https://media/circle.png',
        logo: 'https://involve/legacy.png',
      }),
    ).toBe('https://media/admin-logo.png');
  });

  it('resolvePublicOfferLogo > given only legacy involve logo > then falls back to logo', () => {
    expect(
      resolvePublicOfferLogo({
        logo: 'https://involve/legacy.png',
      }),
    ).toBe('https://involve/legacy.png');
  });

  it('resolvePublicOfferLogo > given mobile only > then uses mobile before circle', () => {
    expect(
      resolvePublicOfferLogo({
        logo_mobile: 'https://media/mobile.png',
        logo_circle: 'https://media/circle.png',
      }),
    ).toBe('https://media/mobile.png');
  });
});
