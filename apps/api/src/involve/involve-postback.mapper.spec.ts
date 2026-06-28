import {
  mapPostbackQueryToConversion,
  normalizeConversionStatus,
  sanitizePostbackQuery,
} from './involve-postback.mapper';

describe('normalizeConversionStatus', () => {
  it('given paid > then returns approved', () => {
    expect(normalizeConversionStatus('paid')).toBe('approved');
  });

  it('given pending > then returns pending', () => {
    expect(normalizeConversionStatus('pending')).toBe('pending');
  });

  it('given undefined > then defaults to pending', () => {
    expect(normalizeConversionStatus(undefined)).toBe('pending');
  });
});

describe('mapPostbackQueryToConversion', () => {
  const HEX24 = '68bf99fed9667685c1637607';

  it('given aff_sub user_id:hex > then sets aff_sub1 and omits aff_sub', () => {
    const mapped = mapPostbackQueryToConversion(
      {
        conversion_id: '12345',
        offer_id: '99',
        offer_name: 'Shopee%20TH',
        datetime_conversion: '2026-06-01 12:00:00',
        sale_amount_local: '100.50',
        payout_local: '5.25',
        conversion_currency: 'THB',
        aff_sub: `user_id:${HEX24}`,
        status: 'pending',
      },
      42,
    );

    expect(mapped).toMatchObject({
      conversion_id: 12345,
      offer_id: 99,
      offer_name: 'Shopee TH',
      merchant_id: 42,
      aff_sub1: `user_id:${HEX24}`,
      conversion_status: 'pending',
      currency: 'THB',
      sale_amount: 100.5,
      payout: 5.25,
    });
    expect((mapped?.raw as Record<string, unknown>)?.source).toBe(
      'involve_postback',
    );
  });

  it('given status paid > then stores approved', () => {
    const mapped = mapPostbackQueryToConversion(
      {
        conversion_id: '1',
        offer_id: '2',
        offer_name: 'Offer',
        datetime_conversion: '2026-06-01 12:00:00',
        status: 'paid',
      },
      10,
    );

    expect(mapped?.conversion_status).toBe('approved');
  });

  it('given missing conversion_id > then returns null', () => {
    expect(
      mapPostbackQueryToConversion({ offer_id: '1' }, 0),
    ).toBeNull();
  });

  it('given unknown offer (merchant_id 0) > then flags missing_merchant_id', () => {
    const mapped = mapPostbackQueryToConversion(
      {
        conversion_id: '1',
        offer_id: '999',
        offer_name: 'Unknown',
        datetime_conversion: '2026-06-01 12:00:00',
        status: 'pending',
      },
      0,
    );

    expect(mapped).toMatchObject({
      merchant_id: 0,
      flagged: true,
      flag_reason: 'missing_merchant_id',
    });
  });

  it('given adv_sub > then maps to adv_sub1', () => {
    const mapped = mapPostbackQueryToConversion(
      {
        conversion_id: '1',
        offer_id: '2',
        offer_name: 'Offer',
        datetime_conversion: '2026-06-01 12:00:00',
        adv_sub: 'order-abc',
        status: 'approved',
      },
      5,
    );

    expect(mapped?.adv_sub1).toBe('order-abc');
  });

  it('sanitizePostbackQuery > given array query values > then keeps first string only', () => {
    const sanitized = sanitizePostbackQuery({
      conversion_id: ['123', '456'],
      offer_id: '99',
      datetime_conversion: ['2026-06-01 12:00:00', 'ignored'],
    });

    expect(sanitized).toEqual({
      conversion_id: '123',
      offer_id: '99',
      datetime_conversion: '2026-06-01 12:00:00',
    });
  });

  it('given malformed datetime > then falls back without throwing', () => {
    const mapped = mapPostbackQueryToConversion(
      {
        conversion_id: '1',
        offer_id: '2',
        offer_name: 'Offer',
        datetime_conversion: 'not-a-date',
        status: 'pending',
      },
      5,
    );

    expect(mapped?.datetime_conversion).toBeInstanceOf(Date);
  });
});
