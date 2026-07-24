import { mapCategoryKey } from './involve-xtra.category-map';
import {
  isServable,
  mapCampaignRow,
  mapShopeeXtraRow,
  parseCashbackRate,
} from './involve-xtra.mappers';

describe('parseCashbackRate (REQ-DM-2)', () => {
  it('parses a fractional string', () => {
    expect(parseCashbackRate('0.0150')).toBe(0.015);
    expect(parseCashbackRate('0.0325')).toBe(0.0325);
    expect(parseCashbackRate(0.02)).toBe(0.02);
  });
  it('rejects empty/malformed/negative rather than storing NaN', () => {
    expect(parseCashbackRate('')).toBeNull();
    expect(parseCashbackRate('abc')).toBeNull();
    expect(parseCashbackRate(null)).toBeNull();
    expect(parseCashbackRate(undefined)).toBeNull();
    expect(parseCashbackRate('-0.1')).toBeNull();
  });
});

describe('mapCategoryKey (REQ-DM-4)', () => {
  it('maps known categories', () => {
    expect(mapCategoryKey('Health & Beauty')).toBe('beauty');
    expect(mapCategoryKey('Marketplace')).toBe('shopping');
    expect(mapCategoryKey('Travel')).toBe('travel');
  });
  it('unknown present category -> default; null/empty -> null', () => {
    expect(mapCategoryKey('Nonsense')).toBe('default');
    expect(mapCategoryKey(null)).toBeNull();
    expect(mapCategoryKey('')).toBeNull();
    expect(mapCategoryKey(undefined)).toBeNull();
  });
});

describe('mapShopeeXtraRow (REQ-DM-1)', () => {
  const validRow = {
    shop_id: 1001,
    shop_name: 'Alpha Mall Store',
    shop_type: 'mall',
    shop_link: 'https://shopee.co.th/alpha',
    shop_image: 'https://cf/alpha',
    shop_banner: ['https://cf/alpha-banner'],
    offer_name: 'Shopee Thailand',
    country: 'Thailand',
    commission_rate: '0.0150',
    period_end_time: '2026-12-31 23:59:59',
    tracking_link: 'https://invl.me/alpha',
  };

  it('maps a valid row with cashbackRate + null categoryKey + a stable hash', () => {
    const mapped = mapShopeeXtraRow(validRow);
    expect(mapped).not.toBeNull();
    expect(mapped!.shopId).toBe(1001);
    expect(mapped!.cashbackRate).toBe(0.015);
    expect(mapped!.shopType).toBe('mall');
    expect(mapped!.categoryKey).toBeNull();
    expect(mapped!.source).toBe('involve_shopeextra');
    expect(mapped!.marketplace).toBe('shopee');
    expect(mapped!.commissionRateRaw).toBe('0.0150');
    expect(mapped!.periodEnd).toBeInstanceOf(Date);
    expect(mapped!.sourceHash).toMatch(/^[a-f0-9]{64}$/);
    // Hash is stable for identical input.
    expect(mapShopeeXtraRow(validRow)!.sourceHash).toBe(mapped!.sourceHash);
    // Hash changes when a display field changes.
    expect(
      mapShopeeXtraRow({ ...validRow, commission_rate: '0.0200' })!.sourceHash,
    ).not.toBe(mapped!.sourceHash);
  });

  it('rejects rows missing required fields or with a malformed rate', () => {
    expect(mapShopeeXtraRow({ ...validRow, commission_rate: '' })).toBeNull();
    expect(mapShopeeXtraRow({ ...validRow, shop_id: undefined })).toBeNull();
    expect(mapShopeeXtraRow({ ...validRow, tracking_link: '' })).toBeNull();
    expect(mapShopeeXtraRow({ ...validRow, shop_name: '  ' })).toBeNull();
  });

  it('drops an unrecognized shop_type instead of storing it', () => {
    expect(
      mapShopeeXtraRow({ ...validRow, shop_type: 'weird' })!.shopType,
    ).toBeUndefined();
  });
});

describe('mapCampaignRow (REQ-DM-7)', () => {
  it('maps a voucher campaign and flags withBanner', () => {
    const mapped = mapCampaignRow({
      campaign_banner_id: 55,
      offer_id: 900,
      offer_name: 'Shopee Thailand',
      campaign_name: 'Mid-month',
      voucher_code: 'SAVE20',
      categories: 'Fashion',
      banner_image_url: 'https://cf/banner',
      date_campaign_end: '2026-08-01 00:00:00',
      tracking_link: 'https://invl.me/deal',
    });
    expect(mapped).not.toBeNull();
    expect(mapped!.campaignBannerId).toBe(55);
    expect(mapped!.voucherCode).toBe('SAVE20');
    expect(mapped!.categoryKey).toBe('fashion');
    expect(mapped!.withBanner).toBe(true);
  });
  it('rejects a campaign with no banner id or tracking link', () => {
    expect(
      mapCampaignRow({ campaign_banner_id: undefined, tracking_link: 'x' }),
    ).toBeNull();
    expect(
      mapCampaignRow({ campaign_banner_id: 1, tracking_link: '' }),
    ).toBeNull();
  });
});

describe('isServable (REQ-DM-6)', () => {
  const now = new Date('2026-07-24T00:00:00Z');
  it('serves active rows within the window; excludes past-end or inactive', () => {
    expect(isServable(true, new Date('2026-12-31T00:00:00Z'), now)).toBe(true);
    expect(isServable(true, null, now)).toBe(true);
    expect(isServable(true, new Date('2026-01-01T00:00:00Z'), now)).toBe(false);
    expect(isServable(false, new Date('2026-12-31T00:00:00Z'), now)).toBe(
      false,
    );
  });
});
