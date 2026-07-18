// Guards the deliberate duplication between the API's runtime normalizer and
// the canonical @gogocash/contracts implementation (#19 P4-1): the API's
// SWC-built runtime cannot load the source-consumed contracts package, so the
// implementation lives twice — this spec turns silent drift into a red build.
// The contracts source is imported by relative path (jest transforms it like
// any TS file); the path bypasses package `exports` on purpose so this spec
// needs no build step.
import {
  DEFAULT_OFFER_DISPLAY_TAGS as contractDefaults,
  normalizeOfferDisplayTags as contractNormalize,
  MISSING_ORDER_STATUSES as contractStatuses,
} from '../../../../packages/contracts/src/index';
import {
  DEFAULT_OFFER_DISPLAY_TAGS,
  normalizeOfferDisplayTags,
} from './offer-display-tags.util';
import { MISSION_ORDER_STATUSES } from './schemas/missing-order.schema';

describe('offer-display-tags contract parity', () => {
  it('given the default tag object > then it equals the contracts default', () => {
    expect(DEFAULT_OFFER_DISPLAY_TAGS).toEqual(contractDefaults);
  });

  const corpus: unknown[] = [
    undefined,
    null,
    '',
    'not-an-object',
    42,
    [],
    {},
    { brand_category_enabled: true, brand_category_label: '  Fashion  ' },
    { brand_category_enabled: 'yes', brand_category_label: 7 },
    { extra_cashback_tag: 1, grab_coupon_tag: 0 },
    { expire_in_days_enabled: true, expire_in_days: '14' },
    // Boundary values around the >= 1 floor — a drifted comparison operator
    // (e.g. >= 2) must diverge on at least one corpus input.
    { expire_in_days_enabled: true, expire_in_days: 1 },
    { expire_in_days_enabled: true, expire_in_days: '1' },
    { expire_in_days_enabled: true, expire_in_days: '0' },
    { expire_in_days_enabled: true, expire_in_days: -3 },
    { expire_in_days_enabled: true, expire_in_days: 2.9 },
    { expire_in_days_enabled: true, expire_in_days: 'NaN-ish' },
    { expire_in_days: '' },
    { expire_in_days: null },
    {
      brand_category_enabled: true,
      brand_category_label: 'Beauty',
      extra_cashback_tag: true,
      grab_coupon_tag: true,
      expire_in_days_enabled: true,
      expire_in_days: 30,
      unknown_extra_field: 'dropped',
    },
  ];

  it.each(corpus.map((value, index) => [index, value]))(
    'given corpus input #%s > then API and contracts normalizers agree',
    (_index, value) => {
      expect(normalizeOfferDisplayTags(value)).toEqual(
        contractNormalize(value),
      );
    },
  );

  it('given the missing-order status list > then the API schema matches the contract', () => {
    expect([...MISSION_ORDER_STATUSES]).toEqual([...contractStatuses]);
  });
});
