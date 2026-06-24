type GogosenseMerchantSeed = {
  merchant_id: string;
  brand_id: string;
  brand_slug: string;
  merchant_name: string;
  android_packages: string[];
  domains: string[];
  offer_id: number;
  network_merchant_id: number;
  cashback_rate: string;
  affiliate_network: string;
  supported_platforms: string[];
  enabled: boolean;
  confidence_threshold: number;
};

const platforms = ['android', 'ios', 'web', 'line'];

const SHOPEE_TH_OFFER_ID = 5030;
const SHOPEE_TH_NETWORK_MERCHANT_ID = 103876;

const candidate = (
  slug: string,
  merchantName: string,
  androidPackages: string[],
  domains: string[],
  offerId = 0,
  networkMerchantId = 0,
): GogosenseMerchantSeed => ({
  merchant_id: `merchant-${slug}`,
  brand_id: `brand-${slug}`,
  brand_slug: slug,
  merchant_name: merchantName,
  android_packages: androidPackages,
  domains,
  offer_id: offerId,
  network_merchant_id: networkMerchantId,
  cashback_rate: '',
  affiliate_network: 'involve',
  supported_platforms: platforms,
  enabled: false,
  confidence_threshold: 0.75,
});

// Disabled by default until ops maps each row to verified Involve offer and
// network merchant IDs. These rows freeze the first MVP detection target list.
export const defaultGogosenseMerchants: GogosenseMerchantSeed[] = [
  candidate(
    'shopee',
    'Shopee',
    ['com.shopee.th'],
    ['shopee.co.th'],
    SHOPEE_TH_OFFER_ID,
    SHOPEE_TH_NETWORK_MERCHANT_ID,
  ),
  candidate('lazada', 'Lazada', ['com.lazada.android'], ['lazada.co.th']),
  candidate('temu', 'Temu', ['com.einnovation.temu'], ['temu.com']),
  candidate('tiktok-shop', 'TikTok Shop', [], ['shop.tiktok.com']),
  candidate('agoda', 'Agoda', ['com.agoda.mobile.consumer'], ['agoda.com']),
  candidate('booking', 'Booking.com', ['com.booking'], ['booking.com']),
  candidate('klook', 'Klook', ['com.klook'], ['klook.com']),
  candidate(
    'traveloka',
    'Traveloka',
    ['com.traveloka.android'],
    ['traveloka.com'],
  ),
  candidate('trip-com', 'Trip.com', [], ['trip.com']),
  candidate('airasia', 'AirAsia', ['com.airasia.mobile'], ['airasia.com']),
  candidate('grab', 'Grab', ['com.grabtaxi.passenger'], ['grab.com']),
  candidate(
    'line-man',
    'LINE MAN',
    ['com.linecorp.linemanth'],
    ['lineman.line.me'],
  ),
  candidate(
    'foodpanda',
    'foodpanda',
    ['com.global.foodpanda.android'],
    ['foodpanda.co.th'],
  ),
  candidate('central', 'Central Online', [], ['central.co.th']),
  candidate('robinson', 'Robinson', [], ['robinson.co.th']),
  candidate('watsons', 'Watsons', [], ['watsons.co.th']),
  candidate('boots', 'Boots Thailand', [], ['boots.co.th']),
  candidate('sephora', 'Sephora', ['com.sephora'], ['sephora.co.th']),
  candidate('apple', 'Apple', [], ['apple.com']),
  candidate('samsung', 'Samsung', [], ['samsung.com']),
  candidate('nike', 'Nike', ['com.nike.omega'], ['nike.com']),
  candidate('adidas', 'adidas', ['com.adidas.app'], ['adidas.co.th']),
  candidate('uniqlo', 'UNIQLO', [], ['uniqlo.com']),
  candidate('pomelo', 'Pomelo', [], ['pomelofashion.com']),
  candidate('shein', 'SHEIN', ['com.zzkko'], ['shein.com']),
  candidate('iherb', 'iHerb', ['com.iherb'], ['iherb.com']),
  candidate(
    'amazon',
    'Amazon',
    ['com.amazon.mShop.android.shopping'],
    ['amazon.com'],
  ),
  candidate(
    'aliexpress',
    'AliExpress',
    ['com.alibaba.aliexpresshd'],
    ['aliexpress.com'],
  ),
  candidate('ebay', 'eBay', ['com.ebay.mobile'], ['ebay.com']),
  candidate('decathlon', 'Decathlon', [], ['decathlon.co.th']),
];
