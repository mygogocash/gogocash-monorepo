import {
  affiliateNetworkIdForOfferId,
  affiliateNetworkName,
} from "@/data/affiliateNetworks";

const now = new Date().toISOString();
const yesterday = new Date(Date.now() - 86400000).toISOString();
const lastWeek = new Date(Date.now() - 7 * 86400000).toISOString();
const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString();

export const mockAdminUsers: Array<{
  _id: string;
  username: string;
  password: string;
  email: string;
  /** Role id — built-in tier or custom role id. */
  role: string;
  status?: "active" | "pending";
  createdAt: string;
  updatedAt: string;
  __v: number;
}> = [
  {
    _id: "a1",
    username: "admin",
    password: "hashed",
    email: "admin@gogocash.co",
    role: "super_admin",
    status: "active",
    createdAt: lastWeek,
    updatedAt: now,
    __v: 0,
  },
  {
    _id: "a2",
    username: "moderator",
    password: "hashed",
    email: "mod@gogocash.co",
    role: "admin",
    status: "active",
    createdAt: lastWeek,
    updatedAt: now,
    __v: 0,
  },
  {
    _id: "a3",
    username: "support",
    password: "hashed",
    email: "support@gogocash.co",
    role: "editor",
    status: "active",
    createdAt: lastWeek,
    updatedAt: yesterday,
    __v: 0,
  },
  {
    _id: "a4",
    username: "analyst",
    password: "hashed",
    email: "analyst@gogocash.co",
    role: "viewer",
    status: "active",
    createdAt: lastWeek,
    updatedAt: yesterday,
    __v: 0,
  },
];

const userFirstNames = [
  "Alice",
  "Bob",
  "Charlie",
  "Diana",
  "Erica",
  "Frank",
  "Grace",
  "Henry",
  "Ivy",
  "Jack",
  "Kate",
  "Leo",
  "Mia",
  "Noah",
  "Olivia",
  "Paul",
  "Quinn",
  "Ryan",
  "Sara",
  "Tom",
  "Uma",
  "Victor",
  "Wendy",
  "Xavier",
  "Yuki",
  "Zara",
];
const userLastNames = [
  "Smith",
  "Johnson",
  "Lee",
  "Kim",
  "Chen",
  "Davis",
  "Wilson",
  "Brown",
  "Taylor",
  "Martinez",
  "Garcia",
  "Miller",
  "Jones",
  "Williams",
  "Anderson",
  "Thomas",
  "Jackson",
  "White",
  "Harris",
  "Clark",
];

export const mockUsers = Array.from({ length: 550 }, (_, i) => {
  const first = userFirstNames[i % userFirstNames.length];
  const last = userLastNames[i % userLastNames.length];
  const uname = `${first.toLowerCase()}_${last.toLowerCase()}_${i + 1}`;
  const email = `${uname}@example.com`;
  const dt = i % 3 === 0 ? lastWeek : i % 3 === 1 ? yesterday : now;
  const countries = ["TH", "US", "TH", "TH", "US"];
  const country = countries[i % 5];
  const gender = i % 3 === 0 ? "female" : i % 3 === 1 ? "male" : null;
  const birthdate =
    i % 4 === 0
      ? null
      : `${1985 + (i % 25)}-${String((i % 12) + 1).padStart(2, "0")}-${String((i % 28) + 1).padStart(2, "0")}`;
  return {
    _id: `u${i + 1}`,
    address: `0x${(0xabc123 + i).toString(16).toUpperCase().padStart(6, "0")}`,
    __v: 0,
    email,
    id_crossmint: i % 2 === 0 ? `cm_${i + 1}` : "",
    id_twitter: i % 3 !== 0 ? `tw_${uname}` : "",
    username: uname,
    mobile:
      country === "TH"
        ? `+668${String(10000000 + i).slice(-8)}`
        : `+1${String(2000000000 + i).slice(-10)}`,
    id_firebase: `fb_${i + 1}`,
    createdAt: dt,
    updatedAt: now,
    birthdate,
    country,
    gender,
    membershipTier: i % 3 === 0 ? "GoGoPass Plus" : "Basic",
    subscriptionPlan:
      i % 4 === 0
        ? "Monthly Premium"
        : i % 4 === 2
          ? "Annual Premium"
          : undefined,
    // First 80 users carry a credit score (single source consumed by buildCreditRows
    // in mockAdminFeatures); the tier is derived via tierFromScore so the Users table
    // matches the Credit Score module.
    creditScore: i < 80 ? 200 + ((i * 13) % 650) : undefined,
  };
});

/** Local assets under `public/images/merchant-logos/` (see Marketing / Merchant Logos). */
const MERCHANT_GADGETHUB = {
  logo: "/images/merchant-logos/gadgethub-th.png",
  logo_desktop: "/images/merchant-logos/gadgethub-th.png",
  logo_mobile: "/images/merchant-logos/gadgethub-th-mobile.png",
  banner: "/images/merchant-logos/gadgethub-th.png",
  logo_circle: "/images/merchant-logos/gadgethub-th-mobile.png",
} as const;
const MERCHANT_STYLEMART = {
  logo: "/images/merchant-logos/stylemart-id.png",
  logo_desktop: "/images/merchant-logos/stylemart-id.png",
  logo_mobile: "/images/merchant-logos/stylemart-id-mobile.png",
  banner: "/images/merchant-logos/stylemart-id.png",
  logo_circle: "/images/merchant-logos/stylemart-id-mobile.png",
} as const;
const MERCHANT_STAYPLUS = {
  logo: "/images/merchant-logos/stayplus-travel.png",
  logo_desktop: "/images/merchant-logos/stayplus-travel.png",
  logo_mobile: "/images/merchant-logos/stayplus-travel-mobile.png",
  banner: "/images/merchant-logos/stayplus-travel.png",
  logo_circle: "/images/merchant-logos/stayplus-travel-mobile.png",
} as const;

const offerTemplates = [
  {
    categories: "Electronics",
    commission_tracking: "CPS",
    commissions: ["5%", "3%"],
    countries: "TH",
    currency: "THB",
    description:
      "Cashback on gadgets, accessories, and IT retail at Banana IT (Thailand).",
    directory_page: "https://www.banana.co.th",
    is_require_approval: 0,
    ...MERCHANT_GADGETHUB,
    marketplace_store_offer: true,
    payment_terms: 60,
    preview_url: "https://www.banana.co.th",
    special_commissions: [],
    tracking_type: "pixel",
    validation_terms: 30,
    disabled: false,
    commission_store: 5,
    max_cap: null as number | null,
    partner_max_cap: 100_000 as number | null,
    banner_mobile: "",
    extra_store: false,
    offer_name_display: "Banana IT (TH)",
    offer_display_tags: {
      brand_category_enabled: true,
      brand_category_label: "",
      extra_cashback_tag: true,
      grab_coupon_tag: false,
      expire_in_days_enabled: true,
      expire_in_days: 14,
    },
    // Demo: an upsize event live this month so the Brands table "Upsize" tag shows.
    upsize_start_date: "2026-06-01",
    upsize_end_date: "2026-06-30",
    upsize_special_commission: 12,
    upsize_max_cap: 1000,
    upsize_all_product_types: true,
  },
  {
    categories: "Fashion",
    commission_tracking: "CPS",
    commissions: ["4%", "2%"],
    countries: "TH",
    currency: "THB",
    description: "Earn cashback on sportswear and footwear at Adidas Thailand.",
    directory_page: "https://www.adidas.co.th",
    is_require_approval: 0,
    ...MERCHANT_STYLEMART,
    marketplace_store_offer: true,
    payment_terms: 45,
    preview_url: "https://www.adidas.co.th",
    special_commissions: [],
    tracking_type: "pixel",
    validation_terms: 30,
    disabled: false,
    commission_store: 4,
    max_cap: 500,
    partner_max_cap: null as number | null,
    banner_mobile: "",
    extra_store: false,
    offer_name_display: "Adidas",
  },
  {
    categories: "Travel",
    commission_tracking: "CPS",
    commissions: ["6%"],
    countries: "TH,US",
    currency: "USD",
    description: "Cashback on flights and travel with AirAsia.",
    directory_page: "https://www.airasia.com",
    is_require_approval: 1,
    ...MERCHANT_STAYPLUS,
    marketplace_store_offer: false,
    payment_terms: 90,
    preview_url: "https://www.airasia.com",
    special_commissions: [],
    tracking_type: "postback",
    validation_terms: 60,
    disabled: false,
    commission_store: 6,
    max_cap: null as number | null,
    partner_max_cap: 500,
    banner_mobile: "",
    extra_store: false,
    offer_name_display: "AirAsia (Travel)",
  },
  {
    categories: "Food & Drink",
    commission_tracking: "CPS",
    commissions: ["3%"],
    countries: "TH",
    currency: "THB",
    description:
      "Mock inactive line — same merchant logo as Banana IT (TH) shopping.",
    directory_page: "https://www.banana.co.th",
    is_require_approval: 0,
    ...MERCHANT_GADGETHUB,
    marketplace_store_offer: false,
    payment_terms: 30,
    preview_url: "https://www.banana.co.th",
    special_commissions: [],
    tracking_type: "pixel",
    validation_terms: 14,
    disabled: true,
    commission_store: 3,
    max_cap: 200,
    partner_max_cap: 50_000,
    banner_mobile: "",
    extra_store: false,
    offer_name_display: "Banana IT (TH) — Food",
  },
];

export const mockOffers = Array.from({ length: 550 }, (_, i) => {
  const t = offerTemplates[i % 4];
  const offerId = 1001 + i;
  const merchantId = 2001 + (i % 4);
  const names = [
    "Banana IT TH - CPS",
    "Adidas TH - CPS",
    "AirAsia Travel - CPS",
    "Banana IT TH Food - CPS",
  ];
  const lookups = [
    "banana_it_th",
    "adidas_th",
    "airasia_travel",
    "banana_it_food",
  ];
  const _id = `o${i + 1}`;
  return {
    _id,
    offer_id: offerId,
    __v: 0,
    ...t,
    datetime_created: i % 3 === 0 ? lastWeek : i % 3 === 1 ? yesterday : now,
    datetime_updated: now,
    lookup_value: `${lookups[i % 4]}_${i}`,
    merchant_id: merchantId,
    offer_name: `${names[i % 4]} #${i + 1}`,
    tracking_link: `https://track.example.com/${lookups[i % 4]}/${i}`,
    affiliate_partner: affiliateNetworkName(affiliateNetworkIdForOfferId(_id)),
  };
});

const userRefs = mockUsers.map((u) => ({
  _id: u._id,
  address: u.address,
  email: u.email,
  username: u.username,
}));

const bankNames = [
  "Bangkok Bank",
  "Kasikorn Bank",
  "Krungthai Bank",
  "SCB",
  "BBL",
  "KBank",
];
const statuses: Array<"approved" | "pending" | "rejected"> = [
  "approved",
  "approved",
  "pending",
  "rejected",
];

export const mockWithdraws = Array.from({ length: 550 }, (_, i) => {
  const u = userRefs[i % userRefs.length];
  const amountTotal = 500 + (i % 50) * 200;
  const percentFee = 5;
  const amountNet =
    Math.round(amountTotal * (1 - percentFee / 100) * 100) / 100;
  // i === 0 is u1's demo crypto withdrawal ("w1"); keep it pending so u1's
  // Total Withdrawn reflects only the approved THB bank withdrawal below.
  const status = (i === 0 ? "pending" : statuses[i % 4]) as
    | "approved"
    | "pending"
    | "rejected";
  const method = i % 5 === 0 ? "crypto" : "bank_transfer";
  const currency = i % 3 === 0 ? "USD" : "THB";
  const dt = i % 3 === 0 ? lastWeek : i % 3 === 1 ? yesterday : now;
  return {
    _id: `w${i + 1}`,
    user_id: u,
    address: u.address,
    account_number:
      method === "bank_transfer"
        ? `${100 + (i % 900)}-${100 + (i % 900)}-${100 + (i % 900)}`
        : "",
    account_name: method === "bank_transfer" ? `User ${i + 1}` : "",
    bank_name:
      method === "bank_transfer" ? bankNames[i % bankNames.length] : "",
    amount_total: amountTotal,
    amount_net: amountNet,
    percent_fee: percentFee,
    status,
    method,
    tx_hash: status === "approved" && i % 2 === 0 ? `0xhash${i + 1}` : "",
    conversion_id: Array.from(
      { length: 2 + (i % 5) },
      (__, j) => 5001 + i * 3 + j,
    ),
    currency,
    createdAt: dt,
    updatedAt: now,
    __v: 0,
    slip_file: "",
  };
}).concat([
  // Hand-crafted bank-transfer withdrawal for u1 so the demo shows a fully
  // populated row (bank columns, slip file, etc.) alongside the crypto one.
  {
    _id: "w-u1-bank",
    user_id: userRefs[0], // u1
    address: userRefs[0].address,
    account_number: "012-3-45678-9",
    account_name: "Alice Smith",
    bank_name: "Kasikorn Bank",
    amount_total: 2500,
    amount_net: 2300,
    percent_fee: 8,
    status: "approved",
    method: "bank_transfer",
    tx_hash: "BANKREF-2026-000128",
    conversion_id: [5001, 5002],
    currency: "THB",
    createdAt: yesterday,
    updatedAt: now,
    __v: 0,
    slip_file: "slips/withdraw-u1-bank.jpg",
  },
]);
const conversionOffers = [
  {
    offer_id: 1001,
    merchant_id: 2001,
    offer_name: "Banana IT TH - CPS",
    currency: "THB",
    adv_sub1: "banana_it",
  },
  {
    offer_id: 1002,
    merchant_id: 2002,
    offer_name: "Adidas TH - CPS",
    currency: "THB",
    adv_sub1: "adidas",
  },
  {
    offer_id: 1003,
    merchant_id: 2003,
    offer_name: "AirAsia Travel - CPS",
    currency: "USD",
    adv_sub1: "airasia",
  },
  {
    offer_id: 1004,
    merchant_id: 2004,
    offer_name: "Banana IT TH Food - CPS",
    currency: "THB",
    adv_sub1: "banana_it_food",
  },
];

export const mockConversions = Array.from({ length: 550 }, (_, i) => {
  const convId = 5001 + i;
  const u = userRefs[i % userRefs.length];
  const o = conversionOffers[i % 4];
  const saleAmount = (500 + (i % 20) * 250).toFixed(2);
  const payoutVal = Number(saleAmount) * (0.03 + (i % 4) * 0.01);
  const payout = payoutVal.toFixed(2);
  const convStatuses: Array<"approved" | "pending" | "rejected"> = [
    "approved",
    "approved",
    "pending",
    "rejected",
  ];
  const conversion_status = convStatuses[i % 4];
  const dt = i % 3 === 0 ? lastWeek : i % 3 === 1 ? yesterday : now;
  return {
    conversion_id: convId,
    offer_id: o.offer_id,
    aff_sub1: u._id,
    aff_sub2: null,
    aff_sub3: null,
    aff_sub4: null,
    aff_sub5: null,
    adv_sub1: o.adv_sub1,
    adv_sub2: `order_${String(i + 1).padStart(4, "0")}`,
    adv_sub3: i % 2 === 0 ? "TH" : "US",
    adv_sub4: null,
    adv_sub5: i % 2 === 0 ? "mobile" : "desktop",
    datetime_conversion: dt,
    conversion_status,
    affiliate_remarks: null as string | null,
    currency: o.currency,
    sale_amount: saleAmount,
    payout,
    base_payout: payout,
    bonus_payout: "0.00",
    merchant_id: o.merchant_id,
    offer_name: o.offer_name,
    user: u,
    createdAt: dt,
    updatedAt: now,
  };
});

/**
 * Append a manual "Add cashback" entry to the conversions list so it surfaces
 * in the user's All Conversions table. Created as "pending" (an admin reviews it
 * → approved/rejected afterwards). Returns the new conversion id.
 */
export function addManualCashbackConversion(
  userId: string,
  amount: number,
  reason: string,
): number {
  const user = userRefs.find((u) => u._id === userId) ?? userRefs[0];
  const conversionId =
    mockConversions.reduce((max, c) => Math.max(max, c.conversion_id), 5000) + 1;
  const ts = new Date().toISOString();
  mockConversions.push({
    conversion_id: conversionId,
    offer_id: 0,
    aff_sub1: userId,
    aff_sub2: null,
    aff_sub3: null,
    aff_sub4: null,
    aff_sub5: null,
    adv_sub1: "Admin manual adding",
    adv_sub2: "",
    adv_sub3: "",
    adv_sub4: null,
    adv_sub5: "",
    datetime_conversion: ts,
    conversion_status: "pending",
    affiliate_remarks: reason,
    currency: "THB",
    sale_amount: "0.00",
    payout: amount.toFixed(2),
    base_payout: amount.toFixed(2),
    bonus_payout: "0.00",
    merchant_id: 0,
    offer_name: "Extra cashback",
    user,
    createdAt: ts,
    updatedAt: ts,
  });
  return conversionId;
}

/**
 * Resolve a pending "Extra cashback" request: set the conversion status and
 * return the wallet owner + amount so the caller can credit it on approval.
 * Returns null if no matching extra-cashback conversion exists.
 */
export function setManualCashbackStatus(
  conversionId: number,
  status: "approved" | "rejected",
  reason?: string,
): { userId: string; amount: number } | null {
  const c = mockConversions.find(
    (x) => x.conversion_id === conversionId && x.offer_name === "Extra cashback",
  );
  if (!c) return null;
  c.conversion_status = status;
  if (reason) {
    (c as { rejection_reason?: string }).rejection_reason = reason;
  }
  return { userId: c.aff_sub1, amount: Number(c.payout) };
}

export const mockFee = [
  {
    _id: "f1",
    system: 5,
    global_max_cap_mode: "percent" as const,
    global_max_cap_percent: 0,
    global_max_cap_amount: 0,
    global_max_cap_currency: "THB",
    createdAt: lastWeek,
    updatedAt: now,
    __v: 0,
    minimum_withdraw_thb: 100,
    minimum_withdraw_usd: 5,
    fee_withdraw_usd: 1,
    fee_withdraw_thb: 30,
    withdraw_regions: [
      {
        id: "r-th",
        countryCode: "TH",
        currency: "THB",
        feeWithdraw: 30,
        minimumWithdraw: 100,
        max_cap_mode: "percent" as const,
        max_cap_percent: 0,
        max_cap_amount: 0,
        max_cap_currency: "THB",
      },
      {
        id: "r-us",
        countryCode: "US",
        currency: "USD",
        feeWithdraw: 1,
        minimumWithdraw: 5,
        max_cap_mode: "percent" as const,
        max_cap_percent: 0,
        max_cap_amount: 0,
        max_cap_currency: "USD",
      },
    ],
  },
];

export const mockBanner = {
  image_1: "banner-1",
  image_2: "banner-2",
  image_3: "banner-3",
  image_4: null,
  image_5: null,
  link_1: "https://www.bananastore.com/th",
  link_2: "https://www.adidas.co.th",
  link_3: "https://www.airasia.com",
  link_4: "",
  link_5: "",
};

/** Secondary / compact carousel row on the app home screen (below main hero banners). */
export const mockBannerHomeSmall = {
  image_1: "banner-small-1",
  image_2: null,
  image_3: null,
  image_4: null,
  image_5: null,
  link_1: "https://gogocash.app/promo/small-slot-1",
  link_2: "",
  link_3: "",
  link_4: "",
  link_5: "",
};

/** Carousel for the in-app “all brands” listing screen (separate from homepage). */
export const mockBannerAllBrandPage = {
  image_1: "brands-page-banner-1",
  image_2: null,
  image_3: null,
  image_4: null,
  image_5: null,
  link_1: "https://gogocash.app/brands/promo",
  link_2: "",
  link_3: "",
  link_4: "",
  link_5: "",
};

export const mockCategories = [
  {
    _id: "cat1",
    name: "Shopping",
    image: "",
    banner: "category-banner/cat1/sample-banner",
    createdAt: lastWeek,
    updatedAt: now,
  },
  {
    _id: "cat2",
    name: "Travel",
    image: "",
    banner: "",
    createdAt: lastWeek,
    updatedAt: now,
  },
  {
    _id: "cat3",
    name: "Food & Drink",
    image: "",
    banner: "",
    createdAt: lastWeek,
    updatedAt: now,
  },
  {
    _id: "cat4",
    name: "Finance",
    image: "",
    banner: "",
    createdAt: yesterday,
    updatedAt: now,
  },
  {
    _id: "cat5",
    name: "Entertainment",
    image: "",
    banner: "",
    createdAt: yesterday,
    updatedAt: now,
  },
];

const couponBrandNames = [
  "Banana IT TH - CPS",
  "Adidas TH - CPS",
  "AirAsia Travel - CPS",
  "Banana IT TH Food - CPS",
];

const couponOfferRefs = offerTemplates.map((t, i) => ({
  _id: `o${i + 1}`,
  offer_name: couponBrandNames[i],
  offer_name_display: t.offer_name_display,
  categories: t.categories,
  countries: t.countries,
  logo_desktop: t.logo_desktop,
}));

const couponTemplates = [
  {
    name: "Welcome 10%",
    description: "10% off for new users",
    codePrefix: "WELCOME",
    eligibility: "new_users",
    min_spend: "500",
    discount: 10,
    linkPath: "promo",
  },
  {
    name: "Flash Sale 15%",
    description: "Limited time flash sale discount",
    codePrefix: "FLASH",
    eligibility: "all",
    min_spend: "1000",
    discount: 15,
    linkPath: "flash",
  },
  {
    name: "Travel Bonus",
    description: "Extra cashback on hotel bookings",
    codePrefix: "TRAVEL",
    eligibility: "all",
    min_spend: "2000",
    discount: 5,
    linkPath: "deals",
  },
  {
    name: "First Order",
    description: "First order discount",
    codePrefix: "FIRST",
    eligibility: "new_users",
    min_spend: "300",
    discount: 20,
    linkPath: "first",
  },
  {
    name: "Weekend Deal",
    description: "Weekend special offer",
    codePrefix: "WEEKEND",
    eligibility: "all",
    min_spend: "800",
    discount: 12,
    linkPath: "weekend",
  },
  {
    name: "Member Exclusive",
    description: "Members only discount",
    codePrefix: "MEMBER",
    eligibility: "members",
    min_spend: "1500",
    discount: 8,
    linkPath: "member",
  },
];

const couponDomains = [
  "www.bananastore.com",
  "www.adidas.co.th",
  "www.airasia.com",
  "www.bananastore.com",
];

export const mockCoupons = Array.from({ length: 550 }, (_, i) => {
  const t = couponTemplates[i % couponTemplates.length];
  const offerRef = couponOfferRefs[i % couponOfferRefs.length];
  const domain = couponDomains[i % couponDomains.length];
  const code = `${t.codePrefix}${String(i + 1).padStart(3, "0")}`;
  const startDate =
    i % 4 === 0
      ? nextWeek
      : i % 4 === 1
        ? lastWeek
        : i % 4 === 2
          ? yesterday
          : now;
  const endDate = new Date(
    Date.now() + (90 + (i % 180)) * 86400000,
  ).toISOString();
  const limitedQuantity = i % 6 === 0 ? 500 : i % 11 === 2 ? 100 : 0;
  return {
    _id: `cp${i + 1}`,
    name: `${t.name} #${i + 1}`,
    description: t.description,
    code,
    offer_id: offerRef,
    start_date: startDate,
    end_date: endDate,
    eligibility: t.eligibility,
    min_spend: t.min_spend,
    min_spend_currency: "THB",
    max_cap: i % 4 === 0 ? "200" : "",
    max_cap_currency: "THB",
    discount: t.discount,
    discount_type: i % 3 === 0 ? "cash" : "percent",
    discount_currency: i % 3 === 0 ? "THB" : undefined,
    createdAt: startDate,
    updatedAt: now,
    disabled: i % 7 === 0,
    __v: 0,
    link: `https://${domain}/${t.linkPath}`,
    terms_and_conditions: `Minimum spend ${t.min_spend} THB. ${t.description}. Valid for ${t.eligibility.replace(/_/g, " ")}. One redemption per user unless stated otherwise. GoGoCash may amend or withdraw this offer at any time.`,
    start_time: "00:00",
    end_time: "23:59",
    usage_per_user: i % 5 === 0 ? "3" : "1",
    one_time_use_enabled: i % 5 !== 0,
    quantity: limitedQuantity,
    quantity_used:
      limitedQuantity > 0 && (i % 11 === 2 || i % 24 === 6)
        ? limitedQuantity
        : limitedQuantity > 0
          ? Math.floor(limitedQuantity * 0.3)
          : 0,
    unlimited_amount_enabled: limitedQuantity === 0,
  };
});

const mcbFirstNames = [
  "Alice",
  "Bob",
  "Charlie",
  "Diana",
  "Erica",
  "Frank",
  "Grace",
  "Henry",
  "Ivy",
  "Jack",
];
const mcbLastNames = [
  "Smith",
  "Johnson",
  "Lee",
  "Kim",
  "Chen",
  "Davis",
  "Wilson",
  "Brown",
  "Taylor",
  "Martinez",
];

export const mockMyCashback = Array.from({ length: 550 }, (_, i) => {
  const first = mcbFirstNames[i % mcbFirstNames.length];
  const last = mcbLastNames[i % mcbLastNames.length];
  const email = `mcb_${i + 1}@example.com`;
  const phone = `+668${String(10000000 + i).slice(-8)}`;
  const dt = i % 3 === 0 ? lastWeek : i % 3 === 1 ? yesterday : now;
  const amount = 500 + (i % 100) * 50;
  return {
    _id: `mcb${i + 1}`,
    metadata: {
      currentLanguage: null,
      firstTimeBonusAmount: 50,
      gotFirstTimeBonus: i % 2 === 0,
      joinedStairSequenceBonus: false,
      joinedStairSequenceBonusAt: null,
      joinedVipBonus: i % 5 === 0,
      joinedVipBonusAt: null,
      expiredVipBonusAt: null,
    },
    flags: { hasRequestTNGDToken: false, isRedirectedFromBrowser: false },
    buyerToken: `bt_${i + 1}`,
    pictureProfile: null,
    firstName: first,
    lastName: last,
    email,
    emailVerified: true,
    phoneNumber: phone,
    phoneNumberVerified: i % 10 !== 0,
    gender: i % 2 === 0 ? "female" : "male",
    dateOfBirth: null,
    lineIdentity: "",
    facebookIdentity: "",
    instagramIdentity: "",
    twitterIdentity: "",
    rating: 3 + (i % 3),
    creditScoreType: 1,
    withdrawalPassword: null,
    binded: i % 4 !== 0,
    note: "",
    banned: i % 50 === 0,
    bannedNote: "",
    address: "Bangkok",
    city: "Bangkok",
    zipCode: "10110",
    isReSeller: i % 20 === 0,
    buyerId: `b_${i + 1}`,
    publisherId: `p_${(i % 10) + 1}`,
    balance: [
      {
        amount,
        currency: "THB",
        countryCode: "TH",
        lastUpdated: now,
        _id: `bal${i + 1}`,
      },
    ],
    createdAt: dt,
    updatedAt: now,
    __v: 0,
  };
});

export const mockWithdrawDetail = {
  totalsByStatusAndCurrency: [
    {
      status: "approved",
      count: 2,
      totalPayout: 165,
      currencyBreakdown: [
        { currency: "THB", amount: 165, usdAmount: 4.7, thbAmount: 165 },
      ],
      totalUSD: 4.7,
      totalTHB: 165,
    },
    {
      status: "pending",
      count: 1,
      totalPayout: 200,
      currencyBreakdown: [
        { currency: "THB", amount: 200, usdAmount: 5.7, thbAmount: 200 },
      ],
      totalUSD: 5.7,
      totalTHB: 200,
    },
  ],
  data: {
    approved: { count: 2, totalPayout: 165, items: [] },
    pending: { count: 1, totalPayout: 200, items: [] },
    rejected: { count: 0, totalPayout: 0, items: [] },
  },
  fee: {
    _id: "f1",
    system: 5,
    store: 0,
    createdAt: lastWeek,
    updatedAt: now,
    __v: 0,
    fee_withdraw_usd: 1,
    fee_withdraw_thb: 30,
    minimum_withdraw_thb: 100,
    minimum_withdraw_usd: 5,
    minimum_withdraw: 100,
  },
  withdrawList: [
    {
      _id: "w1",
      address: "0xABC123",
      account_number: "123-456-789",
      account_name: "Alice Smith",
      bank_name: "Bangkok Bank",
      amount_total: 1500,
      amount_net: 1425,
      percent_fee: 5,
      status: "approved",
      method: "bank_transfer",
      tx_hash: "0xhash1",
      tx_hash_record: "",
      user_id: "u1",
      conversion_id: [5001, 5002],
      currency: "THB",
      mycashback_id: [],
      createdAt: yesterday,
      updatedAt: now,
      __v: 0,
      slip_file: "",
    },
    {
      _id: "w2",
      address: "0xABC123",
      account_number: "123-456-789",
      account_name: "Alice Smith",
      bank_name: "Bangkok Bank",
      amount_total: 800,
      amount_net: 760,
      percent_fee: 5,
      status: "pending",
      method: "bank_transfer",
      tx_hash: "",
      tx_hash_record: "",
      user_id: "u1",
      conversion_id: [5003],
      currency: "THB",
      mycashback_id: ["mcb1"],
      createdAt: now,
      updatedAt: now,
      __v: 0,
      slip_file: "",
    },
  ],
  allConversions: [
    {
      _id: "ac1",
      conversion_id: 5001,
      __v: 0,
      adv_sub1: "banana_it",
      adv_sub2: "order_001",
      adv_sub3: "TH",
      adv_sub4: "",
      adv_sub5: "mobile",
      aff_sub1: "u1",
      aff_sub2: null,
      aff_sub3: null,
      aff_sub4: null,
      aff_sub5: null,
      affiliate_remarks: "",
      base_payout: 125,
      bonus_payout: 0,
      conversion_status: "approved",
      createdAt: yesterday,
      currency: "THB",
      datetime_conversion: yesterday,
      merchant_id: 2001,
      offer_id: 1001,
      offer_name: "Banana IT TH - CPS",
      payout: 125,
      sale_amount: 2500,
      updatedAt: now,
    },
    {
      _id: "ac2",
      conversion_id: 5002,
      __v: 0,
      adv_sub1: "banana_it",
      adv_sub2: "order_002",
      adv_sub3: "TH",
      adv_sub4: "",
      adv_sub5: "desktop",
      aff_sub1: "u1",
      aff_sub2: null,
      aff_sub3: null,
      aff_sub4: null,
      aff_sub5: null,
      affiliate_remarks: "",
      base_payout: 40,
      bonus_payout: 0,
      conversion_status: "approved",
      createdAt: yesterday,
      currency: "THB",
      datetime_conversion: yesterday,
      merchant_id: 2001,
      offer_id: 1001,
      offer_name: "Banana IT TH - CPS",
      payout: 40,
      sale_amount: 800,
      updatedAt: now,
    },
    {
      _id: "ac3",
      conversion_id: 5003,
      __v: 0,
      adv_sub1: "adidas",
      adv_sub2: "order_003",
      adv_sub3: "TH",
      adv_sub4: "flash_sale",
      adv_sub5: "mobile",
      aff_sub1: "u1",
      aff_sub2: null,
      aff_sub3: null,
      aff_sub4: null,
      aff_sub5: null,
      affiliate_remarks: "Pending validation",
      base_payout: 200,
      bonus_payout: 0,
      conversion_status: "pending",
      createdAt: now,
      currency: "THB",
      datetime_conversion: now,
      merchant_id: 2002,
      offer_id: 1002,
      offer_name: "Adidas TH - CPS",
      payout: 200,
      sale_amount: 5000,
      updatedAt: now,
    },
  ],
  user: {
    _id: "u1",
    email: "alice@example.com",
    mobile: "+66812345678",
    emails: [
      "alice@example.com",
      "alice.smith@work.example.com",
      "a.smith.personal@gmail.com",
    ],
    mobiles: ["+66812345678", "+66898765432"],
    fullName: "Alice Smith",
    firstName: "Alice",
    lastName: "Smith",
    gender: "Female",
    birthdate: "1995-03-15",
    gogopassActive: true,
    wallet: "0xABC1234567890abcdef",
    createdAt: "2021-03-25T17:00:00.587Z",
    updatedAt: "2026-04-10T08:00:00.000Z",
    buyerId: "tmn.demo.buyer.u1",
    publisherId: "5fe00f25be6e4a4964398e02",
    streetAddress: "123 Sukhumvit Rd",
    city: "Bangkok",
    country: "TH",
    zipCode: "10110",
    rating: 86,
    creditScoreType: 0,
    emailVerified: true,
    phoneVerified: true,
    totalCashback: 2300,
    totalCashbackCurrency: "THB",
    userLog: [
      { action: "Login", at: "2026-03-14T10:30:00Z", ip: "192.168.1.1" },
      {
        action: "Withdraw requested",
        at: "2026-03-13T15:00:00Z",
        ip: "192.168.1.1",
      },
      { action: "Login", at: "2026-03-12T09:15:00Z", ip: "192.168.1.2" },
    ],
  },
  withdrawSumByCurrency: {
    approved: { THB: { netAmount: 1425, count: 1 } },
    pending: { THB: { netAmount: 760, count: 1 } },
  },
};

export const mockMCBDetail = {
  totalMyCashbackTHB: 1500,
  totalMyCashbackUSD: 42.86,
  availableUSD: 42.86,
  availableTHB: 1500,
  conversionIdMyCashback: ["5001", "5002"],
};
