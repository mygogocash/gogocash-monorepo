import {
  affiliateNetworkIdForOfferId,
  affiliateNetworkName,
} from "@/data/affiliateNetworks";

const now = new Date().toISOString();
const yesterday = new Date(Date.now() - 86400000).toISOString();
const lastWeek = new Date(Date.now() - 7 * 86400000).toISOString();

export const mockAdminUsers: Array<{
  _id: string;
  username: string;
  password: string;
  email: string;
  status?: "active" | "pending";
  createdAt: string;
  updatedAt: string;
  __v: number;
}> = [
  { _id: "a1", username: "admin", password: "hashed", email: "admin@gogocash.co", status: "active", createdAt: lastWeek, updatedAt: now, __v: 0 },
  { _id: "a2", username: "moderator", password: "hashed", email: "mod@gogocash.co", status: "active", createdAt: lastWeek, updatedAt: now, __v: 0 },
  { _id: "a3", username: "support", password: "hashed", email: "support@gogocash.co", status: "active", createdAt: lastWeek, updatedAt: yesterday, __v: 0 },
];

const userFirstNames = ["Alice", "Bob", "Charlie", "Diana", "Erica", "Frank", "Grace", "Henry", "Ivy", "Jack", "Kate", "Leo", "Mia", "Noah", "Olivia", "Paul", "Quinn", "Ryan", "Sara", "Tom", "Uma", "Victor", "Wendy", "Xavier", "Yuki", "Zara"];
const userLastNames = ["Smith", "Johnson", "Lee", "Kim", "Chen", "Davis", "Wilson", "Brown", "Taylor", "Martinez", "Garcia", "Miller", "Jones", "Williams", "Anderson", "Thomas", "Jackson", "White", "Harris", "Clark"];

export const mockUsers = Array.from({ length: 550 }, (_, i) => {
  const first = userFirstNames[i % userFirstNames.length];
  const last = userLastNames[i % userLastNames.length];
  const uname = `${first.toLowerCase()}_${last.toLowerCase()}_${i + 1}`;
  const email = `${uname}@example.com`;
  const dt = i % 3 === 0 ? lastWeek : i % 3 === 1 ? yesterday : now;
  const countries = ["TH", "US", "TH", "TH", "US"];
  const country = countries[i % 5];
  const gender = i % 3 === 0 ? "female" : i % 3 === 1 ? "male" : null;
  const birthdate = i % 4 === 0 ? null : `${1985 + (i % 25)}-${String((i % 12) + 1).padStart(2, "0")}-${String((i % 28) + 1).padStart(2, "0")}`;
  return {
    _id: `u${i + 1}`,
    address: `0x${(0xABC123 + i).toString(16).toUpperCase().padStart(6, "0")}`,
    __v: 0,
    email,
    id_crossmint: i % 2 === 0 ? `cm_${i + 1}` : "",
    id_twitter: i % 3 !== 0 ? `tw_${uname}` : "",
    username: uname,
    mobile: country === "TH" ? `+668${String(10000000 + i).slice(-8)}` : `+1${String(2000000000 + i).slice(-10)}`,
    id_firebase: `fb_${i + 1}`,
    createdAt: dt,
    updatedAt: now,
    birthdate,
    country,
    gender,
  };
});

const offerTemplates = [
  { categories: "Shopping", commission_tracking: "CPS", commissions: ["5%", "3%"], countries: "TH", currency: "THB", description: "Get cashback on all Shopee purchases in Thailand", directory_page: "https://shopee.co.th", is_require_approval: 0, logo: "https://img.involve.asia/iat/uploads/images/shopee-logo.png", marketplace_store_offer: true, payment_terms: 60, preview_url: "https://shopee.co.th", special_commissions: [], tracking_type: "pixel", validation_terms: 30, logo_desktop: "", logo_mobile: "", banner: "", logo_circle: "", disabled: false, commission_store: 5, max_cap: null as number | null, partner_max_cap: 100_000 as number | null, banner_mobile: "", extra_store: false, offer_name_display: "Shopee Thailand" },
  { categories: "Shopping", commission_tracking: "CPS", commissions: ["4%", "2%"], countries: "TH", currency: "THB", description: "Earn cashback shopping at Lazada Thailand", directory_page: "https://lazada.co.th", is_require_approval: 0, logo: "https://img.involve.asia/iat/uploads/images/lazada-logo.png", marketplace_store_offer: true, payment_terms: 45, preview_url: "https://lazada.co.th", special_commissions: [], tracking_type: "pixel", validation_terms: 30, logo_desktop: "", logo_mobile: "", banner: "", logo_circle: "", disabled: false, commission_store: 4, max_cap: 500, partner_max_cap: null as number | null, banner_mobile: "", extra_store: false, offer_name_display: "Lazada Thailand" },
  { categories: "Travel", commission_tracking: "CPS", commissions: ["6%"], countries: "TH,US", currency: "USD", description: "Book hotels and earn cashback", directory_page: "https://agoda.com", is_require_approval: 1, logo: "https://img.involve.asia/iat/uploads/images/agoda-logo.png", marketplace_store_offer: false, payment_terms: 90, preview_url: "https://agoda.com", special_commissions: [], tracking_type: "postback", validation_terms: 60, logo_desktop: "", logo_mobile: "", banner: "", logo_circle: "", disabled: false, commission_store: 6, max_cap: null as number | null, partner_max_cap: 500, banner_mobile: "", extra_store: false, offer_name_display: "Agoda Hotels" },
  { categories: "Food & Drink", commission_tracking: "CPS", commissions: ["3%"], countries: "TH", currency: "THB", description: "Order food and earn cashback", directory_page: "https://grabfood.com", is_require_approval: 0, logo: "", marketplace_store_offer: false, payment_terms: 30, preview_url: "https://grabfood.com", special_commissions: [], tracking_type: "pixel", validation_terms: 14, logo_desktop: "", logo_mobile: "", banner: "", logo_circle: "", disabled: true, commission_store: 3, max_cap: 200, partner_max_cap: 50_000, banner_mobile: "", extra_store: false, offer_name_display: "GrabFood" },
];

export const mockOffers = Array.from({ length: 550 }, (_, i) => {
  const t = offerTemplates[i % 4];
  const offerId = 1001 + i;
  const merchantId = 2001 + (i % 4);
  const names = ["Shopee TH - CPS", "Lazada TH - CPS", "Agoda - CPS", "GrabFood TH"];
  const lookups = ["shopee_th", "lazada_th", "agoda", "grab_food"];
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

const bankNames = ["Bangkok Bank", "Kasikorn Bank", "Krungthai Bank", "SCB", "BBL", "KBank"];
const statuses: Array<"approved" | "pending" | "rejected"> = ["approved", "approved", "pending", "rejected"];

export const mockWithdraws = Array.from({ length: 550 }, (_, i) => {
  const u = userRefs[i % userRefs.length];
  const amountTotal = 500 + (i % 50) * 200;
  const percentFee = 5;
  const amountNet = Math.round(amountTotal * (1 - percentFee / 100) * 100) / 100;
  const status = statuses[i % 4] as "approved" | "pending" | "rejected";
  const method = i % 5 === 0 ? "crypto" : "bank_transfer";
  const currency = i % 3 === 0 ? "USD" : "THB";
  const dt = i % 3 === 0 ? lastWeek : i % 3 === 1 ? yesterday : now;
  return {
    _id: `w${i + 1}`,
    user_id: u,
    address: u.address,
    account_number: method === "bank_transfer" ? `${100 + (i % 900)}-${100 + (i % 900)}-${100 + (i % 900)}` : "",
    account_name: method === "bank_transfer" ? `User ${i + 1}` : "",
    bank_name: method === "bank_transfer" ? bankNames[i % bankNames.length] : "",
    amount_total: amountTotal,
    amount_net: amountNet,
    percent_fee: percentFee,
    status,
    method,
    tx_hash: status === "approved" && i % 2 === 0 ? `0xhash${i + 1}` : "",
    conversion_id: Array.from({ length: 2 + (i % 5) }, (__, j) => 5001 + i * 3 + j),
    currency,
    createdAt: dt,
    updatedAt: now,
    __v: 0,
    slip_file: "",
  };
});
const conversionOffers = [
  { offer_id: 1001, merchant_id: 2001, offer_name: "Shopee TH - CPS", currency: "THB", adv_sub1: "shopee" },
  { offer_id: 1002, merchant_id: 2002, offer_name: "Lazada TH - CPS", currency: "THB", adv_sub1: "lazada" },
  { offer_id: 1003, merchant_id: 2003, offer_name: "Agoda - CPS", currency: "USD", adv_sub1: "agoda" },
  { offer_id: 1004, merchant_id: 2004, offer_name: "GrabFood TH", currency: "THB", adv_sub1: "grab" },
];

export const mockConversions = Array.from({ length: 550 }, (_, i) => {
  const convId = 5001 + i;
  const u = userRefs[i % userRefs.length];
  const o = conversionOffers[i % 4];
  const saleAmount = (500 + (i % 20) * 250).toFixed(2);
  const payoutVal = Number(saleAmount) * (0.03 + (i % 4) * 0.01);
  const payout = payoutVal.toFixed(2);
  const convStatuses: Array<"approved" | "pending" | "rejected"> = ["approved", "approved", "pending", "rejected"];
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
    affiliate_remarks: null,
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

export const mockFee = [
  { _id: "f1", system: 5, createdAt: lastWeek, updatedAt: now, __v: 0, minimum_withdraw_thb: 100, minimum_withdraw_usd: 5, fee_withdraw_usd: 1, fee_withdraw_thb: 30 },
];

export const mockBanner = {
  image_1: "banner-1",
  image_2: "banner-2",
  image_3: "banner-3",
  image_4: null,
  image_5: null,
  link_1: "https://shopee.co.th",
  link_2: "https://lazada.co.th",
  link_3: "https://agoda.com",
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
  { _id: "cat2", name: "Travel", image: "", banner: "", createdAt: lastWeek, updatedAt: now },
  { _id: "cat3", name: "Food & Drink", image: "", banner: "", createdAt: lastWeek, updatedAt: now },
  { _id: "cat4", name: "Finance", image: "", banner: "", createdAt: yesterday, updatedAt: now },
  { _id: "cat5", name: "Entertainment", image: "", banner: "", createdAt: yesterday, updatedAt: now },
];

const couponOfferRefs = [
  { _id: "o1", offer_name: "Shopee TH - CPS" },
  { _id: "o2", offer_name: "Lazada TH - CPS" },
  { _id: "o3", offer_name: "Agoda - CPS" },
  { _id: "o4", offer_name: "GrabFood TH" },
];

const couponTemplates = [
  { name: "Welcome 10%", description: "10% off for new users", codePrefix: "WELCOME", eligibility: "new_users", min_spend: "500", discount: 10, linkPath: "promo" },
  { name: "Flash Sale 15%", description: "Limited time flash sale discount", codePrefix: "FLASH", eligibility: "all", min_spend: "1000", discount: 15, linkPath: "flash" },
  { name: "Travel Bonus", description: "Extra cashback on hotel bookings", codePrefix: "TRAVEL", eligibility: "all", min_spend: "2000", discount: 5, linkPath: "deals" },
  { name: "First Order", description: "First order discount", codePrefix: "FIRST", eligibility: "new_users", min_spend: "300", discount: 20, linkPath: "first" },
  { name: "Weekend Deal", description: "Weekend special offer", codePrefix: "WEEKEND", eligibility: "all", min_spend: "800", discount: 12, linkPath: "weekend" },
  { name: "Member Exclusive", description: "Members only discount", codePrefix: "MEMBER", eligibility: "members", min_spend: "1500", discount: 8, linkPath: "member" },
];

const couponDomains = ["shopee.co.th", "lazada.co.th", "agoda.com", "grabfood.com"];

export const mockCoupons = Array.from({ length: 550 }, (_, i) => {
  const t = couponTemplates[i % couponTemplates.length];
  const offerRef = couponOfferRefs[i % couponOfferRefs.length];
  const domain = couponDomains[i % couponDomains.length];
  const code = `${t.codePrefix}${String(i + 1).padStart(3, "0")}`;
  const startDate = i % 3 === 0 ? lastWeek : i % 3 === 1 ? yesterday : now;
  const endDate = new Date(Date.now() + (90 + (i % 180)) * 86400000).toISOString();
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
    discount: t.discount,
    createdAt: startDate,
    updatedAt: now,
    disabled: i % 7 === 0,
    __v: 0,
    link: `https://${domain}/${t.linkPath}`,
  };
});

const mcbFirstNames = ["Alice", "Bob", "Charlie", "Diana", "Erica", "Frank", "Grace", "Henry", "Ivy", "Jack"];
const mcbLastNames = ["Smith", "Johnson", "Lee", "Kim", "Chen", "Davis", "Wilson", "Brown", "Taylor", "Martinez"];

export const mockMyCashback = Array.from({ length: 550 }, (_, i) => {
  const first = mcbFirstNames[i % mcbFirstNames.length];
  const last = mcbLastNames[i % mcbLastNames.length];
  const email = `mcb_${i + 1}@example.com`;
  const phone = `+668${String(10000000 + i).slice(-8)}`;
  const dt = i % 3 === 0 ? lastWeek : i % 3 === 1 ? yesterday : now;
  const amount = 500 + (i % 100) * 50;
  return {
    _id: `mcb${i + 1}`,
    metadata: { currentLanguage: null, firstTimeBonusAmount: 50, gotFirstTimeBonus: i % 2 === 0, joinedStairSequenceBonus: false, joinedStairSequenceBonusAt: null, joinedVipBonus: i % 5 === 0, joinedVipBonusAt: null, expiredVipBonusAt: null },
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
    balance: [{ amount, currency: "THB", countryCode: "TH", lastUpdated: now, _id: `bal${i + 1}` }],
    createdAt: dt,
    updatedAt: now,
    __v: 0,
  };
});

export const mockWithdrawDetail = {
  totalsByStatusAndCurrency: [
    { status: "approved", count: 2, totalPayout: 165, currencyBreakdown: [{ currency: "THB", amount: 165, usdAmount: 4.7, thbAmount: 165 }], totalUSD: 4.7, totalTHB: 165 },
    { status: "pending", count: 1, totalPayout: 200, currencyBreakdown: [{ currency: "THB", amount: 200, usdAmount: 5.7, thbAmount: 200 }], totalUSD: 5.7, totalTHB: 200 },
  ],
  data: {
    approved: { count: 2, totalPayout: 165, items: [] },
    pending: { count: 1, totalPayout: 200, items: [] },
    rejected: { count: 0, totalPayout: 0, items: [] },
  },
  fee: { _id: "f1", system: 5, store: 0, createdAt: lastWeek, updatedAt: now, __v: 0, fee_withdraw_usd: 1, fee_withdraw_thb: 30, minimum_withdraw_thb: 100, minimum_withdraw_usd: 5, minimum_withdraw: 100 },
  withdrawList: [
    { _id: "w1", address: "0xABC123", account_number: "123-456-789", account_name: "Alice Smith", bank_name: "Bangkok Bank", amount_total: 1500, amount_net: 1425, percent_fee: 5, status: "approved", method: "bank_transfer", tx_hash: "0xhash1", tx_hash_record: "", user_id: "u1", conversion_id: [5001, 5002], currency: "THB", mycashback_id: [], createdAt: yesterday, updatedAt: now, __v: 0, slip_file: "" },
    { _id: "w2", address: "0xABC123", account_number: "123-456-789", account_name: "Alice Smith", bank_name: "Bangkok Bank", amount_total: 800, amount_net: 760, percent_fee: 5, status: "pending", method: "bank_transfer", tx_hash: "", tx_hash_record: "", user_id: "u1", conversion_id: [5003], currency: "THB", mycashback_id: ["mcb1"], createdAt: now, updatedAt: now, __v: 0, slip_file: "" },
  ],
  allConversions: [
    { _id: "ac1", conversion_id: 5001, __v: 0, adv_sub1: "shopee", adv_sub2: "order_001", adv_sub3: "TH", adv_sub4: "", adv_sub5: "mobile", aff_sub1: "u1", aff_sub2: null, aff_sub3: null, aff_sub4: null, aff_sub5: null, affiliate_remarks: "", base_payout: 125, bonus_payout: 0, conversion_status: "approved", createdAt: yesterday, currency: "THB", datetime_conversion: yesterday, merchant_id: 2001, offer_id: 1001, offer_name: "Shopee TH - CPS", payout: 125, sale_amount: 2500, updatedAt: now },
    { _id: "ac2", conversion_id: 5002, __v: 0, adv_sub1: "shopee", adv_sub2: "order_002", adv_sub3: "TH", adv_sub4: "", adv_sub5: "desktop", aff_sub1: "u1", aff_sub2: null, aff_sub3: null, aff_sub4: null, aff_sub5: null, affiliate_remarks: "", base_payout: 40, bonus_payout: 0, conversion_status: "approved", createdAt: yesterday, currency: "THB", datetime_conversion: yesterday, merchant_id: 2001, offer_id: 1001, offer_name: "Shopee TH - CPS", payout: 40, sale_amount: 800, updatedAt: now },
    { _id: "ac3", conversion_id: 5003, __v: 0, adv_sub1: "lazada", adv_sub2: "order_003", adv_sub3: "TH", adv_sub4: "flash_sale", adv_sub5: "mobile", aff_sub1: "u1", aff_sub2: null, aff_sub3: null, aff_sub4: null, aff_sub5: null, affiliate_remarks: "Pending validation", base_payout: 200, bonus_payout: 0, conversion_status: "pending", createdAt: now, currency: "THB", datetime_conversion: now, merchant_id: 2002, offer_id: 1002, offer_name: "Lazada TH - CPS", payout: 200, sale_amount: 5000, updatedAt: now },
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
    gender: "Female",
    birthdate: "1995-03-15",
    gogopassActive: true,
    wallet: "0xABC1234567890abcdef",
    totalCashback: 2300,
    totalCashbackCurrency: "THB",
    userLog: [
      { action: "Login", at: "2026-03-14T10:30:00Z", ip: "192.168.1.1" },
      { action: "Withdraw requested", at: "2026-03-13T15:00:00Z", ip: "192.168.1.1" },
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
