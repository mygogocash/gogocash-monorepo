import {
  DEFAULT_OFFER_DISPLAY_TAGS,
  normalizeOfferDisplayTags,
  parseOfferDisplayTagsField,
} from './offer-display-tags.util';

describe('offer-display-tags.util', () => {
  it('normalizeOfferDisplayTags > given partial input > then fills defaults and coerces booleans', () => {
    expect(
      normalizeOfferDisplayTags({
        brand_category_enabled: 'true',
        extra_cashback_tag: 1,
        expire_in_days: '7',
      }),
    ).toEqual({
      ...DEFAULT_OFFER_DISPLAY_TAGS,
      brand_category_enabled: true,
      extra_cashback_tag: true,
      expire_in_days_enabled: false,
      expire_in_days: 7,
    });
  });

  it('parseOfferDisplayTagsField > given JSON string > then returns normalized tags', () => {
    expect(
      parseOfferDisplayTagsField(
        JSON.stringify({
          brand_category_enabled: true,
          brand_category_label: 'Shopping',
          grab_coupon_tag: true,
        }),
      ),
    ).toEqual({
      ...DEFAULT_OFFER_DISPLAY_TAGS,
      brand_category_enabled: true,
      brand_category_label: 'Shopping',
      grab_coupon_tag: true,
    });
  });

  it('parseOfferDisplayTagsField > given invalid JSON > then returns undefined', () => {
    expect(parseOfferDisplayTagsField('{not-json')).toBeUndefined();
  });

  it('parseOfferDisplayTagsField > given empty string > then returns undefined', () => {
    expect(parseOfferDisplayTagsField('')).toBeUndefined();
  });
});
