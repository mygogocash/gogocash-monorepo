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
  mockCategories,
  mockCoupons,
  mockMyCashback,
  mockWithdrawDetail,
  mockMCBDetail,
} from "@/app/api/mock/data";
import { isMockAdminPasswordAllowed } from "@/lib/mockAuthPolicy";
import {
  AFFILIATE_NETWORKS,
  affiliateNetworkIdForOfferId,
  affiliateNetworkName,
} from "@/data/affiliateNetworks";
import { normalizeOfferProductTypes, type Offer } from "@/types/api";

export type MockApiInput = {
  method: string;
  path: string[];
  searchParams: URLSearchParams;
  /** Parsed JSON body for mutating methods */
  body: unknown | undefined;
};

export type MockApiResult = { status: number; body: unknown };

const ok = (body: unknown): MockApiResult => ({ status: 200, body });
const jsonErr = (status: number, body: unknown): MockApiResult => ({
  status,
  body,
});

const OFFER_NAMES: Record<number, string> = {
  1001: "Shopee TH - CPS",
  1002: "Lazada TH - CPS",
  1003: "Agoda - CPS",
  1004: "GrabFood TH",
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

const MOCK_CREATED_CONVERSIONS_BASE = [
  { offer_id: 1001, offer_name: "Shopee TH - CPS", aff_sub1: "u1", adv_sub2: "order_mock_001", sale_amount: "1500.00", payout: "75.00", currency: "THB", conversion_status: "approved" as const, remark: "Manual add - campaign" },
  { offer_id: 1002, offer_name: "Lazada TH - CPS", aff_sub1: "u1", adv_sub2: "order_mock_002", sale_amount: "3200.50", payout: "128.02", currency: "THB", conversion_status: "pending" as const, remark: "" },
  { offer_id: 1003, offer_name: "Agoda - CPS", aff_sub1: "u2", adv_sub2: "order_mock_003", sale_amount: "450.00", payout: "27.00", currency: "USD", conversion_status: "approved" as const, remark: "Hotel booking" },
  { offer_id: 1004, offer_name: "GrabFood TH", aff_sub1: "u2", adv_sub2: "order_mock_004", sale_amount: "280.00", payout: "8.40", currency: "THB", conversion_status: "rejected" as const, remark: "" },
  { offer_id: 1001, offer_name: "Shopee TH - CPS", aff_sub1: "68bf99fed9667685c1637607", adv_sub2: "order_mock_005", sale_amount: "890.00", payout: "44.50", currency: "THB", conversion_status: "approved" as const, remark: "Created via admin" },
  { offer_id: 1002, offer_name: "Lazada TH - CPS", aff_sub1: "u3", adv_sub2: "order_mock_006", sale_amount: "2100.00", payout: "84.00", currency: "THB", conversion_status: "pending" as const, remark: "Flash sale" },
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

const createdConversionsList: CreatedConversionItem[] = buildMockCreatedConversions();
const policyStore = new Map<string, string>();

/** Mock OTP for admin verification when adding emails / phones on withdraw user (internal demo). */
const MOCK_USER_CONTACT_OTP = "123456";
/** Session keys `userId|channel|target` → expiry ms */
const userContactOtpSessions = new Map<string, number>();

function userContactOtpKey(userId: string, channel: string, normalizedTarget: string) {
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

/** Merges saved profile edits for the mock withdraw-detail user (edits keyed by user _id, not withdraw id in URL). */
function mockWithdrawDetailWithUserEdits() {
  const baseUser = mockWithdrawDetail.user;
  const uid = (baseUser._id || "u1").trim();
  const edits = withdrawDetailUserEdits[uid];
  return {
    ...mockWithdrawDetail,
    user: {
      ...mockWithdrawDetail.user,
      _id: uid,
      ...(edits ?? {}),
    },
  };
}

/** Admin-set app deeplink per offer (commission management). */
const commissionAppDeeplinkByOfferId = new Map<string, string>();

function parseCommissionPercentString(s: string): number | null {
  const m = s.trim().match(/([\d.]+)\s*%/);
  if (m) return parseFloat(m[1]);
  return null;
}

function bestPercentFromPartnerRates(commissions: string[]): number {
  let max = 0;
  for (const c of commissions) {
    const p = parseCommissionPercentString(c);
    if (p != null && p > max) max = p;
  }
  return max;
}

function buildCommissionSuggestedDeeplink(offer: {
  _id: string;
  lookup_value: string;
  currency: string;
  commissions?: string[];
  commission_store: number | null;
}): string {
  const fromPartner = bestPercentFromPartnerRates(offer.commissions ?? []);
  const rate =
    fromPartner > 0 ? fromPartner : (offer.commission_store != null ? offer.commission_store : 0);
  const safeLookup = encodeURIComponent(offer.lookup_value || offer._id);
  const net = affiliateNetworkIdForOfferId(offer._id);
  return `https://gogocash.app/open/offer/${safeLookup}?bestRate=${rate}&currency=${encodeURIComponent(offer.currency || "THB")}&affNetwork=${encodeURIComponent(net)}`;
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

function handleMockGET(
  path: string[],
  joined: string,
  searchParams: URLSearchParams,
): MockApiResult {
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "10");
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
      token: "mock-jwt-token-for-development",
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

  if (joined === "dashboard/stats") {
    return ok({
      gogocashUsers: mockUsers.length,
      mycashbackUsers: mockMyCashback.length,
    });
  }

  if (joined === "dashboard/summary") {
    const withdrawByStatus = { pending: { count: 0, total: 0 }, approved: { count: 0, total: 0 }, rejected: { count: 0, total: 0 } };
    for (const w of mockWithdraws) {
      const status = (w.status?.toLowerCase() || "pending") as keyof typeof withdrawByStatus;
      if (withdrawByStatus[status]) {
        withdrawByStatus[status].count += 1;
        withdrawByStatus[status].total += Number(w.amount_total) || 0;
      }
    }
    let conversionTotalPayout = 0;
    for (const c of mockConversions) {
      conversionTotalPayout += Number(c.payout) || 0;
    }
    return ok({
      conversionCount: mockConversions.length,
      conversionTotalPayout: Math.round(conversionTotalPayout * 100) / 100,
      withdrawByStatus,
    });
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
    return ok(paginate(filtered, page, limit));
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
      filtered = filtered.filter(
        (o) =>
          o.offer_name.toLowerCase().includes(s) ||
          o.offer_name_display.toLowerCase().includes(s),
      );
    }
    return ok(paginateFlat(filtered, page, limit));
  }

  if (joined === "offer/get-category/list") {
    let filtered = mockCategories;
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
    const categoryId = searchParams.get("categoryId");
    if (!categoryId) {
      return jsonErr(400, { message: "categoryId is required" });
    }
    const content = policyStore.get(categoryId) ?? "";
    return ok({ content });
  }

  if (path[0] === "offer" && path[1] === "get-coupon-id") {
    const offerId = path[2];
    const coupons = mockCoupons.filter((c) => c.offer_id._id === offerId);
    return ok(coupons);
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
            ((w.user_id as { username?: string }).username?.toLowerCase().includes(s) ||
              (w.user_id as { email?: string }).email?.toLowerCase().includes(s))),
      );
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
      token: "mock-jwt-token-for-development",
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
      data.push({
        id: o._id,
        name: o.offer_name_display || o.offer_name,
        merchantId: o.merchant_id,
        currency: o.currency,
        partnerRates: o.commissions ?? [],
        adminCommission: o.commission_store,
        trackingLink: o.tracking_link,
        appDeeplink:
          commissionAppDeeplinkByOfferId.get(o._id) ?? buildCommissionSuggestedDeeplink(o),
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
    const admin = mockAdminUsers.find((u) => u.email.toLowerCase() === email) ?? mockAdminUsers[0];
    return ok({
      _id: admin._id,
      username: admin.username,
      email: admin.email,
      password: "hashed",
      createdAt: admin.createdAt,
      updatedAt: admin.updatedAt,
      __v: 0,
      token: "mock-jwt-token-for-development",
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

  if (joined === "admin/list-mycashback-users") {
    const b = body as { page?: number; limit?: number; search?: string };
    const page = Math.max(1, Number(b.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(b.limit) || 12));
    const search = String(b.search ?? "").trim().toLowerCase();
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
    return ok({
      status: "success",
      message: "ok",
      ...paginate(filtered, page, limit),
    });
  }

  if (path[0] === "withdraw" && path[1] === "list-check-admin") {
    return ok(mockWithdrawDetailWithUserEdits());
  }

  if (path[0] === "withdraw" && path[1] === "update-withdraw-user") {
    const b = body as Record<string, unknown>;
    const userId = String(b.userId ?? "").trim();
    if (!userId) {
      return jsonErr(400, { message: "userId is required" });
    }
    const patch: WithdrawDetailUserPatch = { ...withdrawDetailUserEdits[userId] };
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
    if (typeof b.gogopassActive === "boolean") patch.gogopassActive = b.gogopassActive;
    withdrawDetailUserEdits[userId] = patch;
    return ok({
      success: true,
      message: "User profile updated",
      user: mockWithdrawDetailWithUserEdits().user,
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
      return jsonErr(400, { message: "Enter a valid phone number (at least 8 digits)" });
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

  if (joined === "admin/getConversionInWithdraw") {
    return ok({
      status: "success",
      message: "ok",
      data: { page: 1, limit: 10, count: 0, nextPage: null, data: [] },
    });
  }

  if (joined === "offer") {
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
    const conversionId = 600000 + Math.floor(Math.random() * 99999);
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
    const b = body as { email?: string };
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
    const suggestedDeeplink = buildCommissionSuggestedDeeplink(offer);
    return ok({
      bestRatePercent,
      currency: offer.currency,
      suggestedDeeplink,
      trackingModel: offer.commission_tracking,
      partnerRates: offer.commissions ?? [],
      offerName: offer.offer_name_display || offer.offer_name,
      affiliateNetworkId,
      affiliateNetworkName: affiliateNetworkName(affiliateNetworkId),
    });
  }

  return jsonErr(404, { message: `Mock endpoint not found: POST /${joined}` });
}

async function handleMockPUT(
  path: string[],
  joined: string,
  body: unknown,
): Promise<MockApiResult> {
  const b = body as Record<string, unknown> & { categoryId?: string; content?: string };

  if (path[0] === "offer" && path.length === 2) {
    const offer = mockOffers.find((o) => o._id === path[1]);
    return ok({ ...offer, ...b });
  }

  if (path[0] === "admin" && path.length === 2) {
    const user = mockAdminUsers.find((u) => u._id === path[1]);
    return ok({ ...user, ...b });
  }

  if (path[0] === "user" && path.length === 2) {
    const user = mockUsers.find((u) => u._id === path[1]);
    return ok({ ...user, ...b });
  }

  if (joined === "policy") {
    const categoryId = b?.categoryId;
    const content = typeof b?.content === "string" ? b.content : "";
    if (!categoryId) {
      return jsonErr(400, { message: "categoryId is required" });
    }
    policyStore.set(String(categoryId), content);
    return ok({
      success: true,
      message: "Policy saved",
      categoryId,
    });
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
    const item = createdConversionsList.find((c) => c.conversion_id === conversionId);
    if (!item) {
      return jsonErr(404, { message: "Conversion not found or not editable" });
    }
    if (updateBody.conversion_status !== undefined) item.conversion_status = updateBody.conversion_status;
    if (updateBody.sale_amount !== undefined) item.sale_amount = String(updateBody.sale_amount);
    if (updateBody.payout !== undefined) item.payout = String(updateBody.payout);
    if (updateBody.remark !== undefined) item.remark = updateBody.remark;
    if (updateBody.adv_sub2 !== undefined) item.adv_sub2 = updateBody.adv_sub2;
    item.updatedAt = new Date().toISOString();
    return ok({
      message: "Conversion updated successfully",
      conversion_id: conversionId,
    });
  }

  if (path[0] === "admin" && path[1] === "update-fee-rate") {
    return ok({ ...mockFee[0], ...b });
  }

  if (path[0] === "admin" && path[1] === "update-category" && path[2]) {
    const categoryId = path[2];
    const cat = mockCategories.find((c) => c._id === categoryId);
    if (!cat) {
      return jsonErr(404, { message: "Category not found" });
    }
    const body = b as { image?: string; banner?: string };
    if (typeof body.image === "string" && body.image.length > 0) {
      cat.image = body.image;
    }
    if (typeof body.banner === "string" && body.banner.length > 0) {
      cat.banner = body.banner;
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
    const offer = mockOffers.find((o) => o._id === offerId) as Offer | undefined;
    if (!offer) {
      return jsonErr(404, { message: "Offer not found" });
    }
    const b = body as Record<string, string | undefined>;
    if (b.offer_name_display != null) {
      offer.offer_name_display = b.offer_name_display;
    }
    if (b.disabled != null) {
      offer.disabled = b.disabled === "true";
    }
    if (b.commission_store != null && b.commission_store !== "") {
      offer.commission_store = Number(b.commission_store);
    }
    if (b.max_cap != null && b.max_cap !== "") {
      offer.max_cap = Number(b.max_cap);
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
    if (b.upsize_special_commission !== undefined) {
      offer.upsize_special_commission =
        b.upsize_special_commission === "" || b.upsize_special_commission == null
          ? null
          : Number(b.upsize_special_commission);
    }
    if (b.upsize_max_cap !== undefined) {
      offer.upsize_max_cap =
        b.upsize_max_cap === "" || b.upsize_max_cap == null ? null : Number(b.upsize_max_cap);
    }
    if (b.product_types != null) {
      try {
        const parsed: unknown = JSON.parse(b.product_types);
        offer.product_types = normalizeOfferProductTypes(parsed);
      } catch {
        /* ignore invalid JSON */
      }
    }
    if (b.admin_commission_info != null) {
      try {
        const parsed = JSON.parse(b.admin_commission_info) as string[];
        offer.admin_commission_info = Array.isArray(parsed) ? parsed.map((s) => String(s).trim()).filter(Boolean) : [];
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
    if (b.note_to_user !== undefined) {
      const t = (b.note_to_user ?? "").trim();
      offer.note_to_user = t.length > 0 ? t : null;
    }

    offer.datetime_updated = new Date();
    return ok({ success: true, message: "Offer updated", data: offer });
  }

  if (path[0] === "admin" && path[1] === "commission-management" && path[2] === "deeplink") {
    const raw = body as { offerId?: string; deeplink?: string };
    const id = (raw.offerId ?? "").trim();
    const deeplink = (raw.deeplink ?? "").trim();
    if (!id || !deeplink) {
      return jsonErr(400, { message: "offerId and deeplink are required" });
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
  if (path[0] === "admin" && path.length === 2) {
    const id = path[1];
    const index = mockAdminUsers.findIndex((u) => u._id === id);
    if (index !== -1) {
      mockAdminUsers.splice(index, 1);
    }
    return ok({ message: `Deleted admin ${id}` });
  }

  if (path.length === 2) {
    return ok({ message: `Deleted ${path[0]} ${path[1]}` });
  }

  return jsonErr(404, { message: `Mock endpoint not found: DELETE /${joined}` });
}

export async function handleMockApiRequest(input: MockApiInput): Promise<MockApiResult> {
  const { method, path, searchParams, body } = input;
  const joined = path.join("/");
  const m = method.toUpperCase();

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
