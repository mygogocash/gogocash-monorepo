import type { Permission } from "@/lib/rbac/permissions";

// API Types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  _id: string;
  username: string;
  email: string;
  password: string;
  createdAt: string;
  updatedAt: string;
  __v: number;
  token: string;
}

export interface ApiError {
  message: string;
  status: number;
  errors?: Record<string, string[]>;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
}

export interface RegisterResponse {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  message?: string;
}

export interface AdminUsersQuery {
  limit?: number;
  page?: number;
  search?: string;
  role?: string;
  status?: string;
}

export interface AdminUsersResponse {
  data: DataAdminUsers[];
  pagination: Pagination;
}

export interface DataAdminUsers {
  _id: string;
  username: string;
  password: string;
  email: string;
  /** Role id — a built-in tier (`super_admin`…) or a custom role id. */
  role?: string;
  status?: "active" | "pending";
  createdAt: Date;
  updatedAt: Date;
  __v: number;
}

/** A role definition (built-in tier or custom) with its granted permissions. */
export interface RoleDef {
  id: string;
  label: string;
  description?: string;
  system: boolean;
  permissions: Permission[];
}

export interface RolesResponse {
  data: RoleDef[];
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// Regular User Types (from /user endpoint)

export interface RegularUser {
  _id: string;
  address: string;
  __v: number;
  email: string;
  id_crossmint: string;
  id_twitter: string;
  username: string;
  mobile?: string;
  id_firebase: string;
  createdAt: Date;
  updatedAt: Date;
  birthdate: Date | null;
  country: string | null;
  gender: string | null;
  /** Membership tier name (e.g. "Basic", "GoGoPass Plus"). */
  membershipTier?: string;
  /** Subscription plan name (e.g. "Monthly Premium"); absent if not subscribed. */
  subscriptionPlan?: string;
  /** Credit score (0–1000); drives the credit tier. Absent for users without a score. */
  creditScore?: number;
}
export interface UsersQuery {
  limit?: number;
  page?: number;
  search?: string;
  role?: string;
  status?: string;
  /** Sort key: "newest" | "name" | "tier" | "membership" (see lib/userSort). */
  sort?: string;
  /** Filter: credit tier id "bronze" | "silver" | "gold" | "platinum". */
  tier?: string;
  /** Filter: membership tier name, e.g. "Basic" | "GoGoPass Plus". */
  membership?: string;
  /** Filter: subscription "monthly" | "annual" | "none" (see lib/userFilter). */
  subscription?: string;
}

export interface UsersResponse {
  data: RegularUser[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface DashboardStatsResponse {
  gogocashUsers: number;
  mycashbackUsers: number;
}

export interface DashboardWithdrawStatusBucket {
  count: number;
  total: number;
  /** ISO8601 — oldest pending request (pending only). */
  oldestAt?: string | null;
}

export interface DashboardSummaryResponse {
  /** Currency used by every scalar financial total in this response. */
  currency: "THB";
  /** Count of commercial conversions across currencies and statuses. */
  conversionCount: number;
  conversionTotalPayout: number;
  /** Sum of sale amounts for conversions in scope (when provided by API). */
  conversionTotalSaleAmount?: number;
  period?: { from: string; to: string };
  lastUpdated?: string;
  withdrawByStatus: {
    pending: DashboardWithdrawStatusBucket;
    approved: DashboardWithdrawStatusBucket;
    rejected: DashboardWithdrawStatusBucket;
  };
  priorPeriod?: {
    conversionCount: number;
    conversionTotalPayout: number;
    conversionTotalSaleAmount?: number;
  };
}

/** One Apex-style statistics bundle (matches `statisticsChartMockData` shape). */
export type DashboardStatisticsSeriesName =
  "Clicks" | "Conversions" | "Sale Amount" | "Estimated Earnings";

export interface DashboardStatisticsBundle {
  categories: string[];
  series: {
    name: DashboardStatisticsSeriesName;
    data: number[];
  }[];
  description: string;
}

export type DashboardStatisticsByTab = Record<
  "day" | "week" | "month" | "quarter" | "year",
  DashboardStatisticsBundle
>;

export type DashboardInsightRange = "7d" | "30d" | "90d" | "all";

/**
 * A selectable insight range: either a preset, or a custom window encoded as the
 * token `custom:<YYYY-MM-DD>:<YYYY-MM-DD>` (see `@/lib/insightRange`).
 */
export type DashboardInsightRangeValue = DashboardInsightRange | string;

export interface DashboardKpiSnapshot {
  gogocashUsers: number;
  mycashbackUsers: number;
  conversionCount: number;
  conversionTotalPayout: number;
  conversionTotalSaleAmount: number;
}

export interface DashboardKpiBlock {
  current: DashboardKpiSnapshot;
  prior: DashboardKpiSnapshot | null;
  newUsersInPeriod: number;
}

export interface DashboardTopOfferRow {
  offerId: number;
  offerName: string;
  merchantId: number;
  /** Affiliate network namespace for offerId. */
  networkId: string;
  /** Publisher/account namespace within the affiliate network. */
  providerAccount: string;
  conversions: number;
  gmv: number;
  payout: number;
  /** Financial values are fail-closed to THB; conversions span currencies. */
  currency: "THB";
}

export interface DashboardNetworkRow {
  networkId: string;
  networkName: string;
  offersCount: number;
  conversions: number;
  gmv: number;
  payout: number;
  /** Network totals are intentionally scoped to the dashboard currency. */
  currency: "THB";
}

export interface DashboardCommissionHealth {
  missingAdminCap: number;
  missingPartnerCap: number;
  adminOverPartner: number;
}

export interface DashboardDataAvailability {
  available: boolean;
  reason: string;
}

export interface DashboardAnalyticsAvailability {
  clicks: DashboardDataAvailability;
  commissionHealth: DashboardDataAvailability;
  quests: DashboardDataAvailability;
}

export type DashboardAlertSeverity = "low" | "medium" | "high";

export interface DashboardAlert {
  id: string;
  severity: DashboardAlertSeverity;
  title: string;
  body: string;
  href: string;
  metric?: string;
  deltaPct?: number;
}

export interface DashboardWithdrawMetrics {
  approvalRatePct: number | null;
  pendingOver48hCount: number;
  rejectedSharePct: number | null;
}

export type DashboardQuestLifecycle = "live" | "scheduled" | "ended";

/** Mock / API funnel — unique users per step (illustrative). */
export interface DashboardQuestFunnelCounts {
  viewed: number;
  joined: number;
  tasksStarted: number;
  fullyCompleted: number;
}

export interface DashboardQuestRow {
  id: string;
  status: string;
  rewardStatus: string;
  startDate: string;
  endDate: string;
  taskCount: number;
  /** Enrolled users (mock leaderboard size). */
  participantCount: number;
  lifecycle: DashboardQuestLifecycle;
  /** Quest schedule overlaps the dashboard insight window */
  overlapsSelectedRange: boolean;
  funnel: DashboardQuestFunnelCounts;
  activeParticipants: number;
  pointsIssued: number;
  taskOfferCount: number;
  taskMerchantCount: number;
  conditionalTaskCount: number;
  /** Conversions attributed to this quest in the insight period (mock heuristic). */
  attributedConversions: number;
  attributedGmv: number;
  attributedPayout: number;
  /** Promotional surfaces enabled (Facebook / Line / any banner). */
  channelFacebook: boolean;
  channelLine: boolean;
  channelBanner: boolean;
  /** Days until schedule end; negative after end; null if dates invalid. */
  daysUntilEnd: number | null;
}

export interface DashboardQuestEngagementTotals {
  enrolledInOverlapping: number;
  activeInOverlapping: number;
  fullCompletesInOverlapping: number;
  pointsIssuedInOverlapping: number;
}

export interface DashboardQuestAttributionTotals {
  attributedConversionsInPeriod: number;
  attributedGmvInPeriod: number;
  attributedPayoutInPeriod: number;
  /** Attributed conversions as a share of all conversions in the insight period. */
  shareOfPeriodConversionsPct: number | null;
}

export interface DashboardQuestTaskMix {
  offerTasks: number;
  merchantTasks: number;
  conditionalTasks: number;
}

export interface DashboardQuestChannelTotals {
  questsWithFacebook: number;
  questsWithLine: number;
  questsWithBanner: number;
}

export interface DashboardQuestTimelineBar {
  id: string;
  shortId: string;
  startDate: string;
  endDate: string;
  lifecycle: DashboardQuestLifecycle;
  /** 0–100 where “today” sits in [start,end]; clamped for ended/scheduled. */
  progressThroughSchedulePct: number;
}

export interface DashboardQuestLeaderboardRow {
  rank: number;
  label: string;
  points: number;
}

export interface DashboardQuestMetrics {
  totalQuests: number;
  liveNow: number;
  scheduled: number;
  ended: number;
  overlappingSelectedRange: number;
  totalParticipantsInOverlapping: number;
  rows: DashboardQuestRow[];
  engagement: DashboardQuestEngagementTotals;
  attribution: DashboardQuestAttributionTotals;
  funnelTotals: DashboardQuestFunnelCounts;
  taskMix: DashboardQuestTaskMix;
  channels: DashboardQuestChannelTotals;
  timeline: DashboardQuestTimelineBar[];
  /** Preview for the largest overlapping quest by enrollment (mock). */
  leaderboardPreview: {
    questId: string;
    questShortId: string;
    rows: DashboardQuestLeaderboardRow[];
  } | null;
}

export interface DashboardInsightsResponse {
  lastUpdated: string;
  range: DashboardInsightRange | string;
  /** Financial values are THB-only; commercial conversion counts span currencies. */
  currency: "THB";
  availability: DashboardAnalyticsAvailability;
  period: { from: string; to: string };
  kpis: DashboardKpiBlock;
  withdrawByStatus: DashboardSummaryResponse["withdrawByStatus"];
  withdrawMetrics: DashboardWithdrawMetrics;
  conversionsByStatus: Record<string, number>;
  payoutRatio: number | null;
  topOffers: DashboardTopOfferRow[];
  networkBreakdown: DashboardNetworkRow[];
  commissionHealth: DashboardCommissionHealth;
  alerts: DashboardAlert[];
  insightSummary: string;
  statistics: DashboardStatisticsByTab;
  quests: DashboardQuestMetrics;
}

/**
 * Admin-controlled offer card / listing tags (app merchandising).
 * Canonical contract + normalizer live in @gogocash/contracts (#19 P4-1);
 * re-exported here so existing "@/types/api" import sites keep working.
 */
import type { OfferDisplayTags } from "@gogocash/contracts";

export type { OfferDisplayTags };
export {
  DEFAULT_OFFER_DISPLAY_TAGS,
  normalizeOfferDisplayTags,
} from "@gogocash/contracts";

/** One product-type row on an offer (display name + commission details for admins). */
export interface OfferProductTypeEntry {
  name: string;
  /** Which payout this line uses (default: cashback). */
  pay_in?: "cashback" | "cash";
  /** Cashback %: saved net commission (after −30% fee), as a string. */
  commission_info: string;
  /** Raw partner number the admin typed; editing-only, derived from `commission_info` on load and dropped on save. */
  commission_raw?: string;
  /** Cash pay-in: fixed amount paid out. */
  amount?: number | null;
  /** Cash pay-in: currency code (e.g. THB, USD). */
  currency?: string;
  /** Optional app tracking link for this brand / product line. */
  deeplink?: string;
  /** Optional free-text subtitle shown under the name in admin product-type tables. */
  description?: string;
  /** Upsize lines only, editing-only: true = `description` is a re-written override
   *  for the promo window; false/absent = use the product type's default description. */
  description_rewrite?: boolean;
  /** Upsize lines only, editing-only: true = "Others" — `name` is free-text rather
   *  than a product type chosen from the offer's list. */
  is_others?: boolean;
  /** When true, this is a plain-text heading/tagline that groups the rows below it (no commission). */
  is_tagline?: boolean;
}

/**
 * Coerce API/mock payloads to typed rows. Older data may still use `string[]`.
 */
export function normalizeOfferProductTypes(
  value: unknown,
): OfferProductTypeEntry[] {
  if (!Array.isArray(value)) return [];
  return value.map((item): OfferProductTypeEntry => {
    if (typeof item === "string") {
      return { name: item.trim(), pay_in: "cashback", commission_info: "" };
    }
    if (item && typeof item === "object") {
      const o = item as Record<string, unknown>;
      const amountNum =
        o.amount == null || o.amount === "" ? null : Number(o.amount);
      return {
        name: String(o.name ?? "").trim(),
        pay_in: o.pay_in === "cash" ? "cash" : "cashback",
        commission_info: String(o.commission_info ?? "").trim(),
        amount:
          typeof amountNum === "number" && Number.isFinite(amountNum)
            ? amountNum
            : null,
        currency: String(o.currency ?? "").trim(),
        deeplink: String(o.deeplink ?? "").trim(),
        description: String(o.description ?? "").trim(),
        ...(o.is_tagline === true ? { is_tagline: true } : {}),
      };
    }
    return { name: "", pay_in: "cashback", commission_info: "" };
  });
}

/**
 * POST `/offer` — create a merchant row from affiliate feed data and optional app tracking link (mock + future API).
 * The admin UI submits a `FormData` with string fields plus optional files (`logo_desktop`, `logo_mobile`, `logo_circle`, `banner`, `banner_mobile`).
 * Additional keys mirror offer edit: `disabled`, `extra_store`, `commission_entry_mode` (`manual`|`auto`), `commission_store` (manual only),
 * `all_product_types`, `product_types` (JSON array), `max_cap`, `note_to_user`, `offer_display_tags` (JSON), `policy_category_id`, `custom_terms`.
 */
export interface CreateBrandFromAffiliatePayload {
  brand_name: string;
  affiliate_network_id: string;
  /** Partner / network tracking or destination URL for this brand line. */
  affiliate_tracking_link: string;
  /** GoGoCash in-app open URL; stored as commission tracking link mapping for the new offer. */
  app_deeplink?: string;
  countries?: string;
  currency?: string;
  deeplink_store_id?: string;
  /** URL slug segment for `open/offer/{lookup}`; auto-generated if omitted. */
  lookup_value?: string;
  description?: string;
  /** Shown as partner rate hint; optional when `commission_entry_mode` is `manual`. */
  commission_store?: number | null;
  /**
   * When `true`, the brand is visible to customers worldwide, regardless of their country.
   * Customers in countries without a specific variant are routed to `default_country`'s tracking link.
   * When `false` (default), the brand is only shown to customers whose country matches `countries`.
   */
  is_global?: boolean;
  /**
   * Fallback country (matches `countries` value, e.g. `Thailand`) used when a global brand
   * is opened by a customer whose country has no dedicated variant.
   */
  default_country?: string;
}

// Offer Types (from /offer endpoint)
export interface Offer {
  _id: string;
  offer_id: number;
  __v: number;
  categories: string;
  commission_tracking: string;
  // Involve-style partner rows ({ Commission: "2.80%" }) or legacy plain strings —
  // collectPercentsFromPartnerRates handles both shapes.
  commissions: Array<string | Record<string, string>>;
  countries: string;
  currency: string;
  datetime_created: Date;
  datetime_updated: Date;
  description: string;
  directory_page: string;
  is_require_approval: number;
  logo: string;
  lookup_value: string;
  marketplace_store_offer: boolean;
  merchant_id: number;
  offer_name: string;
  payment_terms: number;
  preview_url: string;
  special_commissions: unknown[];
  tracking_link: string;
  tracking_type: string;
  validation_terms: number;
  /** Cashback tracking-period config ('auto' derives from validation_terms). */
  tracking_period_mode?: "auto" | "manual";
  tracking_days?: number | null;
  confirm_days?: number | null;
  /** Step-strip flow: 3-step (Purchase→Tracking→Confirm) or combined 2-step. */
  flow_type?: "three_step" | "two_step";
  /** Editable step captions; blank falls back to the platform defaults. */
  tracking_subtitle?: string | null;
  confirm_subtitle?: string | null;
  /**
   * API-derived windows (public GET /offer/:id attaches this and STRIPS the
   * raw fields above — the /brands/[id] route seeds from it instead).
   */
  tracking_period?: {
    tracking_days: number;
    confirm_days: number;
    source: "partner" | "manual" | "default";
    flow_type?: "three_step" | "two_step";
    tracking_subtitle?: string;
    confirm_subtitle?: string;
  };
  logo_desktop: string;
  logo_mobile: string;
  banner: string;
  logo_circle: string;
  disabled: boolean;
  offer_name_display: string;
  commission_store: number | null;
  /** Admin-configured cap (editable in this form). */
  max_cap: number | null;
  /** Max cap as supplied by the partner / network feed (read-only). */
  partner_max_cap?: number | string | null;
  banner_mobile: string;
  /** When true, treat as top-brand placement (API field name: extra_store). */
  extra_store: boolean;
  /** Quest task bonus points. Values > 1 show on the customer Quest task list in legacy mode. */
  extra_point?: number;
  /** Active policy (from category; optional if API provides it) */
  active_policy?: string | null;
  /** When set, T&C for this offer come from this category’s policy (Policy Management). Empty = use offer category name to resolve. */
  policy_category_id?: string | null;
  /** Merchant/offer-specific terms shown in addition to (not instead of) the category policy unless the app merges them. */
  custom_terms?: string | null;
  /** Upsize event (optional, from API) */
  upsize_start_date?: string | null;
  upsize_end_date?: string | null;
  /** Promo start/end clock time (HH:mm), paired with the start/end dates. */
  upsize_start_time?: string | null;
  upsize_end_time?: string | null;
  upsize_special_commission?: number | null;
  upsize_max_cap?: number | null;
  /** Upsize promo scope: one rate for all products (true) vs per-product-line (false). */
  upsize_all_product_types?: boolean;
  /** Per–product-line commission copy for the upsize promo period (optional). */
  upsize_product_types?: OfferProductTypeEntry[];
  /** Product types for this offer (optional, from API) */
  product_types?: OfferProductTypeEntry[];
  /** When true, admin treats this offer as covering all product lines (single tracking link / commission setup). */
  all_product_types?: boolean;
  /** Admin-entered commission notes or tiers (e.g. internal deals); separate from partner feed. */
  admin_commission_info?: string[];
  /** Short message from admin shown to end users for this offer (e.g. app offer detail). */
  note_to_user?: string | null;
  /** Optional backend publication state; `disabled` remains the admin hide/live switch. */
  status?: string | null;
  /** Affiliate / performance network name (e.g. Involve Asia). Optional; UI may derive from offer id in mock. */
  affiliate_partner?: string | null;
  /** Admin-selected advertiser line (e.g. `shopee_cps`, `shopee_cps_new`); sent as store= in URL. */
  deeplink_store_id?: string | null;
  /** Pills / labels for offer discovery (category, promos, expiry messaging). */
  offer_display_tags?: OfferDisplayTags;
  /**
   * When `true`, the brand is visible to all customers regardless of country.
   * When `false` (default), only customers whose `country` is listed in `countries` see this brand.
   * See `CreateBrandFromAffiliatePayload.is_global` for the full visibility rule.
   */
  is_global?: boolean;
  /** Fallback country variant when a global brand is opened by a user whose country has no dedicated variant. */
  default_country?: string | null;
}

export interface OfferRequestForm {
  logo_desktop: File | null;
  logo_mobile: File | null;
  banner: File | null;
  logo_circle: File | null;
  offer_name_display: string;
  /** Lookup slug used in app-open URLs (persisted as `Offer.lookup_value`). */
  lookup_value: string;
  disabled: boolean;
  max_cap: number | null;
  commission_store: number | null;
  /** Manual entry vs. derived from partner API with −30% (see Commission Management fetch-best). */
  commission_entry_mode: "manual" | "auto";
  id: string;
  banner_mobile: File | null;
  /** Top brands toggle (persisted as extra_store). */
  extra_store: boolean;
  /** Upsize event */
  upsize_start_date: string | null;
  upsize_end_date: string | null;
  upsize_start_time: string | null;
  upsize_end_time: string | null;
  upsize_special_commission: number | null;
  upsize_max_cap: number | null;
  /** Upsize promo scope: one rate for all products (true) vs per-product-line (false). */
  upsize_all_product_types: boolean;
  /** Product lines + commission messaging for the upsize promo (same shape as Product Type rows). */
  upsize_product_types?: OfferProductTypeEntry[];
  /** Product types (name + commission info per row) for this offer */
  product_types?: OfferProductTypeEntry[];
  /** When true, one setup applies to all product types (per-line rows ignored on save). */
  all_product_types: boolean;
  /** Admin commission lines (saved with offer; not from partner API). */
  admin_commission_info?: string[];
  /** Category whose terms & conditions apply; empty string = default (match offer category). */
  policy_category_id: string;
  /** Extra T&C copy for this offer/merchant, additive to category policy. */
  custom_terms: string;
  /** Shown to users in the app; empty = no message. */
  note_to_user: string;
  /** Affiliate network id (`involve_asia`, `optimise`, `accesstrade`, …). */
  affiliate_network_id: string;
  /** Advertiser / market for tracking link targeting (see `DEEPLINK_STORE_OPTIONS`). */
  deeplink_store_id: string;
  offer_display_tags: OfferDisplayTags;
  /** Cashback tracking-period config ('auto' derives from partner validation_terms). */
  tracking_period_mode: "auto" | "manual";
  tracking_days: number | null;
  confirm_days: number | null;
  /** Step-strip flow: 3-step (Purchase→Tracking→Confirm) or combined 2-step. */
  flow_type: "three_step" | "two_step";
  /** Editable step captions; null/empty saves clear back to the defaults. */
  tracking_subtitle: string | null;
  confirm_subtitle: string | null;
}

export interface OffersQuery {
  search?: string;
  limit?: number;
  page?: number;
  category?: string;
  status?: string;
  type?: string;
  country?: string;
}

export interface WithdrawQuery {
  search?: string;
  limit?: number;
  page?: number;
  /** Server-side filter: pending | approved | rejected */
  status?: string;
  /** Server-side filter: e.g. bank_transfer, web3, crypto */
  method?: string;
}

export interface ConversionQuery {
  search?: string;
  limit?: number;
  page?: number;
  status?: string;
  key?: string;
}

export interface OffersResponse {
  data: Offer[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface TopBrandConfigEntry {
  /** Offer Mongo `_id` — the identity curated by the admin panel. */
  offerId: string;
  /** Customer-facing cashback copy shown on the Expo homepage card. */
  cashback: string;
}

/** Curated homepage top-brand rail (admin). Mock: in-memory ordered entries. */
export interface TopBrandsAdminResponse {
  order: string[];
  brands: TopBrandConfigEntry[];
  items: Offer[];
  maxBrands: number;
}

export interface SaveTopBrandsResponse {
  success: boolean;
  brands: TopBrandConfigEntry[];
  message?: string;
}

export interface ResponseWithdraws {
  data: DataWithdrawsList[];
  pagination: Pagination;
}

export interface UserID {
  _id: string;
  address: string;
  email: string;
  username: string;
}
export interface DataWithdrawsList {
  user_id: UserID;
  _id: string;
  address: string;
  account_number: string;
  account_name: string;
  bank_name: string;
  amount_total: number;
  amount_net: number;
  percent_fee: number;
  status: string;
  method: string;
  tx_hash: string;
  conversion_id: number[];
  currency: string;
  createdAt: Date;
  updatedAt: Date;
  __v: number;
  slip_file: string;
  /** "auto" — user signed on-chain; "manual" — MiniPay request, admin pays. */
  withdraw_mode?: "auto" | "manual";
  chain?: string;
  paid_by?: string;
  paid_at?: string | Date;
  /** Server-computed bank-transfer fee breakdown (optional on legacy rows). */
  withdraw_fee_base?: number;
  withdraw_fee_discount?: number;
  withdraw_fee_final?: number;
  coupon_code?: string;
}

export interface ResponseConversion {
  status: string;
  message: string;
  data: DataConversion[];
  pagination: Pagination;
}

export interface DataConversionAll {
  page: number;
  limit: number;
  count: number;
  nextPage: null;
  data: DataConversion[];
}

export interface DataConversion {
  conversion_id: number;
  offer_id: number;
  aff_sub1: null | string;
  aff_sub2: null;
  aff_sub3: null;
  aff_sub4: null;
  aff_sub5: null;
  adv_sub1: string;
  adv_sub2: string;
  adv_sub3: string;
  adv_sub4: null | string;
  adv_sub5: string;
  datetime_conversion: Date;
  conversion_status: string;
  affiliate_remarks: null;
  currency: string;
  sale_amount: string;
  payout: string;
  base_payout: string;
  bonus_payout: string;
  merchant_id: number;
  offer_name: string;
  user?: UserID;
  createdAt: Date;
  updatedAt: Date;
  remark?: string;
}

/** Max-cap mode for global or per-region fee rules. */
export type GlobalMaxCapMode = "percent" | "fixed";

/** Shared per-country fee rule: cashback cap plus withdrawal override. */
export interface FeeWithdrawRegion {
  id: string;
  /** ISO 3166-1 alpha-2 */
  countryCode: string;
  /** ISO 4217 */
  currency: string;
  feeWithdraw: number;
  minimumWithdraw: number;
  /** Regional max cap for offers/brands in this market (optional until API returns it). */
  max_cap_mode?: GlobalMaxCapMode;
  max_cap_percent?: number;
  max_cap_amount?: number;
  max_cap_currency?: string;
}

export interface ResponseFee {
  _id: string;
  system: number;
  // store:            number;
  createdAt: Date;
  updatedAt: Date;
  __v: number;
  minimum_withdraw_thb: number;
  minimum_withdraw_usd: number;
  fee_withdraw_usd: number;
  fee_withdraw_thb: number;
  /** When present, preferred source for multi-country configuration. */
  withdraw_regions?: FeeWithdrawRegion[];
  /** Platform-wide max cap mode (optional until API returns it). */
  global_max_cap_mode?: GlobalMaxCapMode;
  /** When mode is `percent`, cap as a percentage (e.g. 10 for 10%). */
  global_max_cap_percent?: number;
  /** When mode is `fixed`, cap as a monetary amount in `global_max_cap_currency`. */
  global_max_cap_amount?: number;
  /** ISO 4217; used when mode is `fixed`. */
  global_max_cap_currency?: string;
  /** Global withdrawal defaults used when no country override applies. */
  global_withdraw_fee?: number;
  global_minimum_withdraw?: number;
  global_withdraw_currency?: string;
}

export interface FeeSettingsForm {
  system: number;
  // store:            number;
  // minimum_withdraw: number;
  id: string;
  minimum_withdraw_thb: number;
  minimum_withdraw_usd: number;
  fee_withdraw_usd: number;
  fee_withdraw_thb: number;
  withdraw_regions?: FeeWithdrawRegion[];
  global_max_cap_mode: GlobalMaxCapMode;
  global_max_cap_percent: number;
  global_max_cap_amount: number;
  global_max_cap_currency: string;
  global_withdraw_fee: number;
  global_minimum_withdraw: number;
  global_withdraw_currency: string;
}
