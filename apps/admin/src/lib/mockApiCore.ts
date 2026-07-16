/**
 * Shared mock API implementation for `/api/mock/*`.
 * Used by the Next.js route (dev / Node) and by ApiClient in the browser when
 * `NEXT_PUBLIC_FIREBASE_STATIC=1` (Firebase static export has no API routes).
 */
import {
  mockAdminUsers,
  mockUsers,
  mockOffers,
  mockWithdraws,
  mockConversions,
  mockFee,
  mockBanner,
  mockBannerHomeSmall,
  mockBannerAllBrandPage,
  mockCategories,
  mockCoupons,
  mockMyCashback,
  mockWithdrawDetail,
  mockMCBDetail,
} from "@/app/api/mock/data";
import { isMockAdminPasswordAllowed } from "@/lib/mockAuthPolicy";
import {
  isValidDeeplinkStoreId,
  resolveDeeplinkStoreId,
} from "@/data/deeplinkStores";
import { COUNTRY_FILTER_TO_CODES } from "@/data/mockPendingOffers";
import {
  AFFILIATE_NETWORKS,
  affiliateNetworkIdForOfferId,
  affiliateNetworkName,
  resolveAffiliateNetworkIdForOffer,
} from "@/data/affiliateNetworks";
import {
  bestPercentFromPartnerRates,
  buildSuggestedAppDeeplink,
  resolveTopBrandCashbackLabel,
} from "@/lib/offerDeeplink";
import {
  normalizeOfferDisplayTags,
  normalizeOfferProductTypes,
  type Offer,
  type TopBrandConfigEntry,
} from "@/types/api";
import { DEFAULT_MOCK_ACCESS_TOKEN } from "@/lib/authTokens";
import { sortUsers, type UserSort } from "@/lib/userSort";
import { filterUsers } from "@/lib/userFilter";
import {
  filterMyCashbackByStatus,
  sortMyCashback,
  type MyCashbackSort,
} from "@/lib/myCashbackList";
import type { Permission } from "@/lib/rbac";
import {
  listRoles,
  getRoleDef,
  createRole,
  updateRole,
  deleteRole,
  roleCan,
} from "@/lib/rbac/roleStore";
import {
  buildDashboardInsights,
  buildDashboardSummaryExtended,
} from "@/lib/dashboardInsightsBuilder";
import { tryMockAdminFeaturesRequest } from "@/lib/mockAdminFeatures";
import { deriveQuestStatus } from "@/lib/questStatus";

export type MockApiInput = {
  method: string;
  path: string[];
  searchParams: URLSearchParams;
  /** Parsed JSON body for mutating methods */
  body: unknown | undefined;
  /** Caller's role id (from the NextAuth JWT), for server-side enforcement. */
  role?: string;
};

export type MockApiResult = { status: number; body: unknown };

const ok = (body: unknown): MockApiResult => ({ status: 200, body });
const jsonErr = (status: number, body: unknown): MockApiResult => ({
  status,
  body,
});

const MAX_TOP_BRANDS = 16;

const OFFER_NAMES: Record<number, string> = {
  1001: "Banana IT TH - CPS",
  1002: "Adidas TH - CPS",
  1003: "AirAsia Travel - CPS",
  1004: "Banana IT TH Food - CPS",
};
type CreatedConversionItem = {
  conversion_id: number;
  offer_id: number;
  offer_name: string;
  aff_sub1: string;
  adv_sub1: string;
  adv_sub2: string;
  adv_sub3: string;
  adv_sub4: string | null;
  adv_sub5: string;
  sale_amount: string;
  payout: string;
  currency: string;
  conversion_status: string;
  remark?: string;
  datetime_conversion: string;
  createdAt: string;
  updatedAt: string;
  user?: { _id: string; username?: string; email?: string };
};

type MockOffer = (typeof mockOffers)[number] & { extra_point?: number };

const MOCK_CREATED_CONVERSIONS_BASE = [
  {
    offer_id: 1001,
    offer_name: "Banana IT TH - CPS",
    aff_sub1: "u1",
    adv_sub2: "order_mock_001",
    sale_amount: "1500.00",
    payout: "75.00",
    currency: "THB",
    conversion_status: "approved" as const,
    remark: "Manual add - campaign",
  },
  {
    offer_id: 1002,
    offer_name: "Adidas TH - CPS",
    aff_sub1: "u1",
    adv_sub2: "order_mock_002",
    sale_amount: "3200.50",
    payout: "128.02",
    currency: "THB",
    conversion_status: "pending" as const,
    remark: "",
  },
  {
    offer_id: 1003,
    offer_name: "AirAsia Travel - CPS",
    aff_sub1: "u2",
    adv_sub2: "order_mock_003",
    sale_amount: "450.00",
    payout: "27.00",
    currency: "USD",
    conversion_status: "approved" as const,
    remark: "Hotel booking",
  },
  {
    offer_id: 1004,
    offer_name: "Banana IT TH Food - CPS",
    aff_sub1: "u2",
    adv_sub2: "order_mock_004",
    sale_amount: "280.00",
    payout: "8.40",
    currency: "THB",
    conversion_status: "rejected" as const,
    remark: "",
  },
  {
    offer_id: 1001,
    offer_name: "Banana IT TH - CPS",
    aff_sub1: "68bf99fed9667685c1637607",
    adv_sub2: "order_mock_005",
    sale_amount: "890.00",
    payout: "44.50",
    currency: "THB",
    conversion_status: "approved" as const,
    remark: "Created via admin",
  },
  {
    offer_id: 1002,
    offer_name: "Adidas TH - CPS",
    aff_sub1: "u3",
    adv_sub2: "order_mock_006",
    sale_amount: "2100.00",
    payout: "84.00",
    currency: "THB",
    conversion_status: "pending" as const,
    remark: "Flash sale",
  },
];

function buildMockCreatedConversions(): CreatedConversionItem[] {
  const now = new Date();
  const toIso = (d: Date) => d.toISOString();
  return MOCK_CREATED_CONVERSIONS_BASE.map((base, i) => {
    const created = new Date(now);
    created.setDate(created.getDate() - (i + 1));
    const createdIso = toIso(created);
    return {
      conversion_id: 600100 + i,
      offer_id: base.offer_id,
      offer_name: base.offer_name,
      aff_sub1: base.aff_sub1,
      adv_sub1: "order",
      adv_sub2: base.adv_sub2,
      adv_sub3: "",
      adv_sub4: null,
      adv_sub5: "",
      sale_amount: base.sale_amount,
      payout: base.payout,
      currency: base.currency,
      conversion_status: base.conversion_status,
      ...(base.remark ? { remark: base.remark } : {}),
      datetime_conversion: createdIso,
      createdAt: createdIso,
      updatedAt: toIso(now),
      user: { _id: base.aff_sub1 },
    };
  });
}

const createdConversionsList: CreatedConversionItem[] =
  buildMockCreatedConversions();

type MockQuestTask = {
  offer: string | MockOffer;
  offer_id: number;
  merchant_id: number;
  extra_point: number;
  sort_order: number;
  enabled: boolean;
  wording?: string;
  wording_en?: string;
  wording_th?: string;
  notes?: string;
};

type MockQuestReward = {
  rank: number;
  reward: number;
  currency: string;
};

type MockQuestRewardDistributionMode = "manual" | "campaign_end" | "after_days";

type MockQuest = {
  _id: string;
  status: string;
  reward_status: boolean;
  reward_distribution_mode: MockQuestRewardDistributionMode;
  reward_distribution_delay_days: number;
  reward_distribution_scheduled_at: string | null;
  start_date: string;
  end_date: string;
  facebook_page: string;
  facebook_post: string;
  line: string;
  banner_en: string;
  banner_th: string;
  sub_banner_en: string;
  sub_banner_th: string;
  tasks: MockQuestTask[];
  rewards: MockQuestReward[];
  createdAt: string;
  updatedAt: string;
  __v: number;
};

function mockQuestTaskFromOffer(
  offer: MockOffer,
  extraPoint: number,
  sortOrder: number,
): MockQuestTask {
  return {
    offer,
    offer_id: offer.offer_id,
    merchant_id: offer.merchant_id,
    extra_point: extraPoint,
    sort_order: sortOrder,
    enabled: true,
    wording:
      offer.offer_name_display || offer.offer_name || `Offer ${offer.offer_id}`,
    notes: "",
  };
}

function rewardDistributionScheduledAt(
  quest: Pick<MockQuest, "end_date">,
  mode: MockQuestRewardDistributionMode,
  delayDays: number,
): string | null {
  if (mode === "manual") return null;
  const endTime = new Date(quest.end_date).getTime();
  if (Number.isNaN(endTime)) return null;
  const normalizedDelay = mode === "after_days" ? delayDays : 0;
  return new Date(endTime + normalizedDelay * 86_400_000).toISOString();
}

const nowIso = new Date().toISOString();
const mockQuestStore: MockQuest[] = [
  {
    _id: "q_open_2026_06",
    status: "open",
    reward_status: false,
    reward_distribution_mode: "after_days",
    reward_distribution_delay_days: 7,
    reward_distribution_scheduled_at: "2026-07-07T00:00:00.000Z",
    start_date: "2026-06-01T00:00:00.000Z",
    end_date: "2026-06-30T00:00:00.000Z",
    facebook_page: "https://www.facebook.com/gogocashofficial/",
    facebook_post: "https://www.facebook.com/share/p/mock",
    line: "https://lin.ee/mock",
    banner_en: "",
    banner_th: "",
    sub_banner_en: "",
    sub_banner_th: "",
    tasks: mockOffers
      .slice(0, 3)
      .map((offer, index) => mockQuestTaskFromOffer(offer, 50, index)),
    rewards: [
      { rank: 1, reward: 1200, currency: "THB" },
      { rank: 2, reward: 800, currency: "THB" },
      { rank: 3, reward: 500, currency: "THB" },
    ],
    createdAt: nowIso,
    updatedAt: nowIso,
    __v: 0,
  },
];
// V2 policy store — per category, the saved `banner` and `terms` blocks
// (parsed JSON, as the real backend stores them). A block is only overwritten
// when the PUT includes it, so saving one block never clobbers the other.
const policyStore = new Map<string, { banner?: unknown; terms?: unknown }>();
// Categories created via Policy Management "Create New" (in-memory; resets on
// server restart, like the rest of the mock). Merged into get-category/list.
const createdCategories: (typeof mockCategories)[number][] = [];

/** Mock OTP for admin verification when adding emails / phones on withdraw user (internal demo). */
const MOCK_USER_CONTACT_OTP = "123456";
/** Session keys `userId|channel|target` → expiry ms */
const userContactOtpSessions = new Map<string, number>();

function userContactOtpKey(
  userId: string,
  channel: string,
  normalizedTarget: string,
) {
  return `${userId}|${channel}|${normalizedTarget}`;
}

/** In-memory edits for withdraw detail user profile (mock only). */
type WithdrawDetailUserPatch = Partial<{
  email: string;
  mobile: string;
  emails: string[];
  mobiles: string[];
  fullName: string;
  gender: string;
  birthdate: string;
  wallet: string;
  gogopassActive: boolean;
}>;
const withdrawDetailUserEdits: Record<string, WithdrawDetailUserPatch> = {};
/** Mock-only: user ids for which admin requested data deletion (list/detail return empty + anonymized user). */
const withdrawUserDataDeleted = new Set<string>();

function fullNameFromUsername(username: string): string {
  const parts = username.split("_");
  const last = parts[parts.length - 1];
  const core = last && /^\d+$/.test(last) ? parts.slice(0, -1) : parts;
  return core
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
    .join(" ");
}

/** URL may be `/withdraw/u3` (user) or `/withdraw/w5` (withdraw doc); API path uses the same segment. */
function resolveWithdrawRouteSegmentToUserId(routeSegment: string): string {
  const raw = routeSegment.trim();
  if (raw.startsWith("w")) {
    const row = mockWithdraws.find((x) => x._id === raw);
    const uid =
      row?.user_id && typeof row.user_id === "object" && "_id" in row.user_id
        ? String((row.user_id as { _id: string })._id)
        : "";
    if (uid) return uid;
  }
  /** MyCashBack profile ids (`mcb1` …) align 1:1 with GoGoCash user ids (`u1` …) in mock data. */
  const mcb = /^mcb(\d+)$/i.exec(raw);
  if (mcb) return `u${mcb[1]}`;
  return raw || "u1";
}

function buildWithdrawDetailUser(userId: string) {
  const base = mockWithdrawDetail.user;
  const edits = withdrawDetailUserEdits[userId];
  const u = mockUsers.find((x) => x._id === userId);
  if (!u) {
    return { ...base, _id: userId, ...(edits ?? {}) };
  }
  const genderLabel =
    u.gender === "female" ? "Female" : u.gender === "male" ? "Male" : "";
  const next = {
    ...base,
    _id: u._id,
    username: u.username,
    email: u.email,
    mobile: u.mobile,
    emails: [u.email],
    mobiles: u.mobile ? [u.mobile] : [],
    fullName: fullNameFromUsername(u.username),
    gender: genderLabel,
    birthdate: u.birthdate ?? "",
    wallet: u.address,
    country: u.country,
    subscriptionPlan: u.subscriptionPlan,
    creditScore: u.creditScore,
  };
  return { ...next, ...(edits ?? {}) };
}

function emptyWithdrawDetailForDeletedUser(userId: string) {
  return {
    totalsByStatusAndCurrency:
      [] as typeof mockWithdrawDetail.totalsByStatusAndCurrency,
    data: {
      approved: { count: 0, totalPayout: 0, items: [] as unknown[] },
      pending: { count: 0, totalPayout: 0, items: [] as unknown[] },
      rejected: { count: 0, totalPayout: 0, items: [] as unknown[] },
    },
    fee: mockWithdrawDetail.fee,
    withdrawList: [] as (typeof mockWithdrawDetail.withdrawList)[number][],
    allConversions: [] as (typeof mockWithdrawDetail.allConversions)[number][],
    user: {
      _id: userId,
      email: "",
      mobile: "",
      emails: [] as string[],
      mobiles: [] as string[],
      fullName: "User data deleted",
      gender: "",
      birthdate: "",
      wallet: "",
      gogopassActive: false,
      totalCashback: 0,
      totalCashbackCurrency: "THB",
      userLog: [] as { action?: string; at?: string; ip?: string }[],
    },
    withdrawSumByCurrency:
      {} as typeof mockWithdrawDetail.withdrawSumByCurrency,
  };
}

function mockWithdrawDetailForUser(userId: string) {
  if (withdrawUserDataDeleted.has(userId)) {
    return emptyWithdrawDetailForDeletedUser(userId);
  }
  const withdrawList = mockWithdraws
    .filter((w) => w.user_id._id === userId)
    .slice(0, 40)
    .map((w) => ({
      _id: w._id,
      address: w.address,
      account_number: w.account_number,
      account_name: w.account_name,
      bank_name: w.bank_name,
      amount_total: w.amount_total,
      amount_net: w.amount_net,
      percent_fee: w.percent_fee,
      status: w.status,
      method: w.method,
      tx_hash: w.tx_hash,
      tx_hash_record: "",
      user_id: w.user_id._id,
      conversion_id: w.conversion_id,
      currency: w.currency,
      mycashback_id: [] as string[],
      createdAt: w.createdAt,
      updatedAt: w.updatedAt,
      __v: w.__v,
      slip_file: w.slip_file,
    }));

  const allConversions = mockConversions
    .filter((c) => c.aff_sub1 === userId)
    .slice(0, 60)
    .map((c) => ({
      _id: `ac${c.conversion_id}`,
      conversion_id: c.conversion_id,
      __v: 0,
      adv_sub1: c.adv_sub1,
      adv_sub2: c.adv_sub2 ?? "",
      adv_sub3: c.adv_sub3 ?? "",
      adv_sub4: c.adv_sub4 ?? "",
      adv_sub5: c.adv_sub5 ?? "",
      aff_sub1: c.aff_sub1,
      aff_sub2: c.aff_sub2,
      aff_sub3: c.aff_sub3,
      aff_sub4: c.aff_sub4,
      aff_sub5: c.aff_sub5,
      affiliate_remarks: c.affiliate_remarks ?? "",
      base_payout: Number(c.base_payout),
      bonus_payout: Number(c.bonus_payout),
      conversion_status: c.conversion_status,
      createdAt: c.createdAt,
      currency: c.currency,
      datetime_conversion: c.datetime_conversion,
      merchant_id: c.merchant_id,
      offer_id: c.offer_id,
      offer_name: c.offer_name,
      payout: Number(c.payout),
      sale_amount: Number(c.sale_amount),
      updatedAt: c.updatedAt,
    }));

  return {
    ...mockWithdrawDetail,
    withdrawList,
    allConversions,
    user: buildWithdrawDetailUser(userId),
  };
}

/** Admin-set app tracking link per offer (commission management). */
const commissionAppDeeplinkByOfferId = new Map<string, string>();

/** Homepage top-brand rail: ordered offer `_id`s + cashback labels (mock; in-memory). */
let topBrandHomepageBrands: TopBrandConfigEntry[] = [
  { offerId: "o1", cashback: "Up to 12%" },
  { offerId: "o2", cashback: "Up to 10%" },
  { offerId: "o3", cashback: "Travel deals" },
  { offerId: "o5", cashback: "Limited time" },
];

function allocateNewOfferIds(): {
  _id: string;
  offer_id: number;
  merchant_id: number;
} {
  let maxSeq = 0;
  let maxOfferId = 0;
  let maxMerchant = 0;
  for (const o of mockOffers) {
    const seqMatch = /^o(\d+)$/.exec(o._id);
    if (seqMatch) maxSeq = Math.max(maxSeq, parseInt(seqMatch[1], 10));
    maxOfferId = Math.max(maxOfferId, o.offer_id);
    maxMerchant = Math.max(maxMerchant, o.merchant_id);
  }
  const seq = maxSeq + 1;
  return {
    _id: `o${seq}`,
    offer_id: maxOfferId + 1,
    merchant_id: maxMerchant + 1,
  };
}

function paginate<T>(items: T[], page = 1, limit = 10) {
  const start = (page - 1) * limit;
  return {
    data: items.slice(start, start + limit),
    pagination: {
      page,
      limit,
      total: items.length,
      totalPages: Math.ceil(items.length / limit),
    },
  };
}

function paginateFlat<T>(items: T[], page = 1, limit = 10) {
  const start = (page - 1) * limit;
  return {
    data: items.slice(start, start + limit),
    page,
    limit,
    total: items.length,
    totalPages: Math.ceil(items.length / limit),
  };
}

function mockBodyField(body: unknown, key: string): string {
  if (
    body &&
    typeof body === "object" &&
    "get" in body &&
    typeof (body as { get: (name: string) => unknown }).get === "function"
  ) {
    const value = (body as { get: (name: string) => unknown }).get(key);
    return typeof value === "string" ? value : "";
  }
  const value = (body as Record<string, unknown> | undefined)?.[key];
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

function handleMockGET(
  path: string[],
  joined: string,
  searchParams: URLSearchParams,
): MockApiResult {
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
  const limit = Math.min(
    100,
    Math.max(1, parseInt(searchParams.get("limit") || "10", 10) || 10),
  );
  const search = searchParams.get("search") || "";

  if (joined === "admin/login") {
    return ok({
      _id: "a1",
      username: "admin",
      email: "admin@gogocash.co",
      password: "hashed",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      __v: 0,
      token: DEFAULT_MOCK_ACCESS_TOKEN,
    });
  }

  if (joined === "admin") {
    let filtered = mockAdminUsers;
    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter(
        (u) =>
          u.username.toLowerCase().includes(s) ||
          u.email.toLowerCase().includes(s),
      );
    }
    return ok(paginate(filtered, page, limit));
  }

  if (path[0] === "admin" && path.length === 2) {
    const user = mockAdminUsers.find((u) => u._id === path[1]);
    if (user) return ok(user);
  }

  if (joined === "admin/top-brands") {
    const items = topBrandHomepageBrands
      .map((entry) => mockOffers.find((o) => o._id === entry.offerId))
      .filter((o) => o != null);
    return ok({
      order: topBrandHomepageBrands.map((entry) => entry.offerId),
      brands: topBrandHomepageBrands.map((entry) => {
        const offer = mockOffers.find((row) => row._id === entry.offerId);
        return {
          offerId: entry.offerId,
          cashback: resolveTopBrandCashbackLabel(offer, ""),
        };
      }),
      items,
      maxBrands: MAX_TOP_BRANDS,
    });
  }

  if (joined === "dashboard/stats") {
    return ok({
      gogocashUsers: mockUsers.length,
      mycashbackUsers: mockMyCashback.length,
    });
  }

  if (joined === "dashboard/summary") {
    return ok(buildDashboardSummaryExtended());
  }

  if (joined === "dashboard/insights") {
    return ok(buildDashboardInsights(searchParams));
  }

  if (joined === "user") {
    let filtered = mockUsers;
    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter(
        (u) =>
          u.username.toLowerCase().includes(s) ||
          u.email.toLowerCase().includes(s),
      );
    }
    filtered = filterUsers(filtered, {
      tier: searchParams.get("tier") || undefined,
      membership: searchParams.get("membership") || undefined,
      subscription: searchParams.get("subscription") || undefined,
    });
    const sorted = sortUsers(
      filtered,
      (searchParams.get("sort") as UserSort) || "newest",
    );
    return ok(paginate(sorted, page, limit));
  }

  if (path[0] === "user" && path.length === 2) {
    const id = path[1];
    const user = mockUsers.find((u) => u._id === id);
    return user ? ok(user) : jsonErr(404, { message: "Not found" });
  }

  if (joined === "offer/admin") {
    let filtered = mockOffers;
    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter((o) => {
        const partner =
          o.affiliate_partner?.trim() ||
          affiliateNetworkName(affiliateNetworkIdForOfferId(o._id));
        const lookup = String(o.lookup_value ?? "").toLowerCase();
        const countries = String(o.countries ?? "").toLowerCase();
        return (
          o.offer_name.toLowerCase().includes(s) ||
          o.offer_name_display.toLowerCase().includes(s) ||
          partner.toLowerCase().includes(s) ||
          lookup.includes(s) ||
          countries.includes(s) ||
          o._id.toLowerCase().includes(s) ||
          String(o.offer_id).includes(s)
        );
      });
    }
    // Country filter: dropdown sends a country name; match against the offer's
    // ISO codes in `countries` (e.g. "TH" / "TH,US"). Previously ignored, so the
    // dropdown had no effect on results.
    const country = searchParams.get("country") || "";
    if (country) {
      const codes = COUNTRY_FILTER_TO_CODES[country] ?? [country];
      filtered = filtered.filter((o) => {
        const offerCodes = String(o.countries || "")
          .split(",")
          .map((c) => c.trim());
        return codes.some((code) => offerCodes.includes(code));
      });
    }
    return ok(paginateFlat(filtered, page, limit));
  }

  if (joined === "point/admin-get-quest") {
    return ok(
      mockQuestStore.map((quest) => ({
        ...quest,
        status: deriveQuestStatus(quest.start_date, quest.end_date),
      })),
    );
  }

  if (
    path[0] === "point" &&
    path[1] === "admin-quest" &&
    path[3] === "task-deeplinks"
  ) {
    const quest = mockQuestStore.find((q) => q._id === path[2]);
    if (!quest) return jsonErr(404, { message: "Quest not found" });
    return ok({
      data: quest.tasks
        .filter((task) => task.enabled)
        .map((task) => {
          const offer =
            typeof task.offer === "string"
              ? mockOffers.find((o) => o._id === task.offer)
              : task.offer;
          const offerId = offer?._id ?? String(task.offer);
          return {
            offer: offerId,
            offer_id: task.offer_id,
            merchant_id: task.merchant_id,
            offer_name:
              offer?.offer_name_display || offer?.offer_name || "Merchant",
            extra_point: task.extra_point,
            sort_order: task.sort_order,
            tracking_link: offer?.tracking_link ?? "",
            customer_path: `/shop/${offerId}`,
            generated_count: task.sort_order + 1,
            latest_click: new Date().toISOString(),
            sample_deeplink: `https://invl.me/mock-${task.offer_id}`,
          };
        }),
    });
  }

  if (
    path[0] === "point" &&
    path[1] === "admin-quest" &&
    path[3] === "leaderboard"
  ) {
    const quest = mockQuestStore.find((q) => q._id === path[2]);
    if (!quest) return jsonErr(404, { message: "Quest not found" });

    const rewards = [...quest.rewards].sort((a, b) => a.rank - b.rank);
    const data = mockMyCashback.slice(0, 5).map((user, index) => {
      const rank = index + 1;
      const reward = rewards.find((item) => item.rank === rank);
      const extraPointReceived = Math.max(
        0,
        quest.tasks
          .filter((task) => task.enabled !== false)
          .reduce((sum, task) => sum + task.extra_point, 0) -
          index * 20,
      );
      return {
        rank,
        user_id: user._id,
        username: `${user.firstName} ${user.lastName}`.trim(),
        email: user.email,
        point: 2100 - index * 260,
        extra_point_received: extraPointReceived,
        extra_point_referral: index === 0 ? 50 : 0,
        point_social_reward: index < 2 ? 25 : 0,
        bonus_over_300_received: index === 0 ? 300 : 0,
        reward: reward?.reward ?? 0,
        currency: reward?.currency ?? "THB",
      };
    });

    return ok({
      data_source: "quest_range",
      quest: {
        _id: quest._id,
        start_date: quest.start_date,
        end_date: quest.end_date,
        status: quest.status,
        reward_status: quest.reward_status,
        reward_distribution_mode: quest.reward_distribution_mode,
        reward_distribution_delay_days: quest.reward_distribution_delay_days,
        reward_distribution_scheduled_at:
          quest.reward_distribution_scheduled_at,
      },
      rewards,
      source_start_date: quest.start_date.slice(0, 10),
      source_end_date: quest.end_date.slice(0, 10),
      data,
    });
  }

  if (joined === "offer/get-category/list") {
    let filtered = [...mockCategories, ...createdCategories];
    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter((c) => c.name.toLowerCase().includes(s));
    }
    return ok(filtered);
  }

  if (path[0] === "policy") {
    if (path[1] === "list") {
      return ok(Object.fromEntries(policyStore));
    }
    if (path[1] === "category-list") {
      // PolicyListEntry[] — category id + its saved banner/terms blocks.
      return ok(
        [...policyStore.entries()].map(([category_id, blocks]) => ({
          category_id,
          ...blocks,
        })),
      );
    }
    const categoryId = searchParams.get("categoryId");
    if (!categoryId) {
      return jsonErr(400, { message: "categoryId is required" });
    }
    return ok(policyStore.get(categoryId) ?? {});
  }

  if (path[0] === "offer" && path[1] === "get-coupon-id") {
    const offerId = path[2];
    const coupons = mockCoupons.filter((c) => c.offer_id._id === offerId);
    return ok(coupons);
  }

  if (path[0] === "offer" && path[1] === "coupons" && path[3] === "insights") {
    const coupon = mockCoupons.find((item) => item._id === path[2]);
    if (!coupon) return jsonErr(404, { message: "Coupon not found." });
    return ok({
      coupon: {
        code: coupon.code,
        discount: coupon.discount,
        id: coupon._id,
        name: coupon.name,
        offerName:
          coupon.offer_id.offer_name_display ?? coupon.offer_id.offer_name,
      },
      metrics: {
        codeCopies: 0,
        copyRate: 0,
        detailViews: 0,
        usageAmount: coupon.quantity_used ?? 0,
        usageUnit: "redemptions",
      },
      redemptions: {
        data: [],
        limit,
        page,
        total: 0,
        totalPages: 0,
      },
    });
  }

  if (joined === "offer/get-coupon") {
    let filtered = [...mockCoupons];
    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.name.toLowerCase().includes(s) ||
          c.code.toLowerCase().includes(s) ||
          c.description.toLowerCase().includes(s) ||
          c.offer_id.offer_name.toLowerCase().includes(s),
      );
    }
    const status = searchParams.get("status") ?? "";
    if (status === "active") {
      filtered = filtered.filter((c) => !c.disabled);
    } else if (status === "inactive") {
      filtered = filtered.filter((c) => c.disabled);
    }
    return ok(paginateFlat(filtered, page, limit));
  }

  if (path[0] === "offer" && path.length === 2) {
    const id = path[1];
    const offer = mockOffers.find((o) => o._id === id);
    return offer ? ok(offer) : jsonErr(404, { message: "Not found" });
  }

  if (joined === "admin/withdraw-all") {
    let filtered = mockWithdraws;
    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter(
        (w) =>
          String(w._id).toLowerCase().includes(s) ||
          (w.account_name && w.account_name.toLowerCase().includes(s)) ||
          (w.bank_name && w.bank_name.toLowerCase().includes(s)) ||
          (typeof w.user_id === "object" &&
            w.user_id &&
            ((w.user_id as { username?: string }).username
              ?.toLowerCase()
              .includes(s) ||
              (w.user_id as { email?: string }).email
                ?.toLowerCase()
                .includes(s))),
      );
    }
    const statusFilter = searchParams.get("status")?.trim().toLowerCase() ?? "";
    if (statusFilter) {
      filtered = filtered.filter(
        (w) => (w.status || "").toLowerCase() === statusFilter,
      );
    }
    const methodFilter = searchParams.get("method")?.trim() ?? "";
    if (methodFilter) {
      filtered = filtered.filter((w) => {
        const m = w.method || "";
        if (methodFilter === "web3") return m === "web3" || m === "crypto";
        return m === methodFilter;
      });
    }
    return ok(paginate(filtered, page, limit));
  }

  if (joined === "admin/created-conversions") {
    const result = paginate(createdConversionsList, page, limit);
    return ok({
      status: "success",
      message: "Created conversions retrieved",
      data: result.data,
      pagination: result.pagination,
    });
  }

  if (joined === "admin/conversion-all") {
    const status = searchParams.get("status") || "";
    let filtered = mockConversions;
    if (status) {
      filtered = filtered.filter((c) => c.conversion_status === status);
    }
    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.offer_name.toLowerCase().includes(s) ||
          String(c.conversion_id).includes(s),
      );
    }
    return ok({
      status: "success",
      message: "Conversions retrieved",
      ...paginate(filtered, page, limit),
    });
  }

  if (joined === "admin/get-fee-rate") {
    return ok(mockFee);
  }

  if (joined === "admin/banner-home") {
    return ok(mockBanner);
  }

  if (joined === "admin/banner-home-small") {
    return ok(mockBannerHomeSmall);
  }

  if (joined === "admin/banner-all-brand-page") {
    return ok(mockBannerAllBrandPage);
  }

  if (path[0] === "admin" && path[1] === "get-mycashback-user") {
    const id = path[2]?.trim();
    if (!id) {
      return ok(mockMyCashback);
    }
    if (id.startsWith("mcb")) {
      const row = mockMyCashback.find((u) => u._id === id);
      return ok(row ? [row] : []);
    }
    const m = /^u(\d+)$/i.exec(id);
    if (m) {
      const n = parseInt(m[1], 10);
      const idx = (n - 1) % mockMyCashback.length;
      return ok([mockMyCashback[idx]]);
    }
    return ok([]);
  }

  if (joined === "auth/profile") {
    return ok({
      _id: "a1",
      username: "admin",
      email: "admin@gogocash.co",
      password: "hashed",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      __v: 0,
      token: DEFAULT_MOCK_ACCESS_TOKEN,
    });
  }

  if (joined === "involve") {
    return ok(mockOffers);
  }

  if (joined === "admin/commission-management/networks") {
    return ok({ data: AFFILIATE_NETWORKS });
  }

  if (joined === "admin/commission-management/brands") {
    const networkFilter = searchParams.get("networkId")?.trim() || null;
    const seen = new Set<number>();
    const data: Array<{
      id: string;
      name: string;
      merchantId: number;
      currency: string;
      partnerRates: string[];
      adminCommission: number | null;
      maxCap: number | null;
      partnerMaxCap: number | null;
      trackingLink: string;
      appDeeplink: string;
      affiliateNetworkId: string;
      affiliateNetworkName: string;
    }> = [];
    for (const o of mockOffers) {
      if (seen.has(o.merchant_id)) continue;
      const nwId = affiliateNetworkIdForOfferId(o._id);
      if (networkFilter && networkFilter !== nwId) continue;
      seen.add(o.merchant_id);
      const rawPC = o.partner_max_cap;
      const partnerMaxCapNum =
        typeof rawPC === "number"
          ? rawPC
          : rawPC != null && String(rawPC).trim() !== ""
            ? Number(rawPC)
            : NaN;
      data.push({
        id: o._id,
        name: o.offer_name_display || o.offer_name,
        merchantId: o.merchant_id,
        currency: o.currency,
        partnerRates: o.commissions ?? [],
        adminCommission: o.commission_store,
        maxCap: o.max_cap ?? null,
        partnerMaxCap: Number.isFinite(partnerMaxCapNum)
          ? partnerMaxCapNum
          : null,
        trackingLink: o.tracking_link,
        appDeeplink:
          commissionAppDeeplinkByOfferId.get(o._id) ??
          buildSuggestedAppDeeplink(
            o,
            resolveAffiliateNetworkIdForOffer(o),
            o.commission_store,
            resolveDeeplinkStoreId(o),
          ),
        affiliateNetworkId: nwId,
        affiliateNetworkName: affiliateNetworkName(nwId),
      });
      if (data.length >= 80) break;
    }
    return ok({ data });
  }

  return jsonErr(404, { message: `Mock endpoint not found: GET /${joined}` });
}

async function handleMockPOST(
  path: string[],
  joined: string,
  body: unknown,
): Promise<MockApiResult> {
  // Mirrors POST /admin/create-category (PolicyTable's "New category" flow).
  if (joined === "admin/create-category") {
    const b = body as { data?: { name?: string }; name?: string } | null;
    const name = (b?.data?.name ?? b?.name ?? "").trim();
    if (!name) return jsonErr(400, { message: "name is required" });
    const now = new Date().toISOString();
    const created = {
      _id: `cat_${Date.now()}`,
      name,
      image: "",
      banner: "",
      createdAt: now,
      updatedAt: now,
    };
    createdCategories.push(created);
    return ok(created);
  }
  if (joined === "admin/login") {
    const b = body as { email?: string; password?: string };
    const password = b?.password ?? "";
    if (password !== "1234") {
      return jsonErr(401, { message: "Invalid credentials" });
    }
    if (!isMockAdminPasswordAllowed()) {
      return jsonErr(401, { message: "Invalid credentials" });
    }
    const email = (b?.email ?? "").trim().toLowerCase();
    const admin =
      mockAdminUsers.find((u) => u.email.toLowerCase() === email) ??
      mockAdminUsers[0];
    return ok({
      _id: admin._id,
      username: admin.username,
      email: admin.email,
      password: "hashed",
      createdAt: admin.createdAt,
      updatedAt: admin.updatedAt,
      __v: 0,
      token: DEFAULT_MOCK_ACCESS_TOKEN,
    });
  }

  if (joined === "admin/register") {
    const b = body as { name?: string; email?: string };
    return ok({
      id: "a_new",
      name: b.name,
      email: b.email,
      message: "User registered successfully",
    });
  }

  if (joined === "point/create-quest") {
    const id = mockBodyField(body, "_id");
    const existing = id ? mockQuestStore.find((q) => q._id === id) : undefined;
    const now = new Date().toISOString();
    const quest: MockQuest = existing ?? {
      _id: `q_${Date.now()}`,
      status: "open",
      reward_status: false,
      reward_distribution_mode: "campaign_end",
      reward_distribution_delay_days: 0,
      reward_distribution_scheduled_at: null,
      start_date: "",
      end_date: "",
      facebook_page: "",
      facebook_post: "",
      line: "",
      banner_en: "",
      banner_th: "",
      sub_banner_en: "",
      sub_banner_th: "",
      createdAt: now,
      updatedAt: now,
      __v: 0,
      tasks: [],
      rewards: [],
    };

    quest.start_date = mockBodyField(body, "start_date") || quest.start_date;
    quest.end_date = mockBodyField(body, "end_date") || quest.end_date;
    quest.status = deriveQuestStatus(quest.start_date, quest.end_date);
    const rewardStatus = mockBodyField(body, "reward_status");
    quest.reward_status =
      rewardStatus === ""
        ? Boolean(quest.reward_status)
        : rewardStatus === "true";
    quest.facebook_page = mockBodyField(body, "facebook_page");
    quest.facebook_post = mockBodyField(body, "facebook_post");
    quest.line = mockBodyField(body, "line");
    quest.banner_en = quest.banner_en ?? "";
    quest.banner_th = quest.banner_th ?? "";
    quest.sub_banner_en = quest.sub_banner_en ?? "";
    quest.sub_banner_th = quest.sub_banner_th ?? "";
    quest.reward_distribution_scheduled_at = rewardDistributionScheduledAt(
      quest,
      quest.reward_distribution_mode,
      quest.reward_distribution_delay_days,
    );
    quest.updatedAt = now;

    if (!existing) mockQuestStore.unshift(quest);
    return ok(quest);
  }

  if (joined === "admin/list-mycashback-users") {
    const b = body as {
      page?: number;
      limit?: number;
      search?: string;
      sort?: string;
      status?: string;
    };
    const page = Math.max(1, Number(b.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(b.limit) || 12));
    const search = String(b.search ?? "")
      .trim()
      .toLowerCase();
    let filtered = mockMyCashback;
    if (search) {
      filtered = mockMyCashback.filter((u) => {
        const hay = [
          u._id,
          u.email,
          u.phoneNumber,
          u.buyerId,
          u.publisherId,
          u.firstName,
          u.lastName,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(search);
      });
    }
    filtered = filterMyCashbackByStatus(filtered, String(b.status ?? ""));
    filtered = sortMyCashback(filtered, (b.sort as MyCashbackSort) || "newest");
    return ok({
      status: "success",
      message: "ok",
      ...paginate(filtered, page, limit),
    });
  }

  if (path[0] === "withdraw" && path[1] === "list-check-admin") {
    const segment = path[2]?.trim() || "u1";
    const userId = resolveWithdrawRouteSegmentToUserId(segment);
    return ok(mockWithdrawDetailForUser(userId));
  }

  if (path[0] === "withdraw" && path[1] === "update-withdraw-user") {
    const b = body as Record<string, unknown>;
    const userId = String(b.userId ?? "").trim();
    if (!userId) {
      return jsonErr(400, { message: "userId is required" });
    }
    const patch: WithdrawDetailUserPatch = {
      ...withdrawDetailUserEdits[userId],
    };
    if (Array.isArray(b.emails)) {
      const list = (b.emails as unknown[])
        .map((x) => String(x).trim())
        .filter(Boolean);
      patch.emails = list;
      patch.email = list[0] ?? "";
    } else if (typeof b.email === "string") {
      const t = b.email.trim();
      patch.email = t;
      patch.emails = t ? [t] : [];
    }
    if (Array.isArray(b.mobiles)) {
      const list = (b.mobiles as unknown[])
        .map((x) => String(x).trim())
        .filter(Boolean);
      patch.mobiles = list;
      patch.mobile = list[0] ?? "";
    } else if (typeof b.mobile === "string") {
      const t = b.mobile.trim();
      patch.mobile = t;
      patch.mobiles = t ? [t] : [];
    }
    if (typeof b.fullName === "string") patch.fullName = b.fullName.trim();
    if (typeof b.gender === "string") patch.gender = b.gender.trim();
    if (typeof b.birthdate === "string") patch.birthdate = b.birthdate.trim();
    if (typeof b.wallet === "string") patch.wallet = b.wallet.trim();
    if (typeof b.gogopassActive === "boolean")
      patch.gogopassActive = b.gogopassActive;
    withdrawDetailUserEdits[userId] = patch;
    return ok({
      success: true,
      message: "User profile updated",
      user: buildWithdrawDetailUser(userId),
    });
  }

  if (path[0] === "withdraw" && path[1] === "delete-user-data") {
    const b = body as Record<string, unknown>;
    const userId = String(b.userId ?? "").trim();
    if (!userId) {
      return jsonErr(400, { message: "userId is required" });
    }
    withdrawUserDataDeleted.add(userId);
    delete withdrawDetailUserEdits[userId];
    return ok({
      success: true,
      message: "User data deleted",
    });
  }

  if (path[0] === "withdraw" && path[1] === "send-user-contact-otp") {
    const b = body as Record<string, unknown>;
    const userId = String(b.userId ?? "").trim();
    const channel = b.channel === "mobile" ? "mobile" : "email";
    const raw = String(b.target ?? "").trim();
    if (!userId || !raw) {
      return jsonErr(400, { message: "userId and target are required" });
    }
    const target = channel === "email" ? raw.toLowerCase() : raw;
    if (channel === "email") {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(target)) {
        return jsonErr(400, { message: "Invalid email address" });
      }
    } else if (raw.replace(/\D/g, "").length < 8) {
      return jsonErr(400, {
        message: "Enter a valid phone number (at least 8 digits)",
      });
    }
    const key = userContactOtpKey(userId, channel, target);
    userContactOtpSessions.set(key, Date.now() + 10 * 60 * 1000);
    return ok({
      success: true,
      message: "OTP sent",
      demoCode: MOCK_USER_CONTACT_OTP,
    });
  }

  if (path[0] === "withdraw" && path[1] === "verify-user-contact-otp") {
    const b = body as Record<string, unknown>;
    const userId = String(b.userId ?? "").trim();
    const channel = b.channel === "mobile" ? "mobile" : "email";
    const raw = String(b.target ?? "").trim();
    const otp = String(b.otp ?? "").trim();
    if (!userId || !raw || !otp) {
      return jsonErr(400, { message: "userId, target, and otp are required" });
    }
    const target = channel === "email" ? raw.toLowerCase() : raw;
    const key = userContactOtpKey(userId, channel, target);
    const exp = userContactOtpSessions.get(key);
    if (!exp || exp < Date.now()) {
      return jsonErr(400, { message: "No active OTP. Click Send OTP first." });
    }
    if (otp !== MOCK_USER_CONTACT_OTP) {
      return jsonErr(400, { message: "Invalid OTP" });
    }
    userContactOtpSessions.delete(key);
    return ok({ success: true, verified: true });
  }

  if (path[0] === "withdraw" && path[1] === "check-my-cashback-admin") {
    return ok(mockMCBDetail);
  }

  if (path[0] === "withdraw" && path[1] === "create-conversion-reward") {
    const b = (body && typeof body === "object" ? body : {}) as {
      reward_type?: string;
      reward_amount?: number | string;
      reward_currency?: string;
      user?: string;
    };
    const userInput = String(b.user ?? "").trim();
    const rewardType = String(b.reward_type ?? "").trim();
    if (!userInput || !rewardType) {
      return jsonErr(400, { message: "Invalid request" });
    }
    let mobileLookup = userInput;
    if (!userInput.includes("@") && userInput.startsWith("0")) {
      mobileLookup = `+66${userInput.slice(1)}`;
    }
    const found = mockUsers.find(
      (u) =>
        u.email === userInput ||
        u.mobile === userInput ||
        u.mobile === mobileLookup,
    );
    if (!found) {
      return jsonErr(400, { message: "User not found" });
    }
    const currency = String(b.reward_currency ?? "THB")
      .trim()
      .toUpperCase();
    if (currency !== "THB" && currency !== "USD") {
      return jsonErr(400, { message: "Invalid currency" });
    }
    return ok({
      conversion_id: Date.now(),
      offer_name: "reward_conversion_quest",
      currency,
      payout: Number(b.reward_amount) || 0,
    });
  }

  if (path[0] === "point" && path[1] === "admin-create-point") {
    const b = (body && typeof body === "object" ? body : {}) as {
      point_name?: string;
      point_amount?: number | string;
      user?: string;
    };
    const userInput = String(b.user ?? "").trim();
    const pointName = String(b.point_name ?? "").trim();
    if (!userInput || !pointName) {
      return jsonErr(400, { message: "Invalid request" });
    }
    let mobileLookup = userInput;
    if (!userInput.includes("@") && userInput.startsWith("0")) {
      mobileLookup = `+66${userInput.slice(1)}`;
    }
    const found = mockUsers.find(
      (u) =>
        u.email === userInput ||
        u.mobile === userInput ||
        u.mobile === mobileLookup,
    );
    if (!found) {
      return jsonErr(400, { message: "User not found" });
    }
    return ok({
      point_id: Date.now(),
      point_name: pointName,
      point: Number(b.point_amount) || 0,
      user_id: found._id,
    });
  }

  if (joined === "admin/getConversionInWithdraw") {
    return ok({
      status: "success",
      message: "ok",
      data: { page: 1, limit: 10, count: 0, nextPage: null, data: [] },
    });
  }

  if (
    joined === "admin/banner-home" ||
    joined === "admin/banner-home-small" ||
    joined === "admin/banner-all-brand-page"
  ) {
    const target =
      joined === "admin/banner-home"
        ? mockBanner
        : joined === "admin/banner-home-small"
          ? mockBannerHomeSmall
          : mockBannerAllBrandPage;
    const raw = (body && typeof body === "object" ? body : {}) as Record<
      string,
      unknown
    >;

    const readBodyField = (key: string): unknown => {
      if (
        typeof body === "object" &&
        body !== null &&
        "get" in body &&
        typeof (body as { get: (name: string) => unknown }).get === "function"
      ) {
        const value = (body as { get: (name: string) => unknown }).get(key);
        if (value !== null) return value;
        return undefined;
      }

      return raw[key];
    };

    const readBodyBoolean = (key: string): boolean | undefined => {
      const value = readBodyField(key);
      if (typeof value === "boolean") return value;
      if (typeof value === "string") {
        const trimmed = value.trim().toLowerCase();
        if (trimmed === "true") return true;
        if (trimmed === "false") return false;
      }
      return undefined;
    };

    const isUploadBlob = (value: unknown): value is Blob | File =>
      (typeof Blob !== "undefined" && value instanceof Blob) ||
      (typeof File !== "undefined" && value instanceof File);

    const mockDriveIdFromUpload = (key: string, file: Blob | File): string => {
      const name =
        typeof File !== "undefined" && file instanceof File
          ? file.name
          : "upload";
      const safeName = name.replace(/[^a-zA-Z0-9._-]/g, "_") || "upload";
      return `mock-drive-${key}-${Date.now()}-${safeName}`;
    };

    for (let i = 1; i <= 5; i++) {
      const lk = `link_${i}`;
      const linkValue = readBodyField(lk);
      if (typeof linkValue === "string") {
        (target as Record<string, unknown>)[lk] = linkValue;
      }
      const clearImageKey = `clear_image_${i}`;
      const clearImageValue = readBodyBoolean(clearImageKey);
      const ik = `image_${i}`;
      const imageValue = readBodyField(ik);
      if (clearImageValue) {
        (target as Record<string, unknown>)[ik] = null;
      } else if (isUploadBlob(imageValue)) {
        (target as Record<string, unknown>)[ik] = mockDriveIdFromUpload(
          ik,
          imageValue,
        );
      } else if (typeof imageValue === "string") {
        const s = imageValue.trim();
        (target as Record<string, unknown>)[ik] = s.length > 0 ? s : null;
      }
      const enabledKey = `enabled_${i}`;
      const enabledValue = readBodyBoolean(enabledKey);
      if (enabledValue !== undefined) {
        (target as Record<string, unknown>)[enabledKey] = enabledValue;
      }
      const startDateKey = `start_date_${i}`;
      const startDateValue = readBodyField(startDateKey);
      if (typeof startDateValue === "string") {
        (target as Record<string, unknown>)[startDateKey] = startDateValue;
      }
      const endDateKey = `end_date_${i}`;
      const endDateValue = readBodyField(endDateKey);
      if (typeof endDateValue === "string") {
        (target as Record<string, unknown>)[endDateKey] = endDateValue;
      }
    }
    return ok({ success: true, message: "Banner updated", ...target });
  }

  if (joined === "offer") {
    const b = body as Record<string, unknown>;
    const brandName = String(b.brand_name ?? "").trim();
    if (brandName) {
      const trackingLink = String(
        b.affiliate_tracking_link ?? b.tracking_link ?? "",
      ).trim();
      if (!trackingLink) {
        return jsonErr(400, { message: "affiliate_tracking_link is required" });
      }
      let networkId = String(b.affiliate_network_id ?? "involve_asia").trim();
      if (!AFFILIATE_NETWORKS.some((n) => n.id === networkId)) {
        networkId = "involve_asia";
      }
      let storeId = String(b.deeplink_store_id ?? "global").trim();
      if (!isValidDeeplinkStoreId(storeId)) storeId = "global";
      const rawLookup = String(b.lookup_value ?? "").trim();
      const lookup =
        rawLookup
          .replace(/[^\w-]/g, "_")
          .replace(/_+/g, "_")
          .replace(/^_|_$/g, "")
          .toLowerCase() || `brand_${Date.now()}`;
      const countries = String(b.countries ?? "Thailand").trim() || "Thailand";
      const currency = String(b.currency ?? "THB").trim() || "THB";
      const description =
        String(b.description ?? "").trim() ||
        `Created from affiliate feed. Network: ${affiliateNetworkName(networkId)}.`;
      const entryMode = String(b.commission_entry_mode ?? "manual").trim();
      let commissionStore: number | null = null;
      if (entryMode !== "auto") {
        if (
          typeof b.commission_store === "number" &&
          !Number.isNaN(b.commission_store)
        ) {
          commissionStore = b.commission_store;
        } else if (
          typeof b.commission_store === "string" &&
          b.commission_store.trim()
        ) {
          const n = parseFloat(b.commission_store);
          commissionStore = Number.isNaN(n) ? null : n;
        }
      }
      const rateLine =
        commissionStore != null && !Number.isNaN(commissionStore)
          ? [`${commissionStore}%`]
          : ["0%"];

      const parseBool = (v: unknown, fallback: boolean): boolean => {
        if (typeof v === "boolean") return v;
        if (typeof v === "string") {
          const s = v.trim().toLowerCase();
          if (s === "true") return true;
          if (s === "false") return false;
        }
        return fallback;
      };

      const disabledOffer = parseBool(b.disabled, false);
      const extraStore = parseBool(b.extra_store, false);
      const allProductTypes = parseBool(b.all_product_types, true);

      let productTypesParsed: ReturnType<typeof normalizeOfferProductTypes> =
        [];
      if (typeof b.product_types === "string" && b.product_types.trim()) {
        try {
          productTypesParsed = normalizeOfferProductTypes(
            JSON.parse(b.product_types) as unknown,
          );
        } catch {
          productTypesParsed = [];
        }
      }

      let maxCap: number | null = null;
      if (typeof b.max_cap === "number" && !Number.isNaN(b.max_cap)) {
        maxCap = b.max_cap;
      } else if (typeof b.max_cap === "string" && b.max_cap.trim()) {
        const n = parseFloat(b.max_cap);
        maxCap = Number.isNaN(n) ? null : n;
      }

      const noteToUserRaw = String(b.note_to_user ?? "").trim();
      const noteToUser = noteToUserRaw.length > 0 ? noteToUserRaw : null;

      let offerDisplayTags = normalizeOfferDisplayTags(undefined);
      if (
        typeof b.offer_display_tags === "string" &&
        b.offer_display_tags.trim()
      ) {
        try {
          offerDisplayTags = normalizeOfferDisplayTags(
            JSON.parse(b.offer_display_tags) as unknown,
          );
        } catch {
          /* keep default */
        }
      }

      const customTermsRaw = String(b.custom_terms ?? "").trim();
      const customTerms = customTermsRaw.length > 0 ? customTermsRaw : null;

      const policyCategoryRaw = String(b.policy_category_id ?? "").trim();
      const policyCategoryId =
        policyCategoryRaw.length > 0 ? policyCategoryRaw : null;
      let activePolicy: string | null = "Shopping";
      if (policyCategoryId) {
        const cat = mockCategories.find((c) => c._id === policyCategoryId);
        activePolicy = cat?.name ?? policyCategoryId;
      }

      const { _id, offer_id, merchant_id } = allocateNewOfferIds();
      const ts = new Date();
      const newOffer: Offer = {
        _id,
        offer_id,
        __v: 0,
        categories: "Shopping",
        commission_tracking: "CPS",
        commissions: rateLine,
        countries,
        currency,
        datetime_created: ts,
        datetime_updated: ts,
        description,
        directory_page: trackingLink,
        is_require_approval: 0,
        logo: "/images/merchant-logos/gadgethub-th.png",
        logo_desktop: "/images/merchant-logos/gadgethub-th.png",
        logo_mobile: "/images/merchant-logos/gadgethub-th-mobile.png",
        banner: "/images/merchant-logos/gadgethub-th.png",
        logo_circle: "/images/merchant-logos/gadgethub-th-mobile.png",
        marketplace_store_offer: true,
        merchant_id,
        offer_name: `${brandName} - CPS`,
        offer_name_display: brandName,
        payment_terms: 60,
        preview_url: trackingLink,
        special_commissions: [],
        tracking_link: trackingLink,
        tracking_type: "link",
        validation_terms: 30,
        disabled: disabledOffer,
        commission_store: commissionStore,
        max_cap: maxCap,
        partner_max_cap: null,
        banner_mobile: "",
        extra_store: extraStore,
        lookup_value: lookup,
        affiliate_partner: affiliateNetworkName(networkId),
        deeplink_store_id: storeId,
        offer_display_tags: offerDisplayTags,
        all_product_types: allProductTypes,
        product_types: allProductTypes
          ? undefined
          : productTypesParsed.length
            ? productTypesParsed
            : undefined,
        note_to_user: noteToUser,
        policy_category_id: policyCategoryId,
        active_policy: activePolicy,
        custom_terms: customTerms,
      };
      const pickPath = (key: string) => {
        const v = b[key];
        return typeof v === "string" && v.trim().length > 0
          ? String(v).trim()
          : undefined;
      };
      const logoDesktopPath = pickPath("logo_desktop");
      const logoMobilePath = pickPath("logo_mobile");
      const logoCirclePath = pickPath("logo_circle");
      const bannerPath = pickPath("banner");
      const bannerMobilePath = pickPath("banner_mobile");
      if (logoDesktopPath) {
        newOffer.logo_desktop = logoDesktopPath;
        newOffer.logo = logoDesktopPath;
      }
      if (logoMobilePath) {
        newOffer.logo_mobile = logoMobilePath;
        if (!logoDesktopPath) newOffer.logo = logoMobilePath;
      }
      if (logoCirclePath) {
        newOffer.logo_circle = logoCirclePath;
      }
      if (bannerPath) {
        newOffer.banner = bannerPath;
      }
      if (bannerMobilePath) {
        newOffer.banner_mobile = bannerMobilePath;
      }
      (mockOffers as unknown as Offer[]).push(newOffer);
      const appDeeplink = String(b.app_deeplink ?? "").trim();
      if (appDeeplink) {
        commissionAppDeeplinkByOfferId.set(_id, appDeeplink);
      }
      return ok(newOffer);
    }
    return ok({ _id: "o_new", ...(body as object) });
  }

  if (joined === "admin") {
    return ok({ _id: "a_new", ...(body as object) });
  }

  if (joined === "admin/add-conversion") {
    const b = body as {
      offer_id?: number;
      aff_sub1?: string;
      sale_amount?: string;
      payout?: string;
      currency?: string;
      conversion_status?: string;
      adv_sub2?: string;
      remark?: string;
    };
    const offerId = b?.offer_id ?? 1001;
    const userId = (b?.aff_sub1 ?? "").trim();
    const saleAmount = b?.sale_amount ?? "0.00";
    const payout = b?.payout ?? "0.00";
    const currency = b?.currency ?? "THB";
    const status = b?.conversion_status ?? "pending";
    const orderId = b?.adv_sub2 ?? `order_${Date.now()}`;
    const remark = (b?.remark ?? "").trim() || undefined;
    if (!userId) {
      return jsonErr(400, { message: "User ID (aff_sub1) is required" });
    }
    const conversionId =
      createdConversionsList.reduce(
        (max, c) => Math.max(max, c.conversion_id),
        600105,
      ) + 1;
    const nowIso = new Date().toISOString();
    createdConversionsList.push({
      conversion_id: conversionId,
      offer_id: offerId,
      offer_name: OFFER_NAMES[offerId] ?? "Unknown",
      aff_sub1: userId,
      adv_sub1: "order",
      adv_sub2: orderId,
      adv_sub3: "",
      adv_sub4: null,
      adv_sub5: "",
      sale_amount: saleAmount,
      payout,
      currency,
      conversion_status: status,
      ...(remark && { remark }),
      datetime_conversion: nowIso,
      createdAt: nowIso,
      updatedAt: nowIso,
      user: { _id: userId },
    });
    return ok({
      message: "Conversion added successfully",
      conversion_id: conversionId,
      offer_id: offerId,
      aff_sub1: userId,
      sale_amount: saleAmount,
      payout,
      currency,
      conversion_status: status,
      adv_sub2: orderId,
      ...(remark !== undefined && { remark }),
    });
  }

  if (joined === "admin/invite") {
    const b = body as { email?: string; role?: string };
    const email = (b?.email || "").trim();
    if (!email) {
      return jsonErr(400, { message: "Email is required" });
    }
    const existing = mockAdminUsers.some(
      (u) => u.email.toLowerCase() === email.toLowerCase(),
    );
    if (existing) {
      return jsonErr(400, { message: "User with this email already exists" });
    }
    const inviteId = `inv_${Date.now()}`;
    const username = email.split("@")[0] || "Pending";
    mockAdminUsers.push({
      _id: inviteId,
      username,
      password: "",
      email,
      role: typeof b.role === "string" && b.role.trim() ? b.role : "editor",
      status: "pending",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      __v: 0,
    });
    return ok({ message: `Invitation sent to ${email}` });
  }

  if (joined === "user") {
    return ok({ _id: "u_new", ...(body as object) });
  }

  if (joined === "admin/commission-management/fetch-best") {
    const b = body as { offerId?: string; affiliateNetworkId?: string };
    const id = (b.offerId ?? "").trim();
    const offer = mockOffers.find((o) => o._id === id);
    if (!offer) {
      return jsonErr(404, { message: "Offer not found" });
    }
    const expectedNw = affiliateNetworkIdForOfferId(offer._id);
    const requestedNw = (b.affiliateNetworkId ?? "").trim();
    if (requestedNw && requestedNw !== expectedNw) {
      return jsonErr(400, {
        message: `This merchant is on ${affiliateNetworkName(expectedNw)}. Select that network above, then fetch again.`,
      });
    }
    const affiliateNetworkId = requestedNw || expectedNw;
    const fromPartner = bestPercentFromPartnerRates(offer.commissions ?? []);
    let base =
      fromPartner > 0
        ? fromPartner
        : offer.commission_store != null
          ? offer.commission_store
          : 0;
    /** Mock: slight variance by network feed (replace with real API merge). */
    const networkBonus: Record<string, number> = {
      involve_asia: 0.05,
      optimise: 0.02,
      accesstrade: 0.03,
    };
    base += networkBonus[affiliateNetworkId] ?? 0;
    const bestRatePercent = Math.round(base * 100) / 100;
    const suggestedDeeplink = buildSuggestedAppDeeplink(
      offer,
      affiliateNetworkId,
      offer.commission_store,
      resolveDeeplinkStoreId(offer),
    );
    const rawPartnerCap = offer.partner_max_cap;
    const partnerMaxCapNum =
      typeof rawPartnerCap === "number"
        ? rawPartnerCap
        : rawPartnerCap != null && String(rawPartnerCap).trim() !== ""
          ? Number(rawPartnerCap)
          : NaN;
    const partnerMaxCap = Number.isFinite(partnerMaxCapNum)
      ? partnerMaxCapNum
      : null;
    return ok({
      bestRatePercent,
      currency: offer.currency,
      suggestedDeeplink,
      trackingModel: offer.commission_tracking,
      partnerRates: offer.commissions ?? [],
      offerName: offer.offer_name_display || offer.offer_name,
      affiliateNetworkId,
      affiliateNetworkName: affiliateNetworkName(affiliateNetworkId),
      partnerMaxCap,
      adminMaxCap: offer.max_cap ?? null,
    });
  }

  return jsonErr(404, { message: `Mock endpoint not found: POST /${joined}` });
}

async function handleMockPUT(
  path: string[],
  joined: string,
  body: unknown,
): Promise<MockApiResult> {
  const b = body as Record<string, unknown> & {
    categoryId?: string;
    content?: string;
  };

  if (joined === "admin/top-brands") {
    const raw = b?.brands;
    const brands = Array.isArray(raw)
      ? raw.map((entry) => ({
          cashback: String(
            (entry as { cashback?: unknown }).cashback ?? "",
          ).trim(),
          offerId: String(
            (entry as { offerId?: unknown }).offerId ?? "",
          ).trim(),
        }))
      : [];
    if (brands.length > MAX_TOP_BRANDS) {
      return jsonErr(400, {
        message: `Top brands is limited to ${MAX_TOP_BRANDS} offers.`,
      });
    }
    const seen = new Set<string>();
    const next: TopBrandConfigEntry[] = [];
    for (const entry of brands) {
      if (
        !entry.offerId ||
        !mockOffers.some((o) => o._id === entry.offerId) ||
        seen.has(entry.offerId)
      ) {
        continue;
      }
      seen.add(entry.offerId);
      next.push({ offerId: entry.offerId, cashback: "" });
    }
    topBrandHomepageBrands = next;
    return ok({
      success: true,
      brands: next.map((entry) => ({ ...entry })),
      message: "Top brand homepage config saved (mock).",
    });
  }

  if (path[0] === "offer" && path.length === 2) {
    const idx = mockOffers.findIndex((o) => o._id === path[1]);
    if (idx === -1) return jsonErr(404, { message: "Offer not found" });
    Object.assign(mockOffers[idx], b, {
      datetime_updated: new Date().toISOString(),
    });
    return ok(mockOffers[idx]);
  }

  if (path[0] === "admin" && path.length === 2) {
    const idx = mockAdminUsers.findIndex((u) => u._id === path[1]);
    if (idx === -1) return ok({ ...b });
    const patch: Partial<(typeof mockAdminUsers)[number]> = {};
    if (typeof b.role === "string") patch.role = b.role;
    if (typeof b.username === "string") patch.username = b.username;
    if (typeof b.email === "string") patch.email = b.email;
    if (typeof b.status === "string")
      patch.status = b.status as "active" | "pending";
    mockAdminUsers[idx] = {
      ...mockAdminUsers[idx],
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    return ok(mockAdminUsers[idx]);
  }

  if (path[0] === "user" && path.length === 2) {
    const idx = mockUsers.findIndex((u) => u._id === path[1]);
    if (idx === -1) return jsonErr(404, { message: "User not found" });
    Object.assign(mockUsers[idx], b, { updatedAt: new Date().toISOString() });
    return ok(mockUsers[idx]);
  }

  if (joined === "policy") {
    // Real admin sends the DTO flat. Retain legacy `data` unwrapping so older
    // static builds can still exercise mock mode during a staged rollout.
    const payload = (
      b && typeof b === "object" && "data" in b
        ? (b as { data: unknown }).data
        : b
    ) as {
      category_id?: string;
      categoryId?: string;
      banner?: unknown;
      terms?: unknown;
      clear_banner?: boolean;
      clear_terms?: boolean;
    } | null;
    const categoryId = payload?.category_id ?? payload?.categoryId;
    if (!categoryId) {
      return jsonErr(400, { message: "category_id is required" });
    }
    const existing = policyStore.get(String(categoryId));
    if (!existing && (!payload?.terms || payload.clear_terms)) {
      return jsonErr(400, {
        message: "Terms & conditions are required for a new policy.",
      });
    }
    if (
      (payload?.terms !== undefined && payload.clear_terms) ||
      (payload?.banner !== undefined && payload.clear_banner)
    ) {
      return jsonErr(400, {
        message: "A policy block and its clear flag cannot be sent together.",
      });
    }
    // Merge so an omitted block keeps its previously-saved value.
    const merged = existing ?? {};
    policyStore.set(String(categoryId), {
      ...merged,
      ...(payload?.banner !== undefined ? { banner: payload.banner } : {}),
      ...(payload?.terms !== undefined ? { terms: payload.terms } : {}),
    });
    const saved = policyStore.get(String(categoryId));
    if (payload?.clear_banner) delete saved?.banner;
    if (payload?.clear_terms) delete saved?.terms;
    return ok({ success: true, message: "Policy saved", categoryId });
  }

  return jsonErr(404, { message: `Mock endpoint not found: PUT /${joined}` });
}

async function handleMockPATCH(
  path: string[],
  joined: string,
  body: unknown,
): Promise<MockApiResult> {
  const b = (body || {}) as Record<string, unknown>;

  if (path[0] === "admin" && path[1] === "update-conversion" && path[2]) {
    const conversionId = parseInt(path[2], 10);
    if (Number.isNaN(conversionId)) {
      return jsonErr(400, { message: "Invalid conversion ID" });
    }
    const updateBody = b as {
      conversion_status?: string;
      sale_amount?: string | number;
      payout?: string | number;
      remark?: string;
      adv_sub2?: string;
    };
    const item = createdConversionsList.find(
      (c) => c.conversion_id === conversionId,
    );
    if (!item) {
      return jsonErr(404, { message: "Conversion not found or not editable" });
    }
    if (updateBody.conversion_status !== undefined)
      item.conversion_status = updateBody.conversion_status;
    if (updateBody.sale_amount !== undefined)
      item.sale_amount = String(updateBody.sale_amount);
    if (updateBody.payout !== undefined)
      item.payout = String(updateBody.payout);
    if (updateBody.remark !== undefined) item.remark = updateBody.remark;
    if (updateBody.adv_sub2 !== undefined) item.adv_sub2 = updateBody.adv_sub2;
    item.updatedAt = new Date().toISOString();
    return ok({
      message: "Conversion updated successfully",
      conversion_id: conversionId,
    });
  }

  if (
    path[0] === "point" &&
    path[1] === "admin-quest" &&
    path[2] &&
    path[3] === "rewards"
  ) {
    const quest = mockQuestStore.find((q) => q._id === path[2]);
    if (!quest) return jsonErr(404, { message: "Quest not found" });

    const rawRewards = Array.isArray((b as { rewards?: unknown[] }).rewards)
      ? ((b as { rewards: unknown[] }).rewards as Array<
          Record<string, unknown>
        >)
      : [];
    const seenRanks = new Set<number>();
    const rewards: MockQuestReward[] = [];
    for (const raw of rawRewards) {
      const rank = Number(raw.rank);
      const reward = Number(raw.reward);
      const currency = String(raw.currency ?? "THB")
        .trim()
        .toUpperCase();
      if (!Number.isInteger(rank) || rank < 1 || rank > 1000) {
        return jsonErr(400, { message: "Invalid reward rank" });
      }
      if (seenRanks.has(rank)) {
        return jsonErr(400, { message: "Duplicate reward rank" });
      }
      if (!Number.isFinite(reward) || reward < 0 || reward > 1000000) {
        return jsonErr(400, { message: "Invalid reward amount" });
      }
      if (!currency || currency.length > 12) {
        return jsonErr(400, { message: "Invalid reward currency" });
      }
      seenRanks.add(rank);
      rewards.push({ rank, reward, currency });
    }

    const mode = String(
      (b as { reward_distribution_mode?: unknown }).reward_distribution_mode ??
        quest.reward_distribution_mode,
    ) as MockQuestRewardDistributionMode;
    if (!["manual", "campaign_end", "after_days"].includes(mode)) {
      return jsonErr(400, { message: "Invalid reward distribution mode" });
    }
    const delayDays =
      mode === "after_days"
        ? Number(
            (b as { reward_distribution_delay_days?: unknown })
              .reward_distribution_delay_days ??
              quest.reward_distribution_delay_days ??
              7,
          )
        : 0;
    if (
      !Number.isInteger(delayDays) ||
      delayDays < (mode === "after_days" ? 1 : 0) ||
      delayDays > 365
    ) {
      return jsonErr(400, { message: "Invalid reward distribution delay" });
    }

    quest.rewards = rewards.sort((a, b) => a.rank - b.rank);
    quest.reward_distribution_mode = mode;
    quest.reward_distribution_delay_days = delayDays;
    quest.reward_distribution_scheduled_at = rewardDistributionScheduledAt(
      quest,
      mode,
      delayDays,
    );
    quest.updatedAt = new Date().toISOString();
    return ok(quest);
  }

  if (
    path[0] === "point" &&
    path[1] === "admin-quest" &&
    path[2] &&
    path[3] === "tasks"
  ) {
    const quest = mockQuestStore.find((q) => q._id === path[2]);
    if (!quest) return jsonErr(404, { message: "Quest not found" });
    const rawTasks = Array.isArray((b as { tasks?: unknown[] }).tasks)
      ? ((b as { tasks: unknown[] }).tasks as Array<Record<string, unknown>>)
      : [];
    const seen = new Set<string>();
    const tasks: MockQuestTask[] = [];
    for (const raw of rawTasks) {
      const offerId = String(raw.offer ?? "");
      const offer = mockOffers.find((o) => o._id === offerId);
      if (!offer) {
        return jsonErr(400, { message: "Quest task offer is not valid" });
      }
      if (seen.has(offerId)) {
        return jsonErr(400, { message: "Duplicate quest task offer" });
      }
      seen.add(offerId);
      const extraPoint = Number(raw.extra_point);
      if (
        !Number.isInteger(extraPoint) ||
        extraPoint < 2 ||
        extraPoint > 10000
      ) {
        return jsonErr(400, { message: "Invalid quest task points" });
      }
      tasks.push({
        offer,
        offer_id: Number(raw.offer_id),
        merchant_id: Number(raw.merchant_id),
        extra_point: extraPoint,
        sort_order: tasks.length,
        enabled: raw.enabled !== false,
        wording: String(raw.wording ?? ""),
        wording_en: String(raw.wording_en ?? raw.wording ?? ""),
        wording_th: String(raw.wording_th ?? ""),
        notes: String(raw.notes ?? ""),
      });
    }

    const previousTaskOfferIds = new Set(
      quest.tasks.map((task) =>
        typeof task.offer === "string" ? task.offer : task.offer._id,
      ),
    );
    for (const offer of mockOffers as MockOffer[]) {
      if (previousTaskOfferIds.has(offer._id)) offer.extra_point = 1;
    }
    for (const task of tasks) {
      const offer =
        typeof task.offer === "string"
          ? (mockOffers as MockOffer[]).find((o) => o._id === task.offer)
          : task.offer;
      if (offer && task.enabled) offer.extra_point = task.extra_point;
    }

    quest.tasks = tasks;
    quest.updatedAt = new Date().toISOString();
    return ok(quest);
  }

  if (path[0] === "admin" && path[1] === "update-fee-rate") {
    const patch = b as Record<string, unknown>;
    Object.assign(mockFee[0], patch, { updatedAt: new Date().toISOString() });
    return ok({ ...mockFee[0] });
  }

  if (path[0] === "admin" && path[1] === "update-category" && path[2]) {
    const categoryId = path[2];
    // Look up seeded AND runtime-created categories (Policy Management "Create
    // New" pushes into createdCategories) so their icon/banner can be edited.
    const cat =
      mockCategories.find((c) => c._id === categoryId) ??
      createdCategories.find((c) => c._id === categoryId);
    if (!cat) {
      return jsonErr(404, { message: "Category not found" });
    }
    const readCategoryField = (key: "name" | "image" | "banner") => {
      const value =
        body &&
        typeof body === "object" &&
        "get" in body &&
        typeof (body as { get: (name: string) => unknown }).get === "function"
          ? (body as { get: (name: string) => unknown }).get(key)
          : (b as Record<string, unknown>)[key];
      if (typeof File !== "undefined" && value instanceof File) {
        return value.size > 0
          ? `${key === "banner" ? "category-banner" : "category"}/${categoryId}/${Date.now()}-${value.name}`
          : "";
      }
      return typeof value === "string" ? value : "";
    };
    const name = readCategoryField("name");
    const image = readCategoryField("image");
    const banner = readCategoryField("banner");
    if (name.trim().length > 0) {
      cat.name = name.trim();
    }
    if (image.length > 0) {
      cat.image = image;
    }
    if (banner.length > 0) {
      cat.banner = banner;
    }
    cat.updatedAt = new Date().toISOString();
    return ok({
      success: true,
      message: "Category updated successfully",
      data: cat,
    });
  }

  if (path[0] === "admin" && path[1] === "update-offer" && path[2]) {
    const offerId = path[2];
    const offer = mockOffers.find((o) => o._id === offerId) as
      Offer | undefined;
    if (!offer) {
      return jsonErr(404, { message: "Offer not found" });
    }
    const b = body as Record<string, string | undefined>;
    if (b.offer_name_display != null) {
      offer.offer_name_display = b.offer_name_display;
    }
    if (b.lookup_value !== undefined) {
      offer.lookup_value = (b.lookup_value ?? "").trim();
    }
    if (b.disabled != null) {
      offer.disabled = b.disabled === "true";
    }
    if (b.commission_store != null && b.commission_store !== "") {
      const n = Number(b.commission_store);
      if (Number.isFinite(n)) offer.commission_store = n;
    }
    if (b.max_cap != null && b.max_cap !== "") {
      const n = Number(b.max_cap);
      if (Number.isFinite(n)) offer.max_cap = n;
    }
    if (b.extra_store != null) {
      offer.extra_store = b.extra_store === "true";
    }
    if (b.upsize_start_date !== undefined) {
      offer.upsize_start_date = b.upsize_start_date || null;
    }
    if (b.upsize_end_date !== undefined) {
      offer.upsize_end_date = b.upsize_end_date || null;
    }
    if (b.upsize_start_time !== undefined) {
      offer.upsize_start_time = b.upsize_start_time || null;
    }
    if (b.upsize_end_time !== undefined) {
      offer.upsize_end_time = b.upsize_end_time || null;
    }
    if (b.upsize_all_product_types != null) {
      offer.upsize_all_product_types = b.upsize_all_product_types === "true";
    }
    if (b.upsize_special_commission !== undefined) {
      offer.upsize_special_commission =
        b.upsize_special_commission === "" ||
        b.upsize_special_commission == null
          ? null
          : Number(b.upsize_special_commission);
    }
    if (b.upsize_max_cap !== undefined) {
      offer.upsize_max_cap =
        b.upsize_max_cap === "" || b.upsize_max_cap == null
          ? null
          : Number(b.upsize_max_cap);
    }
    if (b.upsize_product_types != null) {
      try {
        const parsed: unknown = JSON.parse(b.upsize_product_types);
        offer.upsize_product_types = normalizeOfferProductTypes(parsed);
      } catch {
        /* ignore invalid JSON */
      }
    }
    if (b.product_types != null) {
      try {
        const parsed: unknown = JSON.parse(b.product_types);
        offer.product_types = normalizeOfferProductTypes(parsed);
      } catch {
        /* ignore invalid JSON */
      }
    }
    if (b.all_product_types != null) {
      offer.all_product_types = b.all_product_types === "true";
    }
    if (b.admin_commission_info != null) {
      try {
        const parsed = JSON.parse(b.admin_commission_info) as string[];
        offer.admin_commission_info = Array.isArray(parsed)
          ? parsed.map((s) => String(s).trim()).filter(Boolean)
          : [];
      } catch {
        /* ignore invalid JSON */
      }
    }
    if (b.logo_desktop) offer.logo_desktop = b.logo_desktop;
    if (b.logo_mobile) offer.logo_mobile = b.logo_mobile;
    if (b.banner) offer.banner = b.banner;
    if (b.banner_mobile) offer.banner_mobile = b.banner_mobile;
    if (b.logo_circle) offer.logo_circle = b.logo_circle;

    if (b.policy_category_id !== undefined) {
      const id = (b.policy_category_id ?? "").trim();
      offer.policy_category_id = id || null;
      if (id) {
        const cat = mockCategories.find((c) => c._id === id);
        offer.active_policy = cat?.name ?? id;
      } else {
        offer.active_policy = offer.categories;
      }
    }
    if (b.custom_terms !== undefined) {
      const t = (b.custom_terms ?? "").trim();
      offer.custom_terms = t.length > 0 ? t : null;
    }
    if (b.note_to_user !== undefined) {
      const t = (b.note_to_user ?? "").trim();
      offer.note_to_user = t.length > 0 ? t : null;
    }
    // Cashback tracking period (mirrors the real API: absent key = no change).
    if (b.tracking_period_mode !== undefined) {
      offer.tracking_period_mode =
        b.tracking_period_mode === "manual" ? "manual" : "auto";
    }
    if (b.tracking_days !== undefined) {
      const n = Number(b.tracking_days);
      if (Number.isInteger(n) && n >= 1 && n <= 365) offer.tracking_days = n;
    }
    if (b.confirm_days !== undefined) {
      const n = Number(b.confirm_days);
      if (Number.isInteger(n) && n >= 1 && n <= 365) offer.confirm_days = n;
    }
    if (b.affiliate_network_id !== undefined) {
      const id = (b.affiliate_network_id ?? "").trim();
      if (id && AFFILIATE_NETWORKS.some((n) => n.id === id)) {
        offer.affiliate_partner = affiliateNetworkName(id);
      }
    }
    if (b.deeplink_store_id !== undefined) {
      const sid = (b.deeplink_store_id ?? "").trim();
      if (sid && isValidDeeplinkStoreId(sid)) {
        offer.deeplink_store_id = sid;
      }
    }
    if (b.offer_display_tags != null) {
      try {
        const parsed: unknown = JSON.parse(b.offer_display_tags);
        offer.offer_display_tags = normalizeOfferDisplayTags(parsed);
      } catch {
        /* ignore invalid JSON */
      }
    }

    offer.datetime_updated = new Date();
    return ok({ success: true, message: "Offer updated", data: offer });
  }

  if (
    path[0] === "admin" &&
    path[1] === "commission-management" &&
    path[2] === "deeplink"
  ) {
    const raw = body as { offerId?: string; deeplink?: string };
    const id = (raw.offerId ?? "").trim();
    const deeplink = (raw.deeplink ?? "").trim();
    if (!id || !deeplink) {
      return jsonErr(400, {
        message: "offerId and tracking link URL are required",
      });
    }
    const offer = mockOffers.find((o) => o._id === id);
    if (!offer) {
      return jsonErr(404, { message: "Offer not found" });
    }
    commissionAppDeeplinkByOfferId.set(id, deeplink);
    return ok({ success: true, data: { offerId: id, deeplink } });
  }

  return jsonErr(404, { message: `Mock endpoint not found: PATCH /${joined}` });
}

function handleMockDELETE(path: string[], joined: string): MockApiResult {
  if (path[0] === "offer" && path.length === 2) {
    const id = path[1];
    const idx = mockOffers.findIndex((o) => o._id === id);
    if (idx === -1) {
      return jsonErr(404, { message: "Offer not found" });
    }
    mockOffers.splice(idx, 1);
    for (let i = topBrandHomepageBrands.length - 1; i >= 0; i -= 1) {
      if (topBrandHomepageBrands[i].offerId === id) {
        topBrandHomepageBrands.splice(i, 1);
      }
    }
    return ok({ message: "Offer deleted successfully" });
  }

  if (path[0] === "admin" && path.length === 2) {
    const id = path[1];
    const index = mockAdminUsers.findIndex((u) => u._id === id);
    if (index !== -1) {
      mockAdminUsers.splice(index, 1);
    }
    return ok({ message: `Deleted admin ${id}` });
  }

  return jsonErr(404, {
    message: `Mock endpoint not found: DELETE /${joined}`,
  });
}

function tryRolesRequest(input: MockApiInput): MockApiResult | null {
  const { method, path, body } = input;
  const m = method.toUpperCase();
  if (path[0] !== "admin" || path[1] !== "roles") return null;
  const id = path[2];

  if (m === "GET") {
    if (id) {
      const r = getRoleDef(id);
      return r ? ok(r) : jsonErr(404, { message: "Role not found" });
    }
    return ok({ data: listRoles() });
  }

  const b = (body ?? {}) as {
    label?: string;
    description?: string;
    permissions?: Permission[];
  };
  const perms = Array.isArray(b.permissions) ? b.permissions : [];

  if (m === "POST" && !id) {
    if (!b.label?.trim()) {
      return jsonErr(400, { message: "Role name is required" });
    }
    return ok(
      createRole({
        label: b.label,
        description: b.description,
        permissions: perms,
      }),
    );
  }
  if ((m === "PUT" || m === "PATCH") && id) {
    const updated = updateRole(id, {
      label: b.label,
      description: b.description,
      permissions: b.permissions === undefined ? undefined : perms,
    });
    return updated ? ok(updated) : jsonErr(404, { message: "Role not found" });
  }
  if (m === "DELETE" && id) {
    const res = deleteRole(id);
    if (res.ok) {
      // Reassign anyone holding the deleted role to viewer (avoids dangling ids).
      let moved = 0;
      for (const u of mockAdminUsers) {
        if (u.role === id) {
          u.role = "viewer";
          moved += 1;
        }
      }
      return ok({
        message: `Deleted role ${id}${moved ? ` — ${moved} user(s) moved to Viewer` : ""}`,
      });
    }
    return jsonErr(res.reason === "system_role" ? 400 : 404, {
      message:
        res.reason === "system_role"
          ? "System roles cannot be deleted"
          : "Role not found",
    });
  }
  return null;
}

/**
 * POST endpoints that are reads or pre-auth — they mutate nothing, so they are
 * never gated by a write permission.
 */
const WRITE_READ_ALLOWLIST = new Set<string>([
  "admin/login",
  "admin/list-mycashback-users",
  "admin/getConversionInWithdraw",
  "admin/commission-management/fetch-best",
  "withdraw/list-check-admin",
  "withdraw/check-my-cashback-admin",
]);

/**
 * The permission a mutating request requires, or null when the request is a
 * read / pre-auth endpoint that shouldn't be gated here. Gating is by resource
 * (path root) so new sub-routes within a resource are covered automatically.
 * Unmatched `admin/*` writes fail closed (require adminUsers:manage) so a new
 * admin mutation can never ship ungated by omission; unknown non-admin writes
 * fall through to the 404 handler.
 */
function requiredWritePermission(
  m: string,
  path: string[],
  joined: string,
): Permission | null {
  if (m === "GET") return null;
  if (WRITE_READ_ALLOWLIST.has(joined)) return null;

  const p0 = path[0];
  const p1 = path[1];

  // Admin-user & role management (create/invite/register/roles). Note: a bare
  // `admin/:id` write (editing an admin-user record) is NOT matched here — it
  // falls through to the fail-closed admin rule below, so it can't shadow the
  // specific admin verb routes (admin/add-conversion, admin/update-fee-rate…).
  if (
    joined === "admin" ||
    joined === "admin/invite" ||
    joined === "admin/register" ||
    (p0 === "admin" && p1 === "roles")
  ) {
    return "adminUsers:manage";
  }

  // Withdrawals: PII edits, deletes, contact-OTP, payouts.
  if (p0 === "withdraw") return "withdraw:manage";

  // End-user data & lifecycle (incl. credit score, membership, subscription,
  // referrals, wallets).
  if (p0 === "user") return "users:manage";
  if (
    p0 === "admin" &&
    (p1 === "credit-scores" ||
      p1 === "membership" ||
      p1 === "subscription" ||
      p1 === "referral" ||
      p1 === "referrals" ||
      p1 === "wallets")
  ) {
    return "users:manage";
  }

  // Conversions & transactions.
  if (
    p0 === "admin" &&
    (p1 === "add-conversion" ||
      p1 === "update-conversion" ||
      p1 === "transactions")
  ) {
    return "conversion:manage";
  }

  // Fee settings.
  if (p0 === "admin" && p1 === "update-fee-rate") return "fee:manage";

  if (p0 === "point" && (p1 === "create-quest" || p1 === "admin-quest")) {
    return "quest:manage";
  }

  // Banners.
  if (
    joined === "admin/banner-home" ||
    joined === "admin/banner-home-small" ||
    joined === "admin/banner-all-brand-page"
  ) {
    return "banner:manage";
  }

  // Brands domain: offers, categories, top brands, commission management,
  // policy, missing orders, discover & search config.
  if (p0 === "offer" || joined === "policy") return "brands:manage";
  if (
    p0 === "admin" &&
    (p1 === "top-brands" ||
      p1 === "update-offer" ||
      p1 === "update-category" ||
      p1 === "commission-management" ||
      p1 === "missing-orders" ||
      p1 === "discover" ||
      p1 === "search")
  ) {
    return "brands:manage";
  }

  // Fail closed for any other admin mutation; let unknown non-admin writes 404.
  if (p0 === "admin") return "adminUsers:manage";
  return null;
}

export async function handleMockApiRequest(
  input: MockApiInput,
): Promise<MockApiResult> {
  const { method, path, searchParams, body } = input;
  const joined = path.join("/");
  const m = method.toUpperCase();

  // RBAC: enforce the write permission BEFORE any handler dispatch (including
  // the admin-features module) so no mutating route can run ungated.
  const callerRoleId = input.role ?? "viewer";
  const writePermission = requiredWritePermission(m, path, joined);
  if (writePermission && !roleCan(callerRoleId, writePermission)) {
    return jsonErr(403, {
      message: `Forbidden: this action requires the "${writePermission}" permission.`,
    });
  }

  const adminFeatureHit = tryMockAdminFeaturesRequest(input);
  if (adminFeatureHit) return adminFeatureHit;

  const rolesHit = tryRolesRequest(input);
  if (rolesHit) return rolesHit;

  switch (m) {
    case "GET":
      return handleMockGET(path, joined, searchParams);
    case "POST":
      return handleMockPOST(path, joined, body);
    case "PUT":
      return handleMockPUT(path, joined, body);
    case "PATCH":
      return handleMockPATCH(path, joined, body);
    case "DELETE":
      return handleMockDELETE(path, joined);
    default:
      return jsonErr(405, { message: `Method not allowed: ${method}` });
  }
}
