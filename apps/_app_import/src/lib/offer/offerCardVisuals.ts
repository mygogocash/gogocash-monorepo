import { DataOffer } from "@/interfaces/offer";
import { banner, getPercent } from "@/lib/utils";
import {
  normalizeCategoryKey,
  SHOP_EXPLORE_MENU_ITEMS,
} from "@/features/shop/shopExploreCategoryMenu";

export const FALLBACK_BANNER = "/home/banner.webp";

/** Resolved banner URL for CardSpecial / CardShopMini (matches `CardSlideCategory` rules). */
export function getOfferBannerSrc(offer: DataOffer, isDesktopWidth: boolean): string {
  if (offer.banner || offer.banner_mobile) {
    return banner(offer.banner_mobile, offer.banner, isDesktopWidth);
  }
  return FALLBACK_BANNER;
}

/**
 * Resolved 1:1 brand-logo URL for brand-logo tiles.
 * Prefers `logo_circle` (already square), falls back to `logo_desktop` / `logo_mobile` / banner.
 * Substitutes a mock simpleicons logo when the resolved URL is a known dev placeholder, so the
 * Top Brands grid reads like the demo even when seeded mock data lacks real brand artwork.
 */
export function getOfferSquareLogoSrc(offer: DataOffer, isDesktopWidth: boolean): string {
  const resolved = pickResolvedLogo(offer, isDesktopWidth);
  if (isDevPlaceholderLogo(resolved)) {
    return getMockBrandLogoUrl(offer.offer_name || offer._id || "");
  }
  return resolved;
}

function pickResolvedLogo(offer: DataOffer, isDesktopWidth: boolean): string {
  if (offer.logo_circle) return offer.logo_circle;
  if (offer.logo_desktop || offer.logo_mobile) {
    return isDesktopWidth
      ? offer.logo_desktop || offer.logo_mobile
      : offer.logo_mobile || offer.logo_desktop;
  }
  return getOfferBannerSrc(offer, isDesktopWidth);
}

/**
 * Any local asset (anything not served from a remote HTTPS origin) is treated as a dev placeholder
 * so mock offers consistently render a branded simpleicons logo instead of scattered test assets.
 */
function isDevPlaceholderLogo(src: string): boolean {
  if (!src) return true;
  if (src === FALLBACK_BANNER) return true;
  return !/^https?:\/\//i.test(src);
}

/**
 * Curated keyword → simpleicons slug map. Longest/most specific match wins.
 * Falls back to a rotating palette of generic brand slugs so every brand renders a distinct logo.
 */
const BRAND_SLUG_KEYWORDS: Array<[RegExp, string]> = [
  [/grocery|pantry|market|mart|fresh|harvest/i, "instacart"],
  [/airway|airline|flight|airbus|airways/i, "americanairlines"],
  [/travel|trip|orbit/i, "tripadvisor"],
  [/pixel|tech|electron|gadget|port/i, "apple"],
  [/glow|beauty|cosmetic|theory|silk|atelier/i, "shopify"],
  [/bloom|garden|beam|health/i, "nike"],
  [/wallet|pay|boost|bank|cash/i, "paypal"],
  [/chrono|watch|lab|samsung/i, "samsung"],
  [/shop|cart|quest|checkout|mall/i, "shopee"],
  [/neon|deal|discount/i, "target"],
  [/flux|uber|food|eats|delivery/i, "ubereats"],
  [/sky|music|tune|stream/i, "spotify"],
  // Simple Icons removed Amazon (trademark complaint) - use eBay slug to avoid runtime 404.
  [/nova|amazon|prime/i, "ebay"],
  [/netflix|movie|cinema/i, "netflix"],
  [/gym|fitness|sport|nike/i, "nike"],
  [/stay|hotel|cozy|booking/i, "airbnb"],
  [/daily/i, "instacart"],
  [/mint|mirror|target/i, "target"],
  [/nest|circuit|google/i, "google"],
  [/urban|next|meta|facebook/i, "meta"],
  [/mail|message/i, "gmail"],
];

const GENERIC_BRAND_SLUGS = [
  "apple",
  "samsung",
  "google",
  "ebay",
  "netflix",
  "spotify",
  "airbnb",
  "paypal",
  "instacart",
  "ubereats",
  "nike",
  "shopee",
  "target",
  "meta",
  "americanairlines",
  "tripadvisor",
];

/**
 * Produce a deterministic mock brand-logo URL (white simpleicons icon) for a given brand key.
 * Same key always resolves to the same slug so UI doesn't flicker across renders.
 */
export function getMockBrandLogoUrl(key: string): string {
  const slug = pickMockBrandSlug(key);
  return `https://cdn.simpleicons.org/${slug}/ffffff`;
}

function pickMockBrandSlug(key: string): string {
  for (const [pattern, slug] of BRAND_SLUG_KEYWORDS) {
    if (pattern.test(key)) return slug;
  }
  let h = 0;
  for (let i = 0; i < key.length; i++) {
    h = (h * 31 + key.charCodeAt(i)) >>> 0;
  }
  // Modulo on a non-empty literal tuple always yields a defined index, so the assertion is safe.
  return GENERIC_BRAND_SLUGS[h % GENERIC_BRAND_SLUGS.length]!;
}

/**
 * Curated palette for brand-logo tile backgrounds.
 * Picked for high logo contrast + visual rhythm across a 6-col grid.
 */
const BRAND_TILE_PALETTE = [
  "#16a34a", // emerald
  "#0ea5e9", // sky
  "#0284c7", // blue
  "#0f172a", // slate-900
  "#ec4899", // pink
  "#2563eb", // blue-600
  "#6366f1", // indigo
  "#eab308", // yellow
  "#f97316", // orange
  "#0f766e", // teal
  "#065f46", // emerald-800
  "#7f1d1d", // red-900
  "#1f2937", // slate-800
  "#facc15", // amber
  "#1d4ed8", // blue-700
] as const;

/** Deterministic tile tint derived from a brand id/name so each brand always gets the same color. */
export function getBrandTileTint(key: string): string {
  if (!key) return BRAND_TILE_PALETTE[0];
  let h = 0;
  for (let i = 0; i < key.length; i++) {
    h = (h * 31 + key.charCodeAt(i)) >>> 0;
  }
  // Modulo on a non-empty literal tuple always yields a defined index, so the assertion is safe.
  return BRAND_TILE_PALETTE[h % BRAND_TILE_PALETTE.length]!;
}

/** Cashback label for cards, e.g. `12.5%` (empty when unknown). */
export function getOfferCashbackPercentLabel(offer: DataOffer): string {
  if (offer.commission_store) {
    return `${offer.commission_store.toFixed(1)}%`;
  }
  if (offer.commissions) {
    return `${getPercent(offer.commissions)}%`;
  }
  return "";
}

function discoverListingAmountThb(offer: DataOffer): number {
  if (typeof offer.listing_price_thb === "number" && Number.isFinite(offer.listing_price_thb)) {
    return Math.max(0, Math.round(offer.listing_price_thb));
  }
  let h = 0;
  const s = offer._id || String(offer.offer_id ?? "");
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  /** Stable placeholder range when API does not send `listing_price_thb`. */
  return 100 + (h % 1900);
}

/** Discover tile: formatted listing price in THB (e.g. `100 THB`). */
export function getDiscoverListingPriceLabel(offer: DataOffer, locale: string): string {
  const amount = discoverListingAmountThb(offer);
  return formatListingPrice(amount, locale);
}

function formatListingPrice(amount: number, locale: string): string {
  const isTh = locale.toLowerCase().startsWith("th");
  const fmt = new Intl.NumberFormat(isTh ? "th-TH" : "en-US", { maximumFractionDigits: 0 });
  return `${fmt.format(amount)} THB`;
}

/** Stable placeholder for dev/demo mode — ~35% of offers get a 10–30% discount derived from `_id`. */
function placeholderDiscountPercent(offer: DataOffer): number {
  const s = offer._id || String(offer.offer_id ?? "");
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 33 + s.charCodeAt(i)) >>> 0;
  if (h % 100 < 35) return 10 + (h % 21); // 10–30%
  return 0;
}

export type DiscoverListingPricing = {
  /** Current price label (always present; equals sale_price when discounted). */
  priceLabel: string;
  /** Strike-through original price, only when a discount applies. */
  originalPriceLabel?: string;
  /** Discount percent (1–99) when applicable; otherwise 0. */
  discountPercent: number;
};

/**
 * Discover listing pricing — current price + optional original/strike-through + discount %.
 * Sources fields from Shopee CPS feed (`price`, `sale_price`, `discount_percentage`); falls back
 * to a deterministic placeholder discount when the feed omits the values, so demo data shows
 * the strike-through styling.
 */
export function getDiscoverListingPricing(
  offer: DataOffer,
  locale: string
): DiscoverListingPricing {
  const sale = discoverListingAmountThb(offer);
  const priceLabel = formatListingPrice(sale, locale);

  const explicitOriginal =
    typeof offer.listing_original_price_thb === "number" &&
    Number.isFinite(offer.listing_original_price_thb)
      ? Math.round(offer.listing_original_price_thb)
      : null;
  const explicitDiscount =
    typeof offer.listing_discount_percentage === "number" &&
    Number.isFinite(offer.listing_discount_percentage)
      ? Math.max(0, Math.min(99, Math.round(offer.listing_discount_percentage)))
      : null;

  if (explicitOriginal != null && explicitOriginal > sale) {
    const computedPct =
      explicitDiscount && explicitDiscount > 0
        ? explicitDiscount
        : Math.round(((explicitOriginal - sale) / explicitOriginal) * 100);
    if (computedPct > 0) {
      return {
        priceLabel,
        originalPriceLabel: formatListingPrice(explicitOriginal, locale),
        discountPercent: computedPct,
      };
    }
  }

  if (explicitDiscount != null && explicitDiscount > 0) {
    const original = Math.round(sale / (1 - explicitDiscount / 100));
    if (original > sale) {
      return {
        priceLabel,
        originalPriceLabel: formatListingPrice(original, locale),
        discountPercent: explicitDiscount,
      };
    }
  }

  // Demo fallback so the strike-through styling is visible without a wired feed.
  const demoPct = placeholderDiscountPercent(offer);
  if (demoPct > 0) {
    const original = Math.round(sale / (1 - demoPct / 100));
    if (original > sale) {
      return {
        priceLabel,
        originalPriceLabel: formatListingPrice(original, locale),
        discountPercent: demoPct,
      };
    }
  }

  return { priceLabel, discountPercent: 0 };
}

/**
 * Outbound URL for Discover “Shop Now” — product-level affiliate link when provided.
 * Order: `listing_affiliate_url` → `tracking_link` → `preview_url`.
 */
export function getDiscoverProductOutboundUrl(offer: DataOffer): string {
  const a = offer.listing_affiliate_url?.trim();
  if (a) return a;
  const t = offer.tracking_link?.trim();
  if (t) return t;
  return offer.preview_url?.trim() ?? "";
}

/**
 * Maps feed `condition` (e.g. Studio7 CPS `new`) to localized Discover card copy.
 * Unknown tokens are title-cased for display.
 */
export function formatOfferListingCondition(
  raw: string | undefined,
  translate: (key: string) => string
): string {
  if (!raw?.trim()) return "";
  const k = raw
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  if (k === "new") return translate("productConditionNew");
  if (k === "refurbished" || k === "renewed") return translate("productConditionRefurbished");
  if (k === "used" || k === "pre_owned" || k === "preowned")
    return translate("productConditionUsed");
  const words = raw.trim().split(/[\s_-]+/);
  return words.map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : w)).join(" ");
}

const OTHERS_INDEX = SHOP_EXPLORE_MENU_ITEMS.length - 1;

/**
 * Maps API `categories` (often a single name or comma-separated) to the fixed shop menu label
 * and Figma Menu Taps icon index for `ShopExploreMenuTapIcon`.
 */
export function getOfferCategoryRowVisual(categories: string): {
  label: string;
  iconIndex: number;
} {
  const raw = categories.split(",")[0]?.trim() ?? "";
  const norm = normalizeCategoryKey(raw);

  if (!norm) {
    const others = SHOP_EXPLORE_MENU_ITEMS[OTHERS_INDEX];
    return {
      label: others?.label ?? "Others",
      iconIndex: OTHERS_INDEX,
    };
  }

  for (let i = 0; i < SHOP_EXPLORE_MENU_ITEMS.length; i++) {
    const item = SHOP_EXPLORE_MENU_ITEMS[i];
    if (!item) continue;
    for (const mk of item.matchKeys) {
      if (norm === normalizeCategoryKey(mk)) {
        return { label: item.label, iconIndex: i };
      }
    }
  }

  for (let i = 0; i < SHOP_EXPLORE_MENU_ITEMS.length; i++) {
    const item = SHOP_EXPLORE_MENU_ITEMS[i];
    if (!item) continue;
    for (const mk of item.matchKeys) {
      const nk = normalizeCategoryKey(mk);
      if (nk.length >= 3 && (norm.includes(nk) || nk.includes(norm))) {
        return { label: item.label, iconIndex: i };
      }
    }
  }

  return { label: raw, iconIndex: OTHERS_INDEX };
}
