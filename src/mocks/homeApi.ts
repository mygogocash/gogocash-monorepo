import { ResponseWithdrawCheckMyCashback, User } from "@/interfaces/auth";
import type { ReferralID, ResponseReferralList } from "@/interfaces/referral";
import {
  BannerHome,
  CommissionTracking,
  CouponData,
  Currency,
  DataFav,
  DataFavList,
  DataOffer,
  IResponseFav,
  IResponseMyOffer,
  LookupValue,
  OfferID,
  TrackingType,
  TypeCommissions,
} from "@/interfaces/offer";
import {
  IResponseCategory,
  RequestGenerateDeeplink,
  ResponseGenerateDeeplink,
} from "@/interfaces/shop";
import {
  DataMethodWithdraw,
  ResponseBankList,
  DataWithdrawCheck,
  DataWithdrawHistory,
  FeeData,
  ResConversionHistory,
  ResGetSummaryListCheck,
  ResWithdrawBankTransfer,
  ResponseWithdrawCheck,
  ResponseWithdrawHistory,
} from "@/interfaces/withdraw";
import type { QuestRankResponse, ResponseQuestDate, ResSocialReward } from "@/interfaces/quest";
import type { QuestHistorySummary, QuestUserPeriodSummary } from "@/interfaces/questHistory";
import { ResGetBalanceMyCashback } from "@/interfaces/userMyCashback";
import {
  devEmailMockTelegramLoginResponse,
  isDevEmailOtpTestAddress,
} from "@/lib/dev/emailOtpMock";
import {
  isRecord,
  normalize,
  parseNumberArray,
  parseRequestGenerateDeeplink,
  parseStringArray,
  toNumber,
} from "@/mocks/homeApi/helpers";
import { env } from "@/env";

const mockNow = new Date("2026-03-28T00:00:00.000Z");
const DEFAULT_ACTIVE_MOCK_USER_ID = "mock-user-001";
const thbRate = 36;

type MockBrandCategory = "Travel" | "electronic" | "beauty" | "Health & Beauty" | "others";
type MockCashbackStatus = "approved" | "pending" | "rejected";
type MockWalletType = "standard" | "mycashback";

interface MockBrandSeedInput {
  id: string;
  name: string;
  category: MockBrandCategory;
  commission: number;
  logo: string;
  banner: string;
  description: string;
  /** Omit or true: show “Grab Coupon” on cards; false = no coupons for this mock brand. */
  has_coupon?: boolean;
  /** Shown on shop detail when set (mirrors optional `DataOffer.admin_note`). */
  admin_note?: string;
}

interface MockCashbackBlueprint {
  userId: string;
  brandId: string;
  status: MockCashbackStatus;
  walletType: MockWalletType;
  saleAmount: number;
  payout: number;
  description: string;
  daysAgo: number;
  referenceId?: string;
}

interface MockCashbackTransactionSeed {
  id: string;
  userId: string;
  brandId: string;
  conversionId: number;
  status: MockCashbackStatus;
  walletType: MockWalletType;
  saleAmount: number;
  payout: number;
  currency: "USD";
  datetimeConversion: Date;
  description: string;
  referenceId?: string;
}

interface MockAffiliateSeed {
  brandId: string;
  deeplink: string;
  createdAt: Date;
}

interface MockUserSeed {
  user: User;
  firstName: string;
  lastName: string;
  city: string;
  zipCode: string;
  favoriteBrandIds: string[];
  deeplinkSeeds: MockAffiliateSeed[];
  paymentMethods: DataMethodWithdraw[];
  withdrawHistory: DataWithdrawHistory[];
}

const addDays = (date: Date, days: number) => new Date(date.getTime() + days * 24 * 60 * 60 * 1000);

const usdToThb = (value: number) => Number((value * thbRate).toFixed(2));

const getNumericId = (value: string) => Number(value.replace(/\D/g, "").slice(-4) || "1000");

const makeCommissions = (percent: number): TypeCommissions[] => [
  { cashback: `${percent.toFixed(1)}%` },
];

const categoryDisplayName: Record<MockBrandCategory, string> = {
  Travel: "Travel",
  electronic: "Electronics",
  beauty: "Beauty",
  "Health & Beauty": "Health & Beauty",
  others: "Others",
};

const categoryImage: Record<MockBrandCategory, string> = {
  Travel: "/quest/banner_en.png",
  electronic: "/popular/Electronic.png",
  beauty: "/popular/Beauty.png",
  "Health & Beauty": "/popular/Beauty.png",
  others: "/popular/Dinner.png",
};

const categoryAliases: Record<string, MockBrandCategory> = {
  travel: "Travel",
  electronic: "electronic",
  electronics: "electronic",
  beauty: "beauty",
  "health & beauty": "Health & Beauty",
  "health-beauty": "Health & Beauty",
  others: "others",
  other: "others",
};

const normalizeCategory = (value: string | null): MockBrandCategory | "" =>
  categoryAliases[normalize(value).replace(/\s+/g, " ")] ?? "";

const createProductTypes = (category: MockBrandCategory): DataOffer["product_type"] => {
  switch (category) {
    case "Travel":
      return [
        { name: "Flights", minimum: "0" },
        { name: "Hotels", minimum: "0" },
      ];
    case "electronic":
      return [
        { name: "Gadgets", minimum: "0" },
        { name: "Accessories", minimum: "0" },
      ];
    case "beauty":
      return [
        { name: "Makeup", minimum: "0" },
        { name: "Skincare", minimum: "0" },
      ];
    case "Health & Beauty":
      return [
        { name: "Wellness", minimum: "0" },
        { name: "Personal Care", minimum: "0" },
      ];
    case "others":
    default:
      return [
        { name: "Groceries", minimum: "0" },
        { name: "Lifestyle", minimum: "0" },
      ];
  }
};

const hasNonEmptyAdminNote = (note: string | undefined): note is string =>
  typeof note === "string" && note.trim().length > 0;

const createMockBrand = ({
  id,
  name,
  category,
  commission,
  logo,
  banner,
  description,
  has_coupon: hasCouponSeed,
  admin_note: adminNoteSeed,
}: MockBrandSeedInput): DataOffer => ({
  _id: id,
  offer_id: getNumericId(id),
  __v: 0,
  categories: category,
  commission_tracking: CommissionTracking.RealTime,
  commissions: makeCommissions(commission),
  countries: "TH",
  currency: Currency.Usd,
  datetime_created: mockNow,
  datetime_updated: mockNow,
  description,
  directory_page: `/shop/${id}`,
  is_require_approval: 0,
  logo,
  logo_desktop: logo,
  logo_mobile: logo,
  lookup_value: LookupValue.CPS,
  marketplace_store_offer: false,
  merchant_id: getNumericId(id),
  offer_name: name,
  payment_terms: 30,
  preview_url: `https://mock.gogocash.local/${id}`,
  special_commissions: makeCommissions(commission + 1.5),
  tracking_link: `https://mock.gogocash.local/${id}`,
  tracking_type: TrackingType.DesktopMobileIosAndroid,
  validation_terms: 30,
  offer_name_display: name,
  disabled: false,
  banner,
  banner_mobile: banner,
  logo_circle: logo,
  commission_store: commission,
  max_cap: 0,
  extra_point: null,
  product_type: createProductTypes(category),
  /** Demo listing price for Discover cards (THB). */
  listing_price_thb: 99 + ((getNumericId(id) * 47) % 1901),
  /** Demo product condition (CPS-style feed). */
  listing_condition: (["new", "refurbished", "used"] as const)[getNumericId(id) % 3],
  /** Demo affiliate product deeplink for Discover “Shop Now”. */
  listing_affiliate_url: `https://mock-affiliate.gogocash.local/product?brand=${encodeURIComponent(id)}`,
  has_coupon: hasCouponSeed !== false,
  ...(hasNonEmptyAdminNote(adminNoteSeed) ? { admin_note: adminNoteSeed.trim() } : {}),
});

const mockBrandCatalog: MockBrandSeedInput[] = [
  {
    id: "brand-grocery-galaxy-1001",
    name: "Grocery Galaxy",
    category: "others",
    commission: 12.5,
    logo: "/logo.png",
    banner: "/home/banner1.webp",
    description: "Weekly pantry deals and fresh-cart cashback.",
    admin_note:
      "Promo stack: this merchant may run time-limited campaigns. Cashback can take up to 7 days to track after delivery.",
  },
  {
    id: "brand-pocket-pantry-1002",
    name: "Pocket Pantry",
    category: "others",
    commission: 10.0,
    logo: "/logo_green.png",
    banner: "/home/banner2.webp",
    description: "Fast grocery savings for everyday essentials.",
  },
  {
    id: "brand-orbit-airways-1003",
    name: "Orbit Airways",
    category: "Travel",
    commission: 8.5,
    logo: "/globe.svg",
    banner: "/quest/banner_en.png",
    description: "Flight promos and travel cashback in one place.",
    has_coupon: false,
  },
  {
    id: "brand-pixelport-1004",
    name: "PixelPort",
    category: "electronic",
    commission: 6.5,
    logo: "/window.svg",
    banner: "/popular/Electronic.png",
    description: "Tech accessories, mobile gear, and gadget drops.",
    has_coupon: false,
  },
  {
    id: "brand-glow-theory-1005",
    name: "Glow Theory",
    category: "beauty",
    commission: 14.0,
    logo: "/social/login/google.svg",
    banner: "/popular/Beauty.png",
    description: "Daily beauty picks with clean cashback signals.",
  },
  {
    id: "brand-bloom-beam-1006",
    name: "Bloom & Beam",
    category: "Health & Beauty",
    commission: 15.0,
    logo: "/social/login/facebook.svg",
    banner: "/home/banner.webp",
    description: "Beauty and wellness staples with strong returns.",
  },
  {
    id: "brand-urban-checkout-1007",
    name: "Urban Checkout",
    category: "others",
    commission: 11.0,
    logo: "/meta/logo.png",
    banner: "/home/banner1.png",
    description: "Lifestyle marketplace for everyday shopping wins.",
  },
  {
    id: "brand-nova-travel-club-1008",
    name: "Nova Travel Club",
    category: "Travel",
    commission: 9.2,
    logo: "/social/login/telegram.svg",
    banner: "/quest/banner.png",
    description: "Trips, hotel bundles, and adventure cashbacks.",
  },
  {
    id: "brand-circuit-nest-1009",
    name: "Circuit Nest",
    category: "electronic",
    commission: 7.0,
    logo: "/profile/logo2.svg",
    banner: "/home/banner2.png",
    description: "Smart home electronics and device upgrades.",
  },
  {
    id: "brand-mint-mirror-1010",
    name: "Mint Mirror",
    category: "Health & Beauty",
    commission: 16.5,
    logo: "/home/logo_green1.png",
    banner: "/popular/Beauty.png",
    description: "Premium skincare and personal-care cashback picks.",
  },
  {
    id: "brand-daily-harvest-box-1011",
    name: "Daily Harvest Box",
    category: "others",
    commission: 9.8,
    logo: "/apple.png",
    banner: "/popular/Dinner.png",
    description: "Meal kits, snacks, and kitchen staples.",
  },
  {
    id: "brand-sound-loft-1012",
    name: "Sound Loft",
    category: "electronic",
    commission: 5.8,
    logo: "/next.svg",
    banner: "/popular/Electronic.png",
    description: "Headphones, speakers, and audio gear offers.",
  },
  {
    id: "brand-silk-society-1013",
    name: "Silk Society",
    category: "beauty",
    commission: 13.2,
    logo: "/social/login/x.svg",
    banner: "/home/banner2.webp",
    description: "Beauty rituals, makeup drops, and glow sets.",
  },
  {
    id: "brand-horizon-escapes-1014",
    name: "Horizon Escapes",
    category: "Travel",
    commission: 8.8,
    logo: "/vercel.svg",
    banner: "/quest/banner2.png",
    description: "Weekend getaways and global trip planning perks.",
  },
  {
    id: "brand-gadget-grove-1015",
    name: "Gadget Grove",
    category: "electronic",
    commission: 7.5,
    logo: "/profile/dashboard.svg",
    banner: "/home/banner.png",
    description: "Wearables, accessories, and desktop setups.",
  },
  {
    id: "brand-pure-ritual-1016",
    name: "Pure Ritual",
    category: "Health & Beauty",
    commission: 18.0,
    logo: "/profile/back_wallet.svg",
    banner: "/home/banner1.webp",
    description: "Wellness-led beauty routines with high cashback.",
  },
  {
    id: "brand-luxe-lane-beauty-1017",
    name: "Luxe Lane Beauty",
    category: "Health & Beauty",
    commission: 17.2,
    logo: "/social/login/google.svg",
    banner: "/popular/Beauty.png",
    description: "High-conversion beauty promos for hero placement.",
  },
  {
    id: "brand-cloudnine-travel-1018",
    name: "CloudNine Travel",
    category: "Travel",
    commission: 10.3,
    logo: "/globe.svg",
    banner: "/quest/banner_en.png",
    description: "Travel cashback for flights, stays, and bundles.",
  },
  {
    id: "brand-volt-market-1019",
    name: "Volt Market",
    category: "electronic",
    commission: 6.9,
    logo: "/window.svg",
    banner: "/popular/Electronic.png",
    description: "Power users, devices, and gear worth opening now.",
  },
  {
    id: "brand-cozy-cart-1020",
    name: "Cozy Cart",
    category: "others",
    commission: 9.1,
    logo: "/logo_green.png",
    banner: "/popular/Dinner.png",
    description: "Comfort shopping, home goods, and everyday value.",
  },
  {
    id: "brand-radiant-lab-1021",
    name: "Radiant Lab",
    category: "beauty",
    commission: 12.9,
    logo: "/social/login/facebook.svg",
    banner: "/popular/Beauty.png",
    description: "Lab-inspired skincare and makeup best sellers.",
  },
  {
    id: "brand-staymint-hotels-1022",
    name: "StayMint Hotels",
    category: "Travel",
    commission: 11.4,
    logo: "/meta/logo.png",
    banner: "/quest/banner.png",
    description: "Hotel cashback and booking promos for short trips.",
  },
  {
    id: "brand-echo-devices-1023",
    name: "Echo Devices",
    category: "electronic",
    commission: 6.1,
    logo: "/next.svg",
    banner: "/home/banner2.png",
    description: "Accessories, charging gear, and device bundles.",
  },
  {
    id: "brand-fresh-basket-1024",
    name: "Fresh Basket",
    category: "others",
    commission: 10.8,
    logo: "/logo.png",
    banner: "/home/banner1.png",
    description: "Produce, pantry, and quick-delivery cashback picks.",
  },
  {
    id: "brand-amber-apothecary-1025",
    name: "Amber Apothecary",
    category: "Health & Beauty",
    commission: 14.4,
    logo: "/profile/back_wallet.svg",
    banner: "/home/banner.webp",
    description: "Small-batch wellness and apothecary-style beauty finds.",
  },
  {
    id: "brand-trailhead-outfitters-1026",
    name: "Trailhead Outfitters",
    category: "Travel",
    commission: 9.6,
    logo: "/social/login/telegram.svg",
    banner: "/quest/banner2.png",
    description: "Outdoor gear and adventure travel booking perks.",
  },
  {
    id: "brand-nimbus-tech-1027",
    name: "Nimbus Tech",
    category: "electronic",
    commission: 7.3,
    logo: "/profile/logo2.svg",
    banner: "/home/banner.png",
    description: "Cloud-backed devices and workspace upgrades.",
  },
  {
    id: "brand-harvest-hearth-1028",
    name: "Harvest & Hearth",
    category: "others",
    commission: 11.2,
    logo: "/apple.png",
    banner: "/popular/Dinner.png",
    description: "Farm-to-table groceries and kitchen essentials.",
  },
  {
    id: "brand-velvet-vanity-1029",
    name: "Velvet Vanity",
    category: "beauty",
    commission: 15.8,
    logo: "/social/login/x.svg",
    banner: "/popular/Beauty.png",
    description: "Luxury makeup and vanity-table hero products.",
  },
  {
    id: "brand-skyward-suites-1030",
    name: "Skyward Suites",
    category: "Travel",
    commission: 10.9,
    logo: "/globe.svg",
    banner: "/quest/banner.png",
    description: "Boutique hotels and skyline-view stay offers.",
  },
  {
    id: "brand-byte-bazaar-1031",
    name: "Byte Bazaar",
    category: "electronic",
    commission: 6.4,
    logo: "/window.svg",
    banner: "/popular/Electronic.png",
    description: "Cables, hubs, and desk-tech impulse buys.",
  },
  {
    id: "brand-green-fork-grocers-1032",
    name: "Green Fork Grocers",
    category: "others",
    commission: 10.2,
    logo: "/logo_green.png",
    banner: "/home/banner1.webp",
    description: "Organic aisles and plant-forward pantry cashback.",
  },
  {
    id: "brand-lumen-cosmetics-1033",
    name: "Lumen Cosmetics",
    category: "beauty",
    commission: 13.7,
    logo: "/social/login/facebook.svg",
    banner: "/home/banner2.webp",
    description: "Illuminating bases, highlighters, and daily glam.",
  },
  {
    id: "brand-coastal-commute-1034",
    name: "Coastal Commute",
    category: "Travel",
    commission: 8.1,
    logo: "/vercel.svg",
    banner: "/quest/banner_en.png",
    description: "Ferry passes, coastal shuttles, and short-hop deals.",
  },
  {
    id: "brand-ohm-outlet-1035",
    name: "Ohm Outlet",
    category: "electronic",
    commission: 5.5,
    logo: "/next.svg",
    banner: "/home/banner2.png",
    description: "Chargers, batteries, and power accessories.",
  },
  {
    id: "brand-spice-route-pantry-1036",
    name: "Spice Route Pantry",
    category: "others",
    commission: 9.4,
    logo: "/meta/logo.png",
    banner: "/popular/Dinner.png",
    description: "Global spices, sauces, and world-food staples.",
  },
  {
    id: "brand-pearl-polish-1037",
    name: "Pearl Polish",
    category: "Health & Beauty",
    commission: 17.8,
    logo: "/social/login/google.svg",
    banner: "/popular/Beauty.png",
    description: "Nail studios and hand-care cashback bundles.",
  },
  {
    id: "brand-alpine-air-pass-1038",
    name: "Alpine Air Pass",
    category: "Travel",
    commission: 12.1,
    logo: "/profile/dashboard.svg",
    banner: "/quest/banner.png",
    description: "Mountain resorts, lifts, and alpine package deals.",
  },
  {
    id: "brand-nano-node-supply-1039",
    name: "Nano Node Supply",
    category: "electronic",
    commission: 7.8,
    logo: "/home/logo_green1.png",
    banner: "/popular/Electronic.png",
    description: "Micro-components, makers, and hobby electronics.",
  },
  {
    id: "brand-basket-and-co-1040",
    name: "Basket & Co",
    category: "others",
    commission: 11.6,
    logo: "/logo.png",
    banner: "/home/banner1.png",
    description: "Curated bundles, gift boxes, and seasonal baskets.",
  },
  // Travel — extra seeds to fill 24 brands per category for 2-row desktop grids
  {
    id: "brand-voyage-parade-1041",
    name: "Voyage Parade",
    category: "Travel",
    commission: 7.4,
    logo: "/globe.svg",
    banner: "/quest/banner_en.png",
    description: "City tours and curated escape routes.",
  },
  {
    id: "brand-driftline-cruises-1042",
    name: "Driftline Cruises",
    category: "Travel",
    commission: 9.9,
    logo: "/globe.svg",
    banner: "/quest/banner_en.png",
    description: "Weekend cruises with onboard cashback.",
    has_coupon: false,
  },
  {
    id: "brand-wanderloop-1043",
    name: "Wanderloop",
    category: "Travel",
    commission: 6.8,
    logo: "/globe.svg",
    banner: "/quest/banner_en.png",
    description: "Backpacker-friendly stays across APAC.",
  },
  {
    id: "brand-passport-haus-1044",
    name: "Passport Haus",
    category: "Travel",
    commission: 10.2,
    logo: "/globe.svg",
    banner: "/quest/banner_en.png",
    description: "All-in-one trip planning and visas.",
  },
  {
    id: "brand-island-atlas-1045",
    name: "Island Atlas",
    category: "Travel",
    commission: 8.3,
    logo: "/globe.svg",
    banner: "/quest/banner_en.png",
    description: "Island-hopping packages and dive tours.",
    has_coupon: false,
  },
  {
    id: "brand-northline-rail-1046",
    name: "Northline Rail",
    category: "Travel",
    commission: 5.9,
    logo: "/globe.svg",
    banner: "/quest/banner_en.png",
    description: "Scenic rail tickets and rail passes.",
  },
  {
    id: "brand-resortly-1047",
    name: "Resortly",
    category: "Travel",
    commission: 12.5,
    logo: "/globe.svg",
    banner: "/quest/banner_en.png",
    description: "Beach resorts with daily-deal cashback.",
  },
  {
    id: "brand-lightflight-1048",
    name: "Lightflight",
    category: "Travel",
    commission: 6.5,
    logo: "/globe.svg",
    banner: "/quest/banner_en.png",
    description: "Budget airline fare tracker + refunds.",
  },
  {
    id: "brand-safari-roads-1049",
    name: "Safari Roads",
    category: "Travel",
    commission: 11.8,
    logo: "/globe.svg",
    banner: "/quest/banner_en.png",
    description: "African safari experiences and lodges.",
    has_coupon: false,
  },
  {
    id: "brand-citybreak-club-1050",
    name: "CityBreak Club",
    category: "Travel",
    commission: 7.0,
    logo: "/globe.svg",
    banner: "/quest/banner_en.png",
    description: "Weekend city breaks with perks.",
  },
  {
    id: "brand-lagoon-lodge-1051",
    name: "Lagoon Lodge",
    category: "Travel",
    commission: 9.1,
    logo: "/globe.svg",
    banner: "/quest/banner_en.png",
    description: "Boutique lakeside and lagoon stays.",
  },
  {
    id: "brand-metrotrip-1052",
    name: "MetroTrip",
    category: "Travel",
    commission: 6.2,
    logo: "/globe.svg",
    banner: "/quest/banner_en.png",
    description: "Urban day-trips with transit bundles.",
  },
  {
    id: "brand-altitude-tours-1053",
    name: "Altitude Tours",
    category: "Travel",
    commission: 10.7,
    logo: "/globe.svg",
    banner: "/quest/banner_en.png",
    description: "Mountain treks and alpine excursions.",
  },
  {
    id: "brand-seabreeze-ferries-1054",
    name: "SeaBreeze Ferries",
    category: "Travel",
    commission: 5.4,
    logo: "/globe.svg",
    banner: "/quest/banner_en.png",
    description: "Island ferry schedules and passes.",
    has_coupon: false,
  },
  {
    id: "brand-quicklayover-1055",
    name: "QuickLayover",
    category: "Travel",
    commission: 7.9,
    logo: "/globe.svg",
    banner: "/quest/banner_en.png",
    description: "Airport lounges, hotels, and transfers.",
  },
  // Health & Beauty — extra seeds to fill 24 brands per category for 2-row desktop grids
  {
    id: "brand-petal-and-pearl-1056",
    name: "Petal & Pearl",
    category: "beauty",
    commission: 13.0,
    logo: "/social/login/google.svg",
    banner: "/popular/Beauty.png",
    description: "Floral-inspired skincare and serums.",
  },
  {
    id: "brand-brush-and-bloom-1057",
    name: "Brush & Bloom",
    category: "Health & Beauty",
    commission: 14.7,
    logo: "/social/login/google.svg",
    banner: "/popular/Beauty.png",
    description: "Pro makeup brushes and daily kits.",
  },
  {
    id: "brand-skin-saga-1058",
    name: "Skin Saga",
    category: "beauty",
    commission: 16.2,
    logo: "/social/login/google.svg",
    banner: "/popular/Beauty.png",
    description: "Routine-builder for dermatologist-tested skincare.",
  },
  {
    id: "brand-aurum-glow-1059",
    name: "Aurum Glow",
    category: "Health & Beauty",
    commission: 15.5,
    logo: "/social/login/google.svg",
    banner: "/popular/Beauty.png",
    description: "Gold-infused beauty rituals.",
  },
  {
    id: "brand-verde-botanica-1060",
    name: "Verde Botanica",
    category: "beauty",
    commission: 12.4,
    logo: "/social/login/google.svg",
    banner: "/popular/Beauty.png",
    description: "Clean-ingredient botanicals and oils.",
  },
  {
    id: "brand-noble-nurture-1061",
    name: "Noble Nurture",
    category: "Health & Beauty",
    commission: 17.0,
    logo: "/social/login/google.svg",
    banner: "/popular/Beauty.png",
    description: "Wellness supplements and recovery blends.",
  },
  {
    id: "brand-silver-silk-1062",
    name: "Silver Silk",
    category: "beauty",
    commission: 13.6,
    logo: "/social/login/google.svg",
    banner: "/popular/Beauty.png",
    description: "Luxury hair treatments and masks.",
  },
  {
    id: "brand-dew-drop-labs-1063",
    name: "Dew Drop Labs",
    category: "Health & Beauty",
    commission: 16.9,
    logo: "/social/login/google.svg",
    banner: "/popular/Beauty.png",
    description: "Lab-formulated hydration essentials.",
  },
  {
    id: "brand-rose-and-rye-1064",
    name: "Rose & Rye",
    category: "beauty",
    commission: 14.2,
    logo: "/social/login/google.svg",
    banner: "/popular/Beauty.png",
    description: "Slow beauty — small-batch perfumes and lotions.",
  },
  {
    id: "brand-lush-legacy-1065",
    name: "Lush Legacy",
    category: "Health & Beauty",
    commission: 15.1,
    logo: "/social/login/google.svg",
    banner: "/popular/Beauty.png",
    description: "Hair and body care with clean actives.",
  },
  {
    id: "brand-prism-radiance-1066",
    name: "Prism Radiance",
    category: "beauty",
    commission: 18.3,
    logo: "/social/login/google.svg",
    banner: "/popular/Beauty.png",
    description: "High-pigment color cosmetics and palettes.",
  },
  {
    id: "brand-harbor-herbs-1067",
    name: "Harbor Herbs",
    category: "Health & Beauty",
    commission: 11.9,
    logo: "/social/login/google.svg",
    banner: "/popular/Beauty.png",
    description: "Herbal wellness teas and tinctures.",
  },
  {
    id: "brand-vitaline-spa-1068",
    name: "Vitaline Spa",
    category: "Health & Beauty",
    commission: 13.8,
    logo: "/social/login/google.svg",
    banner: "/popular/Beauty.png",
    description: "At-home spa devices and recovery gear.",
  },
];

const mockBrands: DataOffer[] = mockBrandCatalog.map(createMockBrand);

export const MOCK_BRAND_COUNT = mockBrands.length;
export const MOCK_USER_COUNT = 5;

const brandsById = new Map(mockBrands.map((brand) => [brand._id, brand]));

/** IDs surfaced by `GET /offer/extra` and `/offer/extra-point` (home Top Brands carousel mock). */
const topBrandIds = new Set([
  "brand-grocery-galaxy-1001",
  "brand-pocket-pantry-1002",
  "brand-orbit-airways-1003",
  "brand-pixelport-1004",
  "brand-bloom-beam-1006",
  "brand-nova-travel-club-1008",
  "brand-sound-loft-1012",
  "brand-staymint-hotels-1022",
  "brand-glow-theory-1005",
  "brand-urban-checkout-1007",
  "brand-circuit-nest-1009",
  "brand-cloudnine-travel-1018",
  "brand-mint-mirror-1010",
  "brand-daily-harvest-box-1011",
  "brand-silk-society-1013",
  "brand-horizon-escapes-1014",
]);

const mockBannerHome: BannerHome = {
  image_1: "/home/banner.png",
  image_2: "/home/banner1.webp",
  image_3: "/home/banner2.webp",
  image_4: "/home/banner1.png",
  image_5: "/home/banner2.png",
  link_1: "/shop/brand-grocery-galaxy-1001",
  link_2: "/shop/brand-pocket-pantry-1002",
  link_3: "/shop/brand-orbit-airways-1003",
  link_4: "/shop/brand-pixelport-1004",
  link_5: "/shop/brand-bloom-beam-1006",
};

const mockCategories: IResponseCategory[] = [
  { _id: "mock-category-travel", name: "Travel", image: categoryImage.Travel },
  { _id: "mock-category-electronics", name: "Electronics", image: categoryImage.electronic },
  { _id: "mock-category-beauty", name: "Beauty", image: categoryImage.beauty },
  {
    _id: "mock-category-health-beauty",
    name: "Health & Beauty",
    image: categoryImage["Health & Beauty"],
  },
  { _id: "mock-category-others", name: "Others", image: categoryImage.others },
];

const mockFee: FeeData = {
  _id: "fee-mock-001",
  system: 5,
  createdAt: addDays(mockNow, -60),
  updatedAt: mockNow,
  __v: 0,
  minimum_withdraw_usd: 10,
  minimum_withdraw_thb: 300,
  fee_withdraw_usd: 2.5,
  fee_withdraw_thb: 20,
};

let withdrawMethodSequence = 1;
let withdrawHistorySequence = 1;
let favoriteSequence = 1;
let deeplinkSequence = 1;

const createMockWithdrawMethod = ({
  userId,
  accountNo,
  accountName,
  bankName,
  bankCode,
  isDefault,
  createdAt,
  updatedAt,
}: {
  userId: string;
  accountNo: string;
  accountName: string;
  bankName: string;
  bankCode: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}): DataMethodWithdraw => ({
  _id: `withdraw-method-${String(withdrawMethodSequence++).padStart(3, "0")}`,
  account_no: accountNo,
  account_name: accountName,
  bank_name: bankName,
  bank_code: bankCode,
  is_default: isDefault,
  user_id: userId,
  createdAt,
  updatedAt,
  __v: 0,
});

const createMockWithdrawHistorySeed = ({
  userId,
  address = "",
  accountNumber = "",
  accountName = "",
  bankName = "",
  amountTotal,
  amountNet,
  percentFee,
  status,
  method,
  txHash = "",
  conversionIds = [],
  myCashbackIds = [],
  currency,
  createdAt,
  updatedAt,
}: {
  userId: string;
  address?: string;
  accountNumber?: string;
  accountName?: string;
  bankName?: string;
  amountTotal: number;
  amountNet: number;
  percentFee: number;
  status: "approved" | "pending" | "rejected";
  method: string;
  txHash?: string;
  conversionIds?: number[];
  myCashbackIds?: string[];
  currency: string;
  createdAt: Date;
  updatedAt: Date;
}): DataWithdrawHistory => ({
  _id: `withdraw-history-${String(withdrawHistorySequence++).padStart(3, "0")}`,
  address,
  account_number: accountNumber,
  account_name: accountName,
  bank_name: bankName,
  amount_total: amountTotal,
  amount_net: amountNet,
  percent_fee: percentFee,
  status,
  method,
  tx_hash: txHash,
  user_id: userId,
  conversion_id: conversionIds,
  mycashback_id: myCashbackIds,
  currency,
  createdAt,
  updatedAt,
  __v: 0,
});

const mockUsers: MockUserSeed[] = [
  {
    user: {
      _id: "mock-user-001",
      address: "0x1234abcd5678ef901234abcd5678ef901234abcd",
      __v: 0,
      email: "demo@gogocash.local",
      id_twitter: "gogocash_demo",
      username: "Demo Shopper",
      country: "Thailand",
      provider: "mock",
      mobile: "0812345678",
      birthdate: "1996-10-21",
      gender: "Female",
      id_telegram: "gogocash_demo",
      id_number: "1103700412345",
      legal_address: "1 Demo Road, Pathum Wan, Bangkok 10330",
    },
    firstName: "Demo",
    lastName: "Shopper",
    city: "Bangkok",
    zipCode: "10110",
    favoriteBrandIds: [
      "brand-grocery-galaxy-1001",
      "brand-orbit-airways-1003",
      "brand-bloom-beam-1006",
    ],
    deeplinkSeeds: [
      {
        brandId: "brand-grocery-galaxy-1001",
        deeplink: "https://mock.gogocash.local/brand-grocery-galaxy-1001?ref=favorite",
        createdAt: addDays(mockNow, -8),
      },
      {
        brandId: "brand-orbit-airways-1003",
        deeplink: "https://mock.gogocash.local/brand-orbit-airways-1003?ref=travel",
        createdAt: addDays(mockNow, -5),
      },
    ],
    paymentMethods: [
      createMockWithdrawMethod({
        userId: "mock-user-001",
        accountNo: "123-4-56789-0",
        accountName: "Demo Shopper",
        bankName: "Kasikorn Bank",
        bankCode: "KBANK",
        isDefault: true,
        createdAt: addDays(mockNow, -90),
        updatedAt: addDays(mockNow, -2),
      }),
      createMockWithdrawMethod({
        userId: "mock-user-001",
        accountNo: "987-6-54321-0",
        accountName: "Demo Shopper",
        bankName: "Bangkok Bank",
        bankCode: "BBL",
        isDefault: false,
        createdAt: addDays(mockNow, -45),
        updatedAt: addDays(mockNow, -5),
      }),
    ],
    withdrawHistory: [
      createMockWithdrawHistorySeed({
        userId: "mock-user-001",
        accountNumber: "123-4-56789-0",
        accountName: "Demo Shopper",
        bankName: "Kasikorn Bank",
        amountTotal: 60.65,
        amountNet: 57.62,
        percentFee: 5,
        status: "approved",
        method: "bank_transfer",
        conversionIds: [578760601, 578760602, 578760603],
        currency: "USD",
        createdAt: addDays(mockNow, -10),
        updatedAt: addDays(mockNow, -9),
      }),
      createMockWithdrawHistorySeed({
        userId: "mock-user-001",
        address: "0x1234abcd5678ef901234abcd5678ef901234abcd",
        amountTotal: 9.5,
        amountNet: 9.5,
        percentFee: 0,
        status: "pending",
        method: "crypto",
        txHash: "0xmockhash0001",
        myCashbackIds: ["mcb-archive-2001"],
        currency: "USD",
        createdAt: addDays(mockNow, -2),
        updatedAt: addDays(mockNow, -2),
      }),
    ],
  },
  {
    user: {
      _id: "mock-user-002",
      address: "0x2234abcd5678ef901234abcd5678ef901234abcd",
      __v: 0,
      email: "ari.approved@gogocash.local",
      id_twitter: "ari_approved",
      username: "Ari Approved",
      country: "Singapore",
      provider: "mock",
      mobile: "6591234567",
      birthdate: "1992-06-14",
      gender: "Male",
      id_telegram: "ari_approved",
    },
    firstName: "Ari",
    lastName: "Approved",
    city: "Singapore",
    zipCode: "048581",
    favoriteBrandIds: ["brand-staymint-hotels-1022", "brand-velvet-vanity-1029"],
    deeplinkSeeds: [
      {
        brandId: "brand-staymint-hotels-1022",
        deeplink: "https://mock.gogocash.local/brand-staymint-hotels-1022?ref=approved-heavy",
        createdAt: addDays(mockNow, -6),
      },
      {
        brandId: "brand-nimbus-tech-1027",
        deeplink: "https://mock.gogocash.local/brand-nimbus-tech-1027?ref=workspace",
        createdAt: addDays(mockNow, -4),
      },
    ],
    paymentMethods: [
      createMockWithdrawMethod({
        userId: "mock-user-002",
        accountNo: "120-998-2211",
        accountName: "Ari Approved",
        bankName: "DBS",
        bankCode: "DBS",
        isDefault: true,
        createdAt: addDays(mockNow, -80),
        updatedAt: addDays(mockNow, -3),
      }),
    ],
    withdrawHistory: [
      createMockWithdrawHistorySeed({
        userId: "mock-user-002",
        accountNumber: "120-998-2211",
        accountName: "Ari Approved",
        bankName: "DBS",
        amountTotal: 96.43,
        amountNet: 91.61,
        percentFee: 5,
        status: "approved",
        method: "bank_transfer",
        currency: "USD",
        createdAt: addDays(mockNow, -12),
        updatedAt: addDays(mockNow, -11),
      }),
    ],
  },
  {
    user: {
      _id: "mock-user-003",
      address: "0x3234abcd5678ef901234abcd5678ef901234abcd",
      __v: 0,
      email: "pia.pending@gogocash.local",
      id_twitter: "pia_pending",
      username: "Pia Pending",
      country: "Thailand",
      provider: "mock",
      mobile: "0899991111",
      birthdate: "1994-11-02",
      gender: "Female",
      id_telegram: "pia_pending",
    },
    firstName: "Pia",
    lastName: "Pending",
    city: "Chiang Mai",
    zipCode: "50000",
    favoriteBrandIds: ["brand-nova-travel-club-1008", "brand-harvest-hearth-1028"],
    deeplinkSeeds: [
      {
        brandId: "brand-nova-travel-club-1008",
        deeplink: "https://mock.gogocash.local/brand-nova-travel-club-1008?ref=pending-travel",
        createdAt: addDays(mockNow, -7),
      },
    ],
    paymentMethods: [
      createMockWithdrawMethod({
        userId: "mock-user-003",
        accountNo: "998-3-11223-8",
        accountName: "Pia Pending",
        bankName: "SCB",
        bankCode: "SCB",
        isDefault: true,
        createdAt: addDays(mockNow, -72),
        updatedAt: addDays(mockNow, -5),
      }),
    ],
    withdrawHistory: [
      createMockWithdrawHistorySeed({
        userId: "mock-user-003",
        accountNumber: "998-3-11223-8",
        accountName: "Pia Pending",
        bankName: "SCB",
        amountTotal: 12.2,
        amountNet: 11.59,
        percentFee: 5,
        status: "pending",
        method: "bank_transfer",
        currency: "USD",
        createdAt: addDays(mockNow, -3),
        updatedAt: addDays(mockNow, -3),
      }),
    ],
  },
  {
    user: {
      _id: "mock-user-004",
      address: "0x4234abcd5678ef901234abcd5678ef901234abcd",
      __v: 0,
      email: "rex.rejected@gogocash.local",
      id_twitter: "rex_rejected",
      username: "Rex Rejected",
      country: "Malaysia",
      provider: "mock",
      mobile: "60123456789",
      birthdate: "1991-01-30",
      gender: "Male",
      id_telegram: "rex_rejected",
    },
    firstName: "Rex",
    lastName: "Rejected",
    city: "Kuala Lumpur",
    zipCode: "50088",
    favoriteBrandIds: ["brand-pocket-pantry-1002", "brand-glow-theory-1005"],
    deeplinkSeeds: [
      {
        brandId: "brand-glow-theory-1005",
        deeplink: "https://mock.gogocash.local/brand-glow-theory-1005?ref=rejected-beauty",
        createdAt: addDays(mockNow, -9),
      },
    ],
    paymentMethods: [
      createMockWithdrawMethod({
        userId: "mock-user-004",
        accountNo: "1400-8822-11",
        accountName: "Rex Rejected",
        bankName: "Maybank",
        bankCode: "MBB",
        isDefault: true,
        createdAt: addDays(mockNow, -68),
        updatedAt: addDays(mockNow, -4),
      }),
    ],
    withdrawHistory: [
      createMockWithdrawHistorySeed({
        userId: "mock-user-004",
        accountNumber: "1400-8822-11",
        accountName: "Rex Rejected",
        bankName: "Maybank",
        amountTotal: 40.1,
        amountNet: 38.1,
        percentFee: 5,
        status: "rejected",
        method: "bank_transfer",
        currency: "USD",
        createdAt: addDays(mockNow, -15),
        updatedAt: addDays(mockNow, -14),
      }),
    ],
  },
  {
    user: {
      _id: "mock-user-005",
      address: "0x5234abcd5678ef901234abcd5678ef901234abcd",
      __v: 0,
      email: "lee.light@gogocash.local",
      id_twitter: "lee_light",
      username: "Lee Light",
      country: "Vietnam",
      provider: "mock",
      mobile: "84912345678",
      birthdate: "1998-03-18",
      gender: "Other",
      id_telegram: "lee_light",
    },
    firstName: "Lee",
    lastName: "Light",
    city: "Ho Chi Minh City",
    zipCode: "700000",
    favoriteBrandIds: ["brand-mint-mirror-1010", "brand-basket-and-co-1040"],
    deeplinkSeeds: [
      {
        brandId: "brand-basket-and-co-1040",
        deeplink: "https://mock.gogocash.local/brand-basket-and-co-1040?ref=light-history",
        createdAt: addDays(mockNow, -3),
      },
    ],
    paymentMethods: [
      createMockWithdrawMethod({
        userId: "mock-user-005",
        accountNo: "741-889-552",
        accountName: "Lee Light",
        bankName: "Techcombank",
        bankCode: "TCB",
        isDefault: true,
        createdAt: addDays(mockNow, -50),
        updatedAt: addDays(mockNow, -2),
      }),
    ],
    withdrawHistory: [
      createMockWithdrawHistorySeed({
        userId: "mock-user-005",
        address: "0x5234abcd5678ef901234abcd5678ef901234abcd",
        amountTotal: 4.5,
        amountNet: 4.5,
        percentFee: 0,
        status: "approved",
        method: "crypto",
        txHash: "0xmockhash0005",
        myCashbackIds: ["mcb-archive-2401"],
        currency: "USD",
        createdAt: addDays(mockNow, -6),
        updatedAt: addDays(mockNow, -5),
      }),
    ],
  },
];

const mockUsersById = new Map(mockUsers.map((seed) => [seed.user._id, seed]));
const configuredActiveMockUserId = env.NEXT_PUBLIC_MOCK_ACTIVE_USER_ID?.trim();
let activeMockUserId =
  configuredActiveMockUserId && mockUsersById.has(configuredActiveMockUserId)
    ? configuredActiveMockUserId
    : DEFAULT_ACTIVE_MOCK_USER_ID;

export const setActiveMockUserId = (userId: string) => {
  if (mockUsersById.has(userId)) {
    activeMockUserId = userId;
  }
};

export const getActiveMockUserId = () => activeMockUserId;

const getActiveMockUserSeed = () => mockUsersById.get(activeMockUserId) ?? mockUsers[0]!;

const createMockAffiliateRecord = (
  userId: string,
  brand: DataOffer,
  deeplink = `${brand.preview_url}?utm_source=mock-gogocash&merchant=${brand.offer_id}`,
  createdAt = mockNow
) => ({
  _id: `mock-affiliate-${deeplinkSequence++}`,
  offer_id: brand.offer_id,
  merchant_id: brand.merchant_id,
  user_id: userId,
  deeplink,
  createdAt,
  updatedAt: mockNow,
  __v: 0,
});

const favoriteBrandIdsByUser = new Map(
  mockUsers.map((seed) => [seed.user._id, new Set(seed.favoriteBrandIds)])
);

const favoriteMetaByUser = new Map<string, Map<string, { _id: string; createdAt: Date }>>();

const ensureFavoriteMeta = (userId: string, brandId: string) => {
  const userMeta =
    favoriteMetaByUser.get(userId) ?? new Map<string, { _id: string; createdAt: Date }>();
  favoriteMetaByUser.set(userId, userMeta);

  const existing = userMeta.get(brandId);
  if (existing) {
    return existing;
  }

  const created = {
    _id: `fav-${favoriteSequence++}`,
    createdAt: addDays(mockNow, -favoriteSequence),
  };

  userMeta.set(brandId, created);
  return created;
};

mockUsers.forEach((seed) => {
  seed.favoriteBrandIds.forEach((brandId) => {
    ensureFavoriteMeta(seed.user._id, brandId);
  });
});

const myOffersByUser = new Map(
  mockUsers.map((seed) => [
    seed.user._id,
    seed.deeplinkSeeds
      .map((deeplinkSeed) => {
        const brand = brandsById.get(deeplinkSeed.brandId);
        if (!brand) {
          return null;
        }

        return {
          ...createMockAffiliateRecord(
            seed.user._id,
            brand,
            deeplinkSeed.deeplink,
            deeplinkSeed.createdAt
          ),
          offer_name: brand.offer_name_display,
        };
      })
      .filter(Boolean) as IResponseMyOffer[],
  ])
);

const withdrawHistoryByUser = new Map(
  mockUsers.map((seed) => [
    seed.user._id,
    [...seed.withdrawHistory].sort(
      (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
    ),
  ])
);

const cashbackBlueprints: MockCashbackBlueprint[] = [
  {
    userId: "mock-user-001",
    brandId: "brand-grocery-galaxy-1001",
    status: "approved",
    walletType: "standard",
    saleAmount: 196,
    payout: 24.5,
    description: "Fresh weekly grocery basket",
    daysAgo: 1,
  },
  {
    userId: "mock-user-001",
    brandId: "brand-orbit-airways-1003",
    status: "approved",
    walletType: "standard",
    saleAmount: 410,
    payout: 16.75,
    description: "Domestic flight booking",
    daysAgo: 2,
  },
  {
    userId: "mock-user-001",
    brandId: "brand-bloom-beam-1006",
    status: "approved",
    walletType: "standard",
    saleAmount: 142,
    payout: 19.4,
    description: "Beauty bundle checkout",
    daysAgo: 3,
  },
  {
    userId: "mock-user-001",
    brandId: "brand-cozy-cart-1020",
    status: "approved",
    walletType: "standard",
    saleAmount: 118,
    payout: 12.6,
    description: "Cozy cart home order",
    daysAgo: 4,
  },
  {
    userId: "mock-user-001",
    brandId: "brand-pixelport-1004",
    status: "pending",
    walletType: "standard",
    saleAmount: 126,
    payout: 8.2,
    description: "Accessory order awaiting approval",
    daysAgo: 5,
  },
  {
    userId: "mock-user-001",
    brandId: "brand-silk-society-1013",
    status: "rejected",
    walletType: "standard",
    saleAmount: 59,
    payout: 6.5,
    description: "Cancelled makeup subscription",
    daysAgo: 6,
  },
  {
    userId: "mock-user-001",
    brandId: "brand-green-fork-grocers-1032",
    status: "pending",
    walletType: "standard",
    saleAmount: 88,
    payout: 9.4,
    description: "Organic pantry top-up",
    daysAgo: 7,
  },
  {
    userId: "mock-user-001",
    brandId: "brand-gadget-grove-1015",
    status: "approved",
    walletType: "mycashback",
    saleAmount: 90,
    payout: 11.25,
    description: "Gadget Grove bonus unlock",
    daysAgo: 2,
    referenceId: "mcb-conv-2001",
  },
  {
    userId: "mock-user-001",
    brandId: "brand-pearl-polish-1037",
    status: "approved",
    walletType: "mycashback",
    saleAmount: 60,
    payout: 7.5,
    description: "Pearl Polish partner boost",
    daysAgo: 1,
    referenceId: "mcb-conv-2002",
  },
  {
    userId: "mock-user-001",
    brandId: "brand-cloudnine-travel-1018",
    status: "pending",
    walletType: "mycashback",
    saleAmount: 40,
    payout: 4.8,
    description: "Travel partner bonus pending",
    daysAgo: 3,
    referenceId: "mcb-conv-2003",
  },
  {
    userId: "mock-user-002",
    brandId: "brand-staymint-hotels-1022",
    status: "approved",
    walletType: "standard",
    saleAmount: 186,
    payout: 21.2,
    description: "Hotel stay payout",
    daysAgo: 2,
  },
  {
    userId: "mock-user-002",
    brandId: "brand-nimbus-tech-1027",
    status: "approved",
    walletType: "standard",
    saleAmount: 140,
    payout: 14.1,
    description: "Nimbus workstation purchase",
    daysAgo: 4,
  },
  {
    userId: "mock-user-002",
    brandId: "brand-velvet-vanity-1029",
    status: "approved",
    walletType: "standard",
    saleAmount: 134,
    payout: 17.8,
    description: "Velvet Vanity skincare order",
    daysAgo: 5,
  },
  {
    userId: "mock-user-002",
    brandId: "brand-alpine-air-pass-1038",
    status: "approved",
    walletType: "standard",
    saleAmount: 210,
    payout: 25.4,
    description: "Resort booking cashback",
    daysAgo: 1,
  },
  {
    userId: "mock-user-002",
    brandId: "brand-byte-bazaar-1031",
    status: "approved",
    walletType: "standard",
    saleAmount: 120,
    payout: 9.6,
    description: "Desk accessories bundle",
    daysAgo: 6,
  },
  {
    userId: "mock-user-002",
    brandId: "brand-spice-route-pantry-1036",
    status: "approved",
    walletType: "standard",
    saleAmount: 105,
    payout: 13.5,
    description: "Pantry restock approved",
    daysAgo: 7,
  },
  {
    userId: "mock-user-002",
    brandId: "brand-coastal-commute-1034",
    status: "pending",
    walletType: "standard",
    saleAmount: 92,
    payout: 7.1,
    description: "Commute pass still pending",
    daysAgo: 3,
  },
  {
    userId: "mock-user-002",
    brandId: "brand-lumen-cosmetics-1033",
    status: "approved",
    walletType: "mycashback",
    saleAmount: 50,
    payout: 6.25,
    description: "Lumen ambassador reward",
    daysAgo: 2,
    referenceId: "mcb-conv-2101",
  },
  {
    userId: "mock-user-003",
    brandId: "brand-nova-travel-club-1008",
    status: "pending",
    walletType: "standard",
    saleAmount: 130,
    payout: 10.4,
    description: "Travel club booking in review",
    daysAgo: 2,
  },
  {
    userId: "mock-user-003",
    brandId: "brand-daily-harvest-box-1011",
    status: "pending",
    walletType: "standard",
    saleAmount: 78,
    payout: 7.9,
    description: "Meal kit approval in progress",
    daysAgo: 3,
  },
  {
    userId: "mock-user-003",
    brandId: "brand-echo-devices-1023",
    status: "pending",
    walletType: "standard",
    saleAmount: 84,
    payout: 5.8,
    description: "Device bundle merchant review",
    daysAgo: 4,
  },
  {
    userId: "mock-user-003",
    brandId: "brand-amber-apothecary-1025",
    status: "pending",
    walletType: "standard",
    saleAmount: 96,
    payout: 9.5,
    description: "Wellness basket awaiting validation",
    daysAgo: 5,
  },
  {
    userId: "mock-user-003",
    brandId: "brand-harvest-hearth-1028",
    status: "approved",
    walletType: "standard",
    saleAmount: 110,
    payout: 12.2,
    description: "Hearth essentials approved",
    daysAgo: 6,
  },
  {
    userId: "mock-user-003",
    brandId: "brand-ohm-outlet-1035",
    status: "rejected",
    walletType: "standard",
    saleAmount: 44,
    payout: 4.9,
    description: "Returned charger order",
    daysAgo: 7,
  },
  {
    userId: "mock-user-003",
    brandId: "brand-skyward-suites-1030",
    status: "pending",
    walletType: "mycashback",
    saleAmount: 52,
    payout: 5.6,
    description: "Stay bonus awaiting release",
    daysAgo: 1,
    referenceId: "mcb-conv-2201",
  },
  {
    userId: "mock-user-004",
    brandId: "brand-pocket-pantry-1002",
    status: "rejected",
    walletType: "standard",
    saleAmount: 74,
    payout: 8.4,
    description: "Pantry order refunded",
    daysAgo: 2,
  },
  {
    userId: "mock-user-004",
    brandId: "brand-glow-theory-1005",
    status: "rejected",
    walletType: "standard",
    saleAmount: 93,
    payout: 11.2,
    description: "Skin routine cancelled",
    daysAgo: 3,
  },
  {
    userId: "mock-user-004",
    brandId: "brand-circuit-nest-1009",
    status: "rejected",
    walletType: "standard",
    saleAmount: 69,
    payout: 6.1,
    description: "Smart home order reversed",
    daysAgo: 4,
  },
  {
    userId: "mock-user-004",
    brandId: "brand-horizon-escapes-1014",
    status: "rejected",
    walletType: "standard",
    saleAmount: 124,
    payout: 9.9,
    description: "Hotel reservation voided",
    daysAgo: 5,
  },
  {
    userId: "mock-user-004",
    brandId: "brand-luxe-lane-beauty-1017",
    status: "rejected",
    walletType: "standard",
    saleAmount: 102,
    payout: 13.3,
    description: "Beauty promo not eligible",
    daysAgo: 6,
  },
  {
    userId: "mock-user-004",
    brandId: "brand-radiant-lab-1021",
    status: "approved",
    walletType: "standard",
    saleAmount: 95,
    payout: 10.7,
    description: "Lab cosmetics approved",
    daysAgo: 7,
  },
  {
    userId: "mock-user-004",
    brandId: "brand-trailhead-outfitters-1026",
    status: "pending",
    walletType: "standard",
    saleAmount: 88,
    payout: 7.4,
    description: "Outfitters order pending",
    daysAgo: 1,
  },
  {
    userId: "mock-user-005",
    brandId: "brand-mint-mirror-1010",
    status: "approved",
    walletType: "standard",
    saleAmount: 120,
    payout: 15.6,
    description: "Mint Mirror serum purchase",
    daysAgo: 2,
  },
  {
    userId: "mock-user-005",
    brandId: "brand-pure-ritual-1016",
    status: "pending",
    walletType: "standard",
    saleAmount: 82,
    payout: 8.9,
    description: "Pure Ritual order pending",
    daysAgo: 4,
  },
  {
    userId: "mock-user-005",
    brandId: "brand-volt-market-1019",
    status: "rejected",
    walletType: "standard",
    saleAmount: 61,
    payout: 5.2,
    description: "Volt Market cancellation",
    daysAgo: 5,
  },
  {
    userId: "mock-user-005",
    brandId: "brand-basket-and-co-1040",
    status: "approved",
    walletType: "mycashback",
    saleAmount: 36,
    payout: 4.5,
    description: "Basket & Co referral reward",
    daysAgo: 1,
    referenceId: "mcb-conv-2401",
  },
];

const mockCashbackTransactions: MockCashbackTransactionSeed[] = cashbackBlueprints.map(
  (blueprint, index) => ({
    id: `cashback-${String(index + 1).padStart(3, "0")}`,
    userId: blueprint.userId,
    brandId: blueprint.brandId,
    conversionId: 578760651 + index,
    status: blueprint.status,
    walletType: blueprint.walletType,
    saleAmount: blueprint.saleAmount,
    payout: blueprint.payout,
    currency: "USD",
    datetimeConversion: addDays(mockNow, -blueprint.daysAgo),
    description: blueprint.description,
    referenceId:
      blueprint.referenceId ??
      (blueprint.walletType === "mycashback" ? `mcb-conv-${578760651 + index}` : undefined),
  })
);

export const MOCK_CASHBACK_TRANSACTION_COUNT = mockCashbackTransactions.length;

const sortByNewest = <T>(items: T[], getDate: (item: T) => Date) =>
  [...items].sort((left, right) => getDate(right).getTime() - getDate(left).getTime());

const getUserTransactions = (userId: string) =>
  sortByNewest(
    mockCashbackTransactions.filter((transaction) => transaction.userId === userId),
    (transaction) => transaction.datetimeConversion
  );

const getActiveUserTransactions = () => getUserTransactions(getActiveMockUserSeed().user._id);

const getActiveStandardTransactions = () =>
  getActiveUserTransactions().filter((transaction) => transaction.walletType === "standard");

const getActiveMyCashbackTransactions = () =>
  getActiveUserTransactions().filter((transaction) => transaction.walletType === "mycashback");

const getApprovedTransactions = (transactions: MockCashbackTransactionSeed[]) =>
  transactions.filter((transaction) => transaction.status === "approved");

const sumPayout = (transactions: MockCashbackTransactionSeed[]) =>
  Number(transactions.reduce((sum, transaction) => sum + transaction.payout, 0).toFixed(2));

const getBrandById = (brandId: string) => brandsById.get(brandId) ?? mockBrands[0]!;

const toWithdrawCheckItem = (transaction: MockCashbackTransactionSeed): DataWithdrawCheck => {
  const brand = getBrandById(transaction.brandId);

  return {
    conversion_id: transaction.conversionId,
    offer_id: brand.offer_id,
    aff_sub1: `publisher:${transaction.userId}`,
    aff_sub2: null,
    aff_sub3: null,
    aff_sub4: null,
    aff_sub5: null,
    adv_sub1: brand.offer_name_display,
    adv_sub2: transaction.description,
    adv_sub3: "TH",
    adv_sub4: transaction.walletType === "mycashback" ? "Partner Bonus" : "Mobile Web",
    adv_sub5: "mock",
    datetime_conversion: transaction.datetimeConversion,
    conversion_status: transaction.status,
    affiliate_remarks: null,
    currency: transaction.currency,
    sale_amount: transaction.saleAmount.toFixed(2),
    payout: transaction.payout.toFixed(2),
    base_payout: transaction.payout.toFixed(2),
    bonus_payout: "0.00",
    merchant_id: brand.merchant_id,
    offer_name: brand.offer_name_display,
  };
};

const mockOfferIdFromBrand = (brand: DataOffer): OfferID => ({
  _id: brand._id,
  offer_id: brand.offer_id,
  commissions: brand.commissions,
  logo: brand.logo,
  offer_name: brand.offer_name,
  logo_desktop: brand.logo_desktop,
  logo_mobile: brand.logo_mobile,
  offer_name_display: brand.offer_name_display,
});

const createMockCoupons = (brand: DataOffer, index: number): CouponData[] => [
  {
    _id: `coupon-${brand.offer_id}-1`,
    name: `${brand.offer_name_display} Welcome Drop`,
    description: `Extra savings on selected ${brand.categories.toLowerCase()} orders.`,
    code: `SAVE${brand.offer_id}`,
    offer_id: mockOfferIdFromBrand(brand),
    start_date: addDays(mockNow, -7).toISOString(),
    end_date: addDays(mockNow, 14).toISOString(),
    eligibility: "New users and selected checkouts",
    min_spend: "25",
    discount: 10 + (index % 4) * 5,
    createdAt: addDays(mockNow, -7),
    updatedAt: addDays(mockNow, -1),
    disabled: false,
    __v: 0,
    link: brand.preview_url,
  },
  {
    _id: `coupon-${brand.offer_id}-2`,
    name: `${brand.offer_name_display} Weekend Boost`,
    description: "Short-run promotion for cashback-friendly baskets.",
    code: `BOOST${brand.offer_id}`,
    offer_id: mockOfferIdFromBrand(brand),
    start_date: addDays(mockNow, -2).toISOString(),
    end_date: addDays(mockNow, 7).toISOString(),
    eligibility: "Weekend purchases only",
    min_spend: "50",
    discount: 15,
    createdAt: addDays(mockNow, -2),
    updatedAt: mockNow,
    disabled: false,
    __v: 0,
    link: brand.preview_url,
  },
];

const mockCouponsByBrandId = new Map(
  mockBrands.map((brand, index) => [brand._id, createMockCoupons(brand, index)])
);

const paginateItems = <T>(items: T[], page: number, limit: number) => {
  const safePage = Number.isFinite(page) && page > 0 ? page : 1;
  const safeLimit = Number.isFinite(limit) && limit > 0 ? limit : items.length || 1;
  const start = (safePage - 1) * safeLimit;

  return {
    page: safePage,
    limit: safeLimit,
    total: items.length,
    totalPages: Math.max(1, Math.ceil(items.length / safeLimit)),
    data: items.slice(start, start + safeLimit),
  };
};

const filterBrands = (category: string | null, search: string | null) => {
  const normalizedCategory = normalizeCategory(category);
  const normalizedSearch = normalize(search);

  return mockBrands.filter((brand) => {
    const categoryMatch = !normalizedCategory || brand.categories === normalizedCategory;
    const searchMatch =
      !normalizedSearch ||
      [
        brand.offer_name,
        brand.offer_name_display,
        brand.categories,
        categoryDisplayName[brand.categories as MockBrandCategory] ?? brand.categories,
        ...brand.product_type.map((productType) => productType.name),
      ].some((value) => value.toLowerCase().includes(normalizedSearch));

    return categoryMatch && searchMatch;
  });
};

/** Procedural “Product Discovery” scale mock: IDs `mock-offer-mass-{0…N-1}` (opt-in via env). */
const MOCK_MASS_OFFER_ID_PREFIX = "mock-offer-mass";
const MOCK_MASS_OFFER_CAP = 100_000;

const DISCOVER_MOCK_API_CATEGORIES = [
  "Travel",
  "electronic",
  "beauty",
  "Digital Services",
  "Food & Grocery",
  "others",
] as const;

function getMockMassOfferCatalogSize(): number {
  const raw = env.NEXT_PUBLIC_MOCK_OFFER_CATALOG_SIZE;
  if (raw == null || raw === "") return 0;
  const n = Number.parseInt(String(raw).trim(), 10);
  if (!Number.isFinite(n) || n < 1) return 0;
  return Math.min(Math.floor(n), MOCK_MASS_OFFER_CAP);
}

function massOfferApiCategory(index: number): string {
  return DISCOVER_MOCK_API_CATEGORIES[index % DISCOVER_MOCK_API_CATEGORIES.length]!;
}

function apiCategoryToMockSeedCategory(apiCat: string): MockBrandCategory {
  const n = normalize(apiCat);
  if (n.includes("travel")) return "Travel";
  if (n === "electronic") return "electronic";
  if (n.includes("beauty")) return "beauty";
  if (n.includes("digital")) return "electronic";
  if (n.includes("food") || n.includes("grocery")) return "others";
  if (n.includes("other")) return "others";
  return "others";
}

function massOfferMatchesFilter(
  index: number,
  categoryParam: string | null,
  search: string | null
): boolean {
  const apiCat = massOfferApiCategory(index);
  const catNorm = normalize(categoryParam ?? "");
  if (catNorm.length > 0 && normalize(apiCat) !== catNorm) {
    return false;
  }
  const normalizedSearch = normalize(search);
  if (!normalizedSearch) return true;
  const name = `Mock Partner ${index + 1}`;
  const seedCat = apiCategoryToMockSeedCategory(apiCat);
  const hay = [name, apiCat, categoryDisplayName[seedCat] ?? apiCat, String(index + 1)]
    .join(" ")
    .toLowerCase();
  return hay.includes(normalizedSearch);
}

function buildMassMockOffer(index: number): DataOffer {
  const apiCat = massOfferApiCategory(index);
  const seedCat = apiCategoryToMockSeedCategory(apiCat);
  const template = mockBrandCatalog[index % mockBrandCatalog.length]!;
  const id = `${MOCK_MASS_OFFER_ID_PREFIX}-${index}`;
  const name = `Mock Partner ${index + 1}`;
  const commission = Number((5 + (index % 151) / 10).toFixed(1));
  const created = addDays(mockNow, -(index % 730));
  const base = createMockBrand({
    id,
    name,
    category: seedCat,
    commission,
    logo: template.logo,
    banner: template.banner,
    description: `${template.description} (mock catalog #${index + 1})`,
    has_coupon: index % 4 !== 0,
  });
  return {
    ...base,
    categories: apiCat,
    datetime_created: created,
    datetime_updated: created,
  };
}

function paginateMassOffers(
  category: string | null,
  search: string | null,
  page: number,
  limit: number
) {
  const n = getMockMassOfferCatalogSize();
  const allIndices: number[] = [];
  for (let i = 0; i < n; i++) {
    if (massOfferMatchesFilter(i, category, search)) {
      allIndices.push(i);
    }
  }
  const safePage = Number.isFinite(page) && page > 0 ? page : 1;
  const safeLimit = Number.isFinite(limit) && limit > 0 ? limit : 60;
  const start = (safePage - 1) * safeLimit;
  const pageIndices = allIndices.slice(start, start + safeLimit);
  const data = pageIndices.map(buildMassMockOffer);
  return {
    page: safePage,
    limit: safeLimit,
    total: allIndices.length,
    totalPages: Math.max(1, Math.ceil(allIndices.length / safeLimit)),
    data,
  };
}

function parseMassOfferIndex(brandId: string): number | null {
  if (!brandId.startsWith(`${MOCK_MASS_OFFER_ID_PREFIX}-`)) return null;
  const rest = brandId.slice(MOCK_MASS_OFFER_ID_PREFIX.length + 1);
  const idx = Number(rest);
  const cap = getMockMassOfferCatalogSize();
  if (!Number.isInteger(idx) || idx < 0 || idx >= cap || cap < 1) return null;
  return idx;
}

const buildMyCashbackSummary = (): ResponseWithdrawCheckMyCashback => {
  const approvedMyCashback = getApprovedTransactions(getActiveMyCashbackTransactions());
  const totalMyCashbackUSD = sumPayout(approvedMyCashback);

  return {
    totalMyCashbackTHB: usdToThb(totalMyCashbackUSD),
    totalMyCashbackUSD,
    availableUSD: totalMyCashbackUSD,
    availableTHB: usdToThb(totalMyCashbackUSD),
    conversionIdMyCashback: approvedMyCashback
      .map((transaction) => transaction.referenceId)
      .filter((referenceId): referenceId is string => Boolean(referenceId)),
  };
};

const buildWithdrawCheckResponse = (): ResponseWithdrawCheck => {
  const approvedStandardTransactions = getApprovedTransactions(getActiveStandardTransactions());
  const totalPayoutUSD = sumPayout(approvedStandardTransactions);
  const feeAmountUSD = Number(((totalPayoutUSD * mockFee.system) / 100).toFixed(2));
  const netAmountUSD = Number((totalPayoutUSD - feeAmountUSD).toFixed(2));
  const myCashbackSummary = buildMyCashbackSummary();

  return {
    totalPayoutTHB: usdToThb(totalPayoutUSD),
    totalPayoutUSD,
    netAmountTHB: usdToThb(netAmountUSD),
    netAmount: netAmountUSD,
    feeAmountTHB: usdToThb(feeAmountUSD),
    feeAmount: feeAmountUSD,
    feePercentage: mockFee.system,
    data: approvedStandardTransactions.map(toWithdrawCheckItem),
    fee: mockFee,
    payoutTotalCutFeeUSD: netAmountUSD,
    payoutTotalCutFeeTHB: usdToThb(netAmountUSD),
    availableWithdrawMCBTHB: myCashbackSummary.availableTHB,
    availableWithdrawMCBUSD: myCashbackSummary.availableUSD,
    MCBCashback: {
      totalMyCashbackTHB: myCashbackSummary.totalMyCashbackTHB,
      totalMyCashbackUSD: myCashbackSummary.totalMyCashbackUSD,
      availableUSD: myCashbackSummary.availableUSD,
      availableTHB: myCashbackSummary.availableTHB,
      fee: mockFee,
      conversionIdMyCashback: myCashbackSummary.conversionIdMyCashback,
    },
  };
};

const buildFavoriteList = (page: number, limit: number): IResponseFav => {
  const activeUserId = getActiveMockUserSeed().user._id;
  const favoriteSet = favoriteBrandIdsByUser.get(activeUserId) ?? new Set<string>();

  const items = [...favoriteSet]
    .map((brandId) => {
      const brand = brandsById.get(brandId);
      if (!brand) {
        return null;
      }

      const meta = ensureFavoriteMeta(activeUserId, brandId);

      return {
        _id: meta._id,
        offer_id: mockOfferIdFromBrand(brand),
        user_id: activeUserId,
        createdAt: meta.createdAt,
        updatedAt: mockNow,
        __v: 0,
      };
    })
    .filter(Boolean) as DataFavList[];

  return paginateItems(
    sortByNewest(items, (item) => new Date(item.createdAt)),
    page,
    limit
  );
};

const toggleFavoriteBrand = (brandId: string): DataFav | null => {
  const activeUserId = getActiveMockUserSeed().user._id;
  const favoriteSet = favoriteBrandIdsByUser.get(activeUserId) ?? new Set<string>();
  favoriteBrandIdsByUser.set(activeUserId, favoriteSet);

  if (!brandsById.has(brandId)) {
    return null;
  }

  if (favoriteSet.has(brandId)) {
    favoriteSet.delete(brandId);
    favoriteMetaByUser.get(activeUserId)?.delete(brandId);
    return null;
  }

  favoriteSet.add(brandId);
  const meta = ensureFavoriteMeta(activeUserId, brandId);

  return {
    offer_id: brandId,
    user_id: activeUserId,
    _id: meta._id,
    createdAt: meta.createdAt,
    updatedAt: mockNow,
    __v: 0,
  };
};

const buildMyCashbackBalance = (): ResGetBalanceMyCashback => {
  const activeUser = getActiveMockUserSeed();
  const myCashbackSummary = buildMyCashbackSummary();

  return {
    user: activeUser.user,
    userMyCashback: [
      {
        pictureProfile: null,
        withdrawalPassword: null,
        _id: `mcb-user-${activeUser.user._id}`,
        buyerId: `buyer-${activeUser.user._id}`,
        __v: 0,
        buyerToken: `buyer-token-${activeUser.user._id}`,
        createdAt: addDays(mockNow, -120),
        phoneNumber: activeUser.user.mobile,
        publisherId: `publisher-${activeUser.user._id}`,
        updatedAt: mockNow,
        balance: [
          {
            amount: myCashbackSummary.availableUSD,
            currency: "USD",
            lastUpdated: mockNow,
            _id: `${activeUser.user._id}-balance-usd`,
          },
          {
            amount: myCashbackSummary.availableTHB,
            currency: "THB",
            lastUpdated: mockNow,
            _id: `${activeUser.user._id}-balance-thb`,
          },
        ],
        binded: true,
        email: activeUser.user.email,
        facebookIdentity: "",
        firstName: activeUser.firstName,
        instagramIdentity: "",
        lastName: activeUser.lastName,
        metadata: {
          joinedStairSequenceBonus: true,
          joinedVipBonus: false,
          gotFirstTimeBonus: true,
          firstTimeBonusAmount: 5,
          currentLanguage: null,
          joinedStairSequenceBonusAt: null,
          joinedVipBonusAt: null,
        },
        rating: 5,
        twitterIdentity: activeUser.user.id_twitter,
        address: activeUser.user.address,
        banned: false,
        city: activeUser.city,
        bannedNote: "",
        gender: activeUser.user.gender || "",
        dateOfBirth: new Date(activeUser.user.birthdate || "1996-10-21"),
        lineIdentity: "",
        note: "",
        zipCode: activeUser.zipCode,
        creditScoreType: 1,
        isReSeller: false,
        emailVerified: true,
        phoneNumberVerified: true,
        flags: {
          hasRequestTNGDToken: false,
          isRedirectedFromBrowser: false,
        },
      },
    ],
    sumBalance: {
      USD: {
        amount: myCashbackSummary.availableUSD,
        currency: "USD",
        lastUpdated: mockNow,
        _id: `${activeUser.user._id}-sum-usd`,
      },
      THB: {
        amount: myCashbackSummary.availableTHB,
        currency: "THB",
        lastUpdated: mockNow,
        _id: `${activeUser.user._id}-sum-thb`,
      },
    },
  };
};

const buildWithdrawHistoryResponse = (page: number, limit: number): ResponseWithdrawHistory => {
  const activeUserId = getActiveMockUserSeed().user._id;
  const history = withdrawHistoryByUser.get(activeUserId) ?? [];
  const paginated = paginateItems(history, page, limit);

  return {
    data: paginated.data,
    pagination: {
      total: paginated.total,
      page: paginated.page,
      limit: paginated.limit,
      totalPages: paginated.totalPages,
    },
    totalAmount: Number(history.reduce((sum, item) => sum + Number(item.amount_net), 0).toFixed(2)),
    pending: history.filter((item) => item.status === "pending").length,
    approved: history.filter((item) => item.status === "approved").length,
    rejected: history.filter((item) => item.status === "rejected").length,
  };
};

const buildSummaryListCheck = (): ResGetSummaryListCheck => {
  const standardTransactions = getActiveStandardTransactions();

  const buildItems = (status: MockCashbackStatus) =>
    standardTransactions
      .filter((transaction) => transaction.status === status)
      .map((transaction) => {
        const item = toWithdrawCheckItem(transaction);

        return {
          _id: `summary-${transaction.id}`,
          conversion_id: item.conversion_id,
          __v: 0,
          adv_sub1: item.adv_sub1,
          adv_sub2: item.adv_sub2,
          adv_sub3: item.adv_sub3,
          adv_sub4: item.adv_sub4,
          adv_sub5: item.adv_sub5,
          aff_sub1: item.aff_sub1,
          aff_sub2: item.aff_sub2,
          aff_sub3: item.aff_sub3,
          aff_sub4: item.aff_sub4,
          aff_sub5: item.aff_sub5,
          affiliate_remarks: item.affiliate_remarks,
          base_payout: Number(item.base_payout),
          bonus_payout: Number(item.bonus_payout),
          conversion_status: item.conversion_status,
          createdAt: item.datetime_conversion,
          currency: item.currency,
          datetime_conversion: item.datetime_conversion,
          merchant_id: item.merchant_id,
          offer_id: item.offer_id,
          offer_name: item.offer_name,
          payout: Number(item.payout),
          sale_amount: Number(item.sale_amount),
          updatedAt: item.datetime_conversion,
        };
      });

  const buildStatusBlock = (status: MockCashbackStatus) => {
    const items = buildItems(status);

    return {
      count: items.length,
      totalPayout: Number(items.reduce((sum, item) => sum + item.payout, 0).toFixed(2)),
      items,
    };
  };

  return {
    totalsByStatusAndCurrency: (["approved", "pending", "rejected"] as MockCashbackStatus[]).map(
      (status) => {
        const items = buildItems(status);
        const totalPayout = Number(items.reduce((sum, item) => sum + item.payout, 0).toFixed(2));

        return {
          status,
          count: items.length,
          totalPayout,
          currencyBreakdown: [
            {
              currency: "USD",
              amount: totalPayout,
              usdAmount: totalPayout,
              thbAmount: usdToThb(totalPayout),
            },
          ],
          totalUSD: totalPayout,
          totalTHB: usdToThb(totalPayout),
        };
      }
    ),
    data: {
      approved: buildStatusBlock("approved"),
      pending: buildStatusBlock("pending"),
      rejected: buildStatusBlock("rejected"),
    },
    fee: mockFee,
  };
};

const buildConversionHistory = (page: number, limit: number): ResConversionHistory => {
  const standardTransactions = getActiveStandardTransactions();
  const paginated = paginateItems(standardTransactions.map(toWithdrawCheckItem), page, limit);
  const approvedTotalUsd = sumPayout(
    standardTransactions.filter((transaction) => transaction.status === "approved")
  );
  const pendingTotalUsd = sumPayout(
    standardTransactions.filter((transaction) => transaction.status === "pending")
  );

  return {
    data: paginated.data as ResConversionHistory["data"],
    pagination: {
      total: paginated.total,
      limit: paginated.limit,
      page: paginated.page,
      totalPages: paginated.totalPages,
    },
    totalUSD: {
      approved: approvedTotalUsd,
      pending: pendingTotalUsd,
    },
    totalTHB: {
      approved: usdToThb(approvedTotalUsd),
      pending: usdToThb(pendingTotalUsd),
    },
  };
};

const buildGeneratedDeeplink = (
  payload: RequestGenerateDeeplink | undefined
): ResponseGenerateDeeplink => {
  const activeUserId = getActiveMockUserSeed().user._id;
  const brand = mockBrands.find((item) => item.offer_id === payload?.offer_id) ?? mockBrands[0]!;
  const record = createMockAffiliateRecord(activeUserId, brand);
  const currentOffers = myOffersByUser.get(activeUserId) ?? [];

  myOffersByUser.set(activeUserId, [
    {
      ...record,
      offer_name: brand.offer_name_display,
    },
    ...currentOffers.filter((item) => item.offer_id !== brand.offer_id),
  ]);

  return record;
};

const buildMyOffersList = (page: number, limit: number) => {
  const activeUserId = getActiveMockUserSeed().user._id;
  const currentOffers = myOffersByUser.get(activeUserId) ?? [];

  return paginateItems(
    sortByNewest(currentOffers, (item) => new Date(item.createdAt)),
    page,
    limit
  ).data;
};

const buildNewWithdrawHistoryRecord = (
  body: unknown,
  methodFallback: string
): DataWithdrawHistory => {
  const activeUser = getActiveMockUserSeed();
  const payload = isRecord(body) ? body : {};
  const now = new Date();

  return {
    _id: `withdraw-history-${String(withdrawHistorySequence++).padStart(3, "0")}`,
    address: String(payload.address ?? activeUser.user.address ?? ""),
    account_number: String(payload.account_number ?? ""),
    account_name: String(payload.account_name ?? activeUser.user.username),
    bank_name: String(payload.bank_name ?? ""),
    amount_total: toNumber(payload.amount_total),
    amount_net: toNumber(payload.amount_net),
    percent_fee: toNumber(payload.percent_fee),
    status: "pending",
    method: String(payload.method ?? methodFallback),
    tx_hash: String(payload.tx_hash ?? ""),
    user_id: activeUser.user._id,
    conversion_id: parseNumberArray(payload.conversion_ids),
    mycashback_id: parseStringArray(payload.mycashback_id),
    currency: String(payload.currency ?? "USD"),
    createdAt: now,
    updatedAt: now,
    __v: 0,
  };
};

const prependWithdrawHistory = (record: DataWithdrawHistory) => {
  const activeUserId = getActiveMockUserSeed().user._id;
  const currentHistory = withdrawHistoryByUser.get(activeUserId) ?? [];

  withdrawHistoryByUser.set(activeUserId, [record, ...currentHistory]);
};

const buildMockWithdrawCreatePayload = (body?: unknown) => {
  const record = buildNewWithdrawHistoryRecord(body, "web3");
  prependWithdrawHistory(record);

  return {
    _id: record._id,
    message: "Withdrawal recorded (demo)",
    status: "pending",
  };
};

const buildMockBankTransferResponse = (body?: unknown): ResWithdrawBankTransfer => {
  const historyRecord = buildNewWithdrawHistoryRecord(body, "bank_transfer");
  prependWithdrawHistory(historyRecord);

  return {
    message: "Demo: bank transfer withdrawal queued",
    status: "success",
    data: {
      _id: historyRecord._id,
      address: historyRecord.address,
      account_number: historyRecord.account_number,
      account_name: historyRecord.account_name,
      bank_name: historyRecord.bank_name,
      amount_total: historyRecord.amount_total,
      amount_net: historyRecord.amount_net,
      percent_fee: historyRecord.percent_fee,
      status: historyRecord.status,
      method: historyRecord.method,
      tx_hash: historyRecord.tx_hash,
      tx_hash_record: `mock-bank-record-${historyRecord._id}`,
      user_id: historyRecord.user_id,
      conversion_id: historyRecord.conversion_id,
      currency: historyRecord.currency,
      createdAt: historyRecord.createdAt,
      updatedAt: historyRecord.updatedAt,
      __v: historyRecord.__v,
    },
  };
};

const MOCK_WITHDRAW_SIGNATURE = `0x${"11".repeat(65)}` as const;

const getActiveUserProfile = () => getActiveMockUserSeed().user;
const getActiveUserMethods = () => getActiveMockUserSeed().paymentMethods;

const MOCK_QUEST_OPEN_DATE: ResponseQuestDate = {
  _id: "mock-quest-open-1",
  status: "open",
  __v: 0,
  createdAt: mockNow,
  updatedAt: mockNow,
  start_date: new Date("2026-03-01T00:00:00.000Z"),
  end_date: new Date("2026-03-31T23:59:59.000Z"),
  facebook_page: "",
  line: "",
  facebook_post: "",
  banner_en: "",
  banner_th: "",
  sub_banner_en: "",
  sub_banner_th: "",
};

function baseQuestRank(
  partial: Partial<QuestRankResponse> &
    Pick<QuestRankResponse, "username" | "point" | "rank" | "user_id">
): QuestRankResponse {
  return {
    _id: `quest-rank-${partial.rank}-${partial.username.replace(/\s+/g, "-")}`,
    email: "",
    conversion: [],
    extra_point_received: 0,
    bonus_over_300_received: 0,
    extra_point_referral: 0,
    point_social_reward: 0,
    unique_merchants: [],
    ...partial,
  };
}

const MOCK_QUEST_LEADERBOARD_TAIL: Array<{ user_id: string; username: string; point: number }> = [
  { user_id: "mock-user-rank-6", username: "PixelPilot", point: 695 },
  { user_id: "mock-user-rank-7", username: "CashFlowCat", point: 672 },
  { user_id: "mock-user-rank-8", username: "TurboSaver", point: 648 },
  { user_id: "mock-user-rank-9", username: "MintMarathon", point: 625 },
  { user_id: "mock-user-rank-10", username: "ShopHunter88", point: 601 },
  { user_id: "mock-user-rank-11", username: "BonusBuilder", point: 578 },
  { user_id: "mock-user-rank-12", username: "QuestNova", point: 554 },
  { user_id: "mock-user-rank-13", username: "DealDrifter", point: 531 },
  { user_id: "mock-user-rank-14", username: "RewardRider", point: 508 },
  { user_id: "mock-user-rank-15", username: "TierTrader", point: 484 },
  { user_id: "mock-user-rank-16", username: "CashbackAce", point: 461 },
  { user_id: "mock-user-rank-17", username: "OfferOptIn", point: 438 },
  { user_id: "mock-user-rank-18", username: "StackStar", point: 414 },
  { user_id: "mock-user-rank-19", username: "PointsPanda", point: 391 },
  { user_id: "mock-user-rank-20", username: "SwiftShopper", point: 368 },
];

function getMockQuestLeaderboard(): QuestRankResponse[] {
  const u = getActiveMockUserSeed().user;
  const head: QuestRankResponse[] = [
    baseQuestRank({ user_id: "mock-user-rank-1", username: "StarHunter", point: 2100, rank: 1 }),
    baseQuestRank({ user_id: "mock-user-rank-2", username: "LunaMint", point: 1840, rank: 2 }),
    baseQuestRank({ user_id: "mock-user-rank-3", username: "QuestKid", point: 1590, rank: 3 }),
    baseQuestRank({
      user_id: u._id,
      username: u.username,
      point: 940,
      rank: 4,
      extra_point_received: 120,
      extra_point_referral: 40,
      bonus_over_300_received: 30,
      point_social_reward: 25,
    }),
    baseQuestRank({ user_id: "mock-user-rank-5", username: "NeoShop", point: 720, rank: 5 }),
  ];
  const tail = MOCK_QUEST_LEADERBOARD_TAIL.map((row, i) =>
    baseQuestRank({
      user_id: row.user_id,
      username: row.username,
      point: row.point,
      rank: 6 + i,
    })
  );
  return [...head, ...tail];
}

function getMockMyQuestList(): QuestRankResponse {
  const u = getActiveMockUserSeed().user;
  const row = getMockQuestLeaderboard().find((x) => x.user_id === u._id);
  return row ?? getMockQuestLeaderboard()[3]!;
}

function getMockQuestHistorySummary(): QuestHistorySummary {
  return {
    monthly: [
      { month: "2026-03", points: 520 },
      { month: "2026-02", points: 380 },
      { month: "2026-01", points: 210 },
    ],
    rewards: [
      {
        _id: "reward-1",
        title: "March top-10 bonus",
        description: "Campaign leaderboard reward",
        points: 80,
        grantedAt: "2026-03-20T12:00:00.000Z",
        type: "tier",
      },
      {
        _id: "reward-2",
        title: "Social share milestone",
        points: 25,
        grantedAt: "2026-03-12T09:30:00.000Z",
        type: "social",
      },
      {
        _id: "reward-3",
        title: "Spend bonus over 300",
        points: 30,
        grantedAt: "2026-02-28T18:00:00.000Z",
        type: "bonus",
      },
    ],
  };
}

function getMockQuestSocial(): ResSocialReward {
  return {
    quest: {
      _id: MOCK_QUEST_OPEN_DATE._id,
      status: MOCK_QUEST_OPEN_DATE.status,
      __v: MOCK_QUEST_OPEN_DATE.__v,
      createdAt: MOCK_QUEST_OPEN_DATE.createdAt,
      updatedAt: MOCK_QUEST_OPEN_DATE.updatedAt,
      start_date: MOCK_QUEST_OPEN_DATE.start_date,
      end_date: MOCK_QUEST_OPEN_DATE.end_date,
      reward_status: false,
      facebook_page: MOCK_QUEST_OPEN_DATE.facebook_page,
      line: MOCK_QUEST_OPEN_DATE.line,
      facebook_post: MOCK_QUEST_OPEN_DATE.facebook_post,
    },
    socialRewards: [],
  };
}

function getMockQuestUserPeriodSummary(
  userId: string,
  start: string,
  end: string
): QuestUserPeriodSummary {
  const row =
    getMockQuestLeaderboard().find((x) => x.user_id === userId) ?? getMockQuestLeaderboard()[0]!;
  const summary = getMockQuestHistorySummary();
  const startT = new Date(`${start}T00:00:00.000Z`).getTime();
  const endT = new Date(`${end}T23:59:59.999Z`).getTime();
  const rewards = summary.rewards.filter((r) => {
    const t = new Date(r.grantedAt).getTime();
    return t >= startT && t <= endT;
  });
  const rankInList = getMockQuestLeaderboard().findIndex((x) => x.user_id === userId);
  return {
    user_id: userId,
    username: row.username,
    point: row.point,
    rank: rankInList >= 0 ? rankInList + 1 : (row.rank ?? 1),
    rewards,
  };
}

const MOCK_BANK_LIST: ResponseBankList[] = [
  { code: "KBANK", shortName: "KBANK", nameEn: "Kasikorn Bank", nameTh: "ธนาคารกสิกรไทย" },
  { code: "BBL", shortName: "BBL", nameEn: "Bangkok Bank", nameTh: "ธนาคารกรุงเทพ" },
  { code: "SCB", shortName: "SCB", nameEn: "Siam Commercial Bank", nameTh: "ธนาคารไทยพาณิชย์" },
  { code: "KTB", shortName: "KTB", nameEn: "Krungthai Bank", nameTh: "ธนาคารกรุงไทย" },
];

function userToReferralId(
  u: User,
  overrides?: Partial<Pick<User, "_id" | "username">>
): ReferralID {
  return {
    _id: overrides?._id ?? u._id,
    address: u.address,
    __v: u.__v,
    email: u.email,
    id_twitter: u.id_twitter,
    username: overrides?.username ?? u.username,
    country: u.country,
  };
}

function buildMockReferralList(): ResponseReferralList[] {
  const u = getActiveUserProfile();
  const self = userToReferralId(u);
  const invitee = userToReferralId(u, { _id: "mock-invitee-user", username: "FriendInvite" });
  return [
    {
      _id: "mock-referral-row-1",
      user_id: self,
      conversion_id: 88001,
      referral_id: invitee,
      point: 120,
      type: "referral",
      action: "signup_complete",
      referral_category: "account",
      createdAt: mockNow,
      updatedAt: mockNow,
      __v: 0,
    },
    {
      _id: "mock-referral-row-2",
      user_id: self,
      conversion_id: 88002,
      referral_id: invitee,
      point: 45,
      type: "purchase",
      action: "first_order",
      referral_category: "shop",
      createdAt: addDays(mockNow, -3),
      updatedAt: addDays(mockNow, -2),
      __v: 0,
    },
  ];
}

/** HTTP status for axios mock adapter (e.g. POST /withdraw expects 201). */
export const getMockHttpStatus = (pathname: string, method: string): number => {
  const uppercaseMethod = method.toUpperCase();

  if (uppercaseMethod === "POST" && pathname === "/withdraw") {
    return 201;
  }

  return 200;
};

export const getMockApiResponse = (
  requestUrl: string,
  method: "GET" | "POST" | "PUT" = "GET",
  body?: unknown
) => {
  const url = new URL(requestUrl, "https://mock.gogocash.local");
  const pathname = url.pathname;

  if (method === "GET") {
    if (pathname === "/offer/banner-home") {
      return mockBannerHome;
    }

    if (pathname === "/offer/extra") {
      return mockBrands.filter((brand) => topBrandIds.has(brand._id));
    }

    if (pathname === "/offer/extra-point") {
      return mockBrands.filter((brand) => topBrandIds.has(brand._id));
    }

    if (pathname === "/offer/get-category/list") {
      return mockCategories;
    }

    if (pathname === "/withdraw/methods-list") {
      return getActiveUserMethods();
    }

    if (pathname === "/withdraw/banks") {
      return MOCK_BANK_LIST;
    }

    if (pathname.startsWith("/withdraw/methods/")) {
      const methodId = pathname.slice("/withdraw/methods/".length);
      const list = getActiveUserMethods();
      return list.find((m) => m._id === methodId) ?? list[0] ?? null;
    }

    if (pathname === "/point/referral-list") {
      return buildMockReferralList();
    }

    {
      const m = pathname.match(/^\/auth\/check-account-telegram\/([^/]+)$/);
      if (m) {
        return { email: getActiveUserProfile().email };
      }
    }

    if (pathname === "/user/profile") {
      return getActiveUserProfile();
    }

    if (pathname === "/user/balance/me/mycashback") {
      return buildMyCashbackBalance();
    }

    if (pathname === "/point/get-quest-open") {
      return MOCK_QUEST_OPEN_DATE;
    }

    if (pathname === "/point/quest-history-summary") {
      return getMockQuestHistorySummary();
    }

    if (/^\/point\/check-points\/[^/]+\/[^/]+$/.test(pathname)) {
      return getMockQuestLeaderboard();
    }

    if (/^\/point\/my-quest-list\/[^/]+\/[^/]+$/.test(pathname)) {
      return getMockMyQuestList();
    }

    if (pathname === "/point/get-quest-social") {
      return getMockQuestSocial();
    }

    {
      const periodUserMatch = pathname.match(
        /^\/point\/quest-user-period-summary\/([^/]+)\/([^/]+)\/([^/]+)$/
      );
      if (periodUserMatch) {
        const [, encUser, start, end] = periodUserMatch;
        if (encUser && start && end) {
          return getMockQuestUserPeriodSummary(decodeURIComponent(encUser), start, end);
        }
      }
    }

    if (pathname === "/withdraw") {
      const page = Number(url.searchParams.get("page") || "1");
      const limit = Number(url.searchParams.get("limit") || "100");
      return buildWithdrawHistoryResponse(page, limit);
    }

    if (pathname.startsWith("/offer/favorite/")) {
      const [, , , pageParam, limitParam] = pathname.split("/");
      return buildFavoriteList(Number(pageParam), Number(limitParam));
    }

    if (pathname.startsWith("/offer/get-coupon-id/")) {
      const brandId = pathname.replace("/offer/get-coupon-id/", "");
      const cached = mockCouponsByBrandId.get(brandId);
      if (cached) return cached;
      const massIdx = parseMassOfferIndex(brandId);
      if (massIdx != null) {
        return createMockCoupons(buildMassMockOffer(massIdx), massIdx);
      }
      return [];
    }

    if (pathname === "/offer") {
      const category = url.searchParams.get("category");
      const search = url.searchParams.get("search");
      const page = Number(url.searchParams.get("page") || "1");
      const limit = Number(url.searchParams.get("limit") || "8");

      if (getMockMassOfferCatalogSize() > 0) {
        return paginateMassOffers(category, search, page, limit);
      }
      return paginateItems(filterBrands(category, search), page, limit);
    }

    if (pathname.startsWith("/offer/")) {
      const brandId = pathname.replace("/offer/", "");
      const massIdx = parseMassOfferIndex(brandId);
      if (massIdx != null) {
        return buildMassMockOffer(massIdx);
      }
      return brandsById.get(brandId) ?? null;
    }
  }

  if (method === "POST") {
    if (pathname === "/withdraw/check") {
      return buildWithdrawCheckResponse();
    }

    if (pathname === "/withdraw/check-my-cashback") {
      return buildMyCashbackSummary();
    }

    if (pathname === "/withdraw/list-check") {
      return buildSummaryListCheck();
    }

    if (pathname === "/involve/conversion-all") {
      const payload = isRecord(body) ? body : {};
      const page = Number(payload.page || 1);
      const limit = Number(payload.limit || 100);
      return buildConversionHistory(page, limit);
    }

    if (pathname === "/involve/create-affiliate") {
      return buildGeneratedDeeplink(parseRequestGenerateDeeplink(body));
    }

    if (pathname === "/offer/my-offers") {
      const page = Number(url.searchParams.get("page") || "1");
      const limit = Number(url.searchParams.get("limit") || "18");
      return buildMyOffersList(page, limit);
    }

    if (pathname.startsWith("/offer/favorite/")) {
      const brandId = pathname.replace("/offer/favorite/", "");
      return toggleFavoriteBrand(brandId);
    }

    if (pathname === "/withdraw/methods") {
      // Account Setup flow submits here. Mock a plausible success payload
      // so the happy path (PromptPay via registered phone / other phone /
      // citizen ID) redirects to home as intended in mock-API mode.
      const payload = isRecord(body) ? body : {};
      return {
        message: "Method created",
        status: "success",
        data: {
          _id: `mock_method_${Date.now()}`,
          account_no: String(payload.account_no ?? ""),
          account_name: String(payload.account_name ?? ""),
          bank_name: String(payload.bank_name ?? ""),
          bank_code: String(payload.bank_code ?? ""),
          is_default: Boolean(payload.is_default),
          user_id: getActiveUserProfile()._id,
          createdAt: new Date(),
          updatedAt: new Date(),
          __v: 0,
        },
      };
    }

    if (pathname === "/withdraw/signature") {
      return MOCK_WITHDRAW_SIGNATURE;
    }

    if (pathname === "/withdraw") {
      return buildMockWithdrawCreatePayload(body);
    }

    if (pathname === "/withdraw/bank-transfer") {
      return buildMockBankTransferResponse(body);
    }

    if (pathname === "/auth/send-otp") {
      const payload = isRecord(body) ? body : {};
      const email = String(payload.email ?? "");
      if (!isDevEmailOtpTestAddress(email)) return null;
      return {};
    }

    if (pathname === "/auth/verify-otp") {
      const payload = isRecord(body) ? body : {};
      const email = String(payload.email ?? "");
      if (!isDevEmailOtpTestAddress(email)) return null;
      return {};
    }

    if (pathname === "/auth/log-in/telegram") {
      const payload = isRecord(body) ? body : {};
      const email = String(payload.email ?? "");
      const telegramMock = devEmailMockTelegramLoginResponse(email);
      return telegramMock ?? null;
    }

    if (pathname === "/auth/firebase") {
      const user = getActiveUserProfile();
      return {
        uid: `firebase-mock-${user._id}`,
        user,
      };
    }
  }

  if (method === "PUT") {
    if (pathname === "/user/profile" && isRecord(body)) {
      const activeUser = getActiveMockUserSeed();

      activeUser.user = {
        ...activeUser.user,
        ...Object.fromEntries(Object.entries(body).filter(([, value]) => value !== "")),
      };

      return activeUser.user;
    }
  }

  return null;
};

export const getMockHomeApiResponse = (requestUrl: string) => getMockApiResponse(requestUrl, "GET");
