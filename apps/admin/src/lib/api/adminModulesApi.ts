import client from "@/lib/axios/client";
import type {
  BlacklistKeyword,
  BoostRule,
  CreditScore,
  DiscoverItem,
  DiscoverSectionType,
  FeaturedSearchTerm,
  MembershipTier,
  MissingOrderClaim,
  Paginated,
  Referral,
  ReferralConfig,
  ScoringConfig,
  Subscription,
  SubscriptionPlan,
  Transaction,
  UserMembership,
  UserWallet,
  WalletAdjustment,
} from "@/types/adminModules";

function qp(obj: Record<string, string | number | undefined>) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === "") continue;
    p.set(k, String(v));
  }
  return p;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function dataArray<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (isRecord(payload) && Array.isArray(payload.data)) {
    return payload.data as T[];
  }
  return [];
}

function numberOrDefault(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function emptyPage<T>(page = 1, limit = 10): Paginated<T> {
  return {
    data: [],
    page,
    limit,
    total: 0,
    totalPages: 0,
  };
}

function paginated<T>(
  payload: unknown,
  params: { page?: number; limit?: number } = {},
): Paginated<T> {
  const page = params.page ?? 1;
  const limit = params.limit ?? 10;

  if (Array.isArray(payload)) {
    return {
      data: payload as T[],
      page,
      limit,
      total: payload.length,
      totalPages: payload.length > 0 ? Math.ceil(payload.length / limit) : 0,
    };
  }

  if (!isRecord(payload)) return emptyPage<T>(page, limit);

  const rows = dataArray<T>(payload);
  return {
    data: rows,
    page: numberOrDefault(payload.page, page),
    limit: numberOrDefault(payload.limit, limit),
    total: numberOrDefault(payload.total, rows.length),
    totalPages: numberOrDefault(
      payload.totalPages,
      rows.length > 0 ? Math.ceil(rows.length / limit) : 0,
    ),
  };
}

function isNotFound(error: unknown): boolean {
  if (isRecord(error) && error.status === 404) return true;
  return (
    isRecord(error) && isRecord(error.response) && error.response.status === 404
  );
}

/* Credit score */
export async function getCreditScores(params: {
  page?: number;
  limit?: number;
  search?: string;
  tier?: string;
  minScore?: number;
  maxScore?: number;
}) {
  const { data } = await client.get<Paginated<CreditScore>>(
    "/admin/credit-scores",
    {
      params: qp(params),
    },
  );
  return paginated<CreditScore>(data, params);
}

export async function getCreditScoreConfig() {
  const { data } = await client.get<ScoringConfig>(
    "/admin/credit-scores/config",
  );
  return data;
}

export async function putCreditScoreConfig(body: ScoringConfig) {
  const { data } = await client.put<{
    success: boolean;
    config: ScoringConfig;
  }>("/admin/credit-scores/config", body);
  return data;
}

export async function getCreditScoreDetail(userId: string) {
  if (!userId) return null;
  try {
    const { data } = await client.get<CreditScore | null>(
      `/admin/credit-scores/${userId}`,
    );
    return isRecord(data) ? (data as CreditScore) : null;
  } catch (error) {
    if (isNotFound(error)) return null;
    throw error;
  }
}

export async function getCreditScoreAudit(userId: string) {
  if (!userId) return [];
  try {
    const { data } = await client.get<{
      data?: {
        adminId: string;
        fromScore: number;
        toScore: number;
        reason: string;
        timestamp: string;
      }[];
    }>(`/admin/credit-scores/${userId}/audit`);
    return dataArray<{
      adminId: string;
      fromScore: number;
      toScore: number;
      reason: string;
      timestamp: string;
    }>(data);
  } catch (error) {
    if (isNotFound(error)) return [];
    throw error;
  }
}

export async function putCreditScoreOverride(
  userId: string,
  body: { newScore: number; reason: string; adminId: string },
) {
  const { data } = await client.put(
    `/admin/credit-scores/${userId}/override`,
    body,
  );
  return data;
}

/* Membership */
export async function getMembershipStats() {
  const { data } = await client.get<{
    totalActiveMembers: number;
    revenueMtd: number;
    churnRate: number;
    newThisMonth: number;
  }>("/admin/membership/stats");
  return data;
}

export async function getMembershipTiers() {
  const { data } = await client.get<{ data: MembershipTier[] }>(
    "/admin/membership/tiers",
  );
  return dataArray<MembershipTier>(data);
}

export async function postMembershipTier(
  body: Omit<MembershipTier, "id" | "memberCount"> & { memberCount?: number },
) {
  const { data } = await client.post<MembershipTier>(
    "/admin/membership/tiers",
    body,
  );
  return data;
}

export async function putMembershipTier(
  id: string,
  body: Partial<MembershipTier>,
) {
  const { data } = await client.put<MembershipTier>(
    `/admin/membership/tiers/${id}`,
    body,
  );
  return data;
}

export async function deleteMembershipTier(id: string) {
  const { data } = await client.delete(`/admin/membership/tiers/${id}`);
  return data;
}

export async function getMembershipUsers(params: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  tierId?: string;
  sort?: string;
  autoRenew?: string;
}) {
  const { data } = await client.get<Paginated<UserMembership>>(
    "/admin/membership/users",
    {
      params: qp(params),
    },
  );
  return paginated<UserMembership>(data, params);
}

export async function putMembershipUserTier(userId: string, tierId: string) {
  const { data } = await client.put(`/admin/membership/users/${userId}/tier`, {
    tierId,
  });
  return data;
}

export async function putMembershipUserCancel(userId: string) {
  const { data } = await client.put(
    `/admin/membership/users/${userId}/cancel`,
    {},
  );
  return data;
}

export async function putMembershipUserAction(
  userId: string,
  action: "cancel" | "pause" | "resume" | "extend",
  body?: { days?: number },
) {
  const { data } = await client.put(
    `/admin/membership/users/${userId}/${action}`,
    body ?? {},
  );
  return data;
}

/* Subscription */
export async function getSubscriptionStats() {
  const { data } = await client.get<{
    totalVolumeToday: number;
    totalVolumeMtd: number;
    avgTransactionValue: number;
    flaggedCount: number;
  }>("/admin/subscription/stats");
  return data;
}

export async function getSubscriptionPlans() {
  const { data } = await client.get<{ data: SubscriptionPlan[] }>(
    "/admin/subscription/plans",
  );
  return dataArray<SubscriptionPlan>(data);
}

export async function postSubscriptionPlan(body: SubscriptionPlan) {
  const { data } = await client.post<SubscriptionPlan>(
    "/admin/subscription/plans",
    body,
  );
  return data;
}

export async function putSubscriptionPlan(
  id: string,
  body: Partial<SubscriptionPlan>,
) {
  const { data } = await client.put<SubscriptionPlan>(
    `/admin/subscription/plans/${id}`,
    body,
  );
  return data;
}

export async function deleteSubscriptionPlan(id: string) {
  const { data } = await client.delete(`/admin/subscription/plans/${id}`);
  return data;
}

export async function getSubscriptions(params: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  plan?: string;
  autoRenew?: string;
}) {
  const { data } = await client.get<Paginated<Subscription>>(
    "/admin/subscription/subscriptions",
    {
      params: qp(params),
    },
  );
  return paginated<Subscription>(data, params);
}

export async function getSubscriptionDetail(id: string) {
  const { data } = await client.get<
    Subscription & {
      billingHistory: { date: string; amount: number; status: string }[];
    }
  >(`/admin/subscription/subscriptions/${id}`);
  return data;
}

export async function putSubscriptionAction(
  id: string,
  action: "cancel" | "pause" | "resume" | "extend",
  body?: { days?: number },
) {
  const { data } = await client.put(
    `/admin/subscription/subscriptions/${id}/${action}`,
    body ?? {},
  );
  return data;
}

/* Referral */
export async function getReferralConfig() {
  const { data } = await client.get<ReferralConfig>("/admin/referral/config");
  return data;
}

export async function putReferralConfig(body: Partial<ReferralConfig>) {
  const { data } = await client.put<ReferralConfig>(
    "/admin/referral/config",
    body,
  );
  return data;
}

export async function getReferrals(params: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}) {
  const { data } = await client.get<Paginated<Referral>>("/admin/referrals", {
    params: qp(params),
  });
  return data;
}

export async function getReferralTree(userId: string) {
  const { data } = await client.get(`/admin/referrals/${userId}/tree`);
  return data;
}

export async function putReferralApprove(id: string) {
  const { data } = await client.put(`/admin/referrals/${id}/approve`, {});
  return data;
}

export async function putReferralReject(id: string) {
  const { data } = await client.put(`/admin/referrals/${id}/reject`, {});
  return data;
}

/* Missing orders */
export async function getMissingOrderStats() {
  const { data } = await client.get<{
    pendingReview: number;
    approvedWeek: number;
    rejectedWeek: number;
    avgResolutionHours: number;
  }>("/admin/missing-orders/stats");
  return data;
}

export async function getMissingOrders(params: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  from?: string;
  to?: string;
}) {
  const { data } = await client.get<Paginated<MissingOrderClaim>>(
    "/admin/missing-orders",
    {
      params: qp(params),
    },
  );
  return data;
}

export async function getMissingOrderDetail(id: string) {
  const { data } = await client.get<MissingOrderClaim>(
    `/admin/missing-orders/${id}`,
  );
  return data;
}

export async function putMissingOrderApprove(id: string) {
  const { data } = await client.put(`/admin/missing-orders/${id}/approve`, {});
  return data;
}

export async function putMissingOrderReject(id: string) {
  const { data } = await client.put(`/admin/missing-orders/${id}/reject`, {});
  return data;
}

export async function putMissingOrderAssign(id: string, assignee: string) {
  const { data } = await client.put(`/admin/missing-orders/${id}/assign`, {
    assignee,
  });
  return data;
}

export async function postMissingOrderNote(
  id: string,
  note: string,
  adminId: string,
  adminName: string,
) {
  const { data } = await client.post(`/admin/missing-orders/${id}/notes`, {
    note,
    adminId,
    adminName,
  });
  return data;
}

/* Wallet */
export async function getWalletDetail(userId: string) {
  const { data } = await client.get<{
    wallet: UserWallet;
    recentTransactions: Transaction[];
  }>(`/admin/wallets/${userId}`);
  return data;
}

export async function getWalletAdjustments(userId: string) {
  const { data } = await client.get<{ data: WalletAdjustment[] }>(
    `/admin/wallets/${userId}/adjustments`,
  );
  return data.data;
}

export async function putWalletFreeze(userId: string) {
  const { data } = await client.put(`/admin/wallets/${userId}/freeze`, {});
  return data;
}

export async function putWalletUnfreeze(userId: string) {
  const { data } = await client.put(`/admin/wallets/${userId}/unfreeze`, {});
  return data;
}

export async function postWalletAdjust(
  userId: string,
  body: {
    type: "credit" | "debit";
    amount: number;
    currency: WalletAdjustment["currency"];
    reason: string;
    adminId: string;
  },
) {
  const { data } = await client.post(`/admin/wallets/${userId}/adjust`, body);
  return data;
}

export async function resolveCashbackRequest(
  conversionId: number,
  action: "approve" | "reject",
  reason?: string,
) {
  const { data } = await client.post(
    `/admin/wallets/cashback-request/${conversionId}`,
    { action, reason },
  );
  return data;
}

/* Transactions */
export async function getTransactions(params: {
  page?: number;
  limit?: number;
  search?: string;
  type?: string;
  status?: string;
}) {
  const { data } = await client.get<Paginated<Transaction>>(
    "/admin/transactions",
    {
      params: qp(params),
    },
  );
  return data;
}

export async function getTransactionExport() {
  const { data } = await client.get<{ csv: string }>(
    "/admin/transactions/export",
  );
  return data;
}

export async function getTransactionDetail(id: string) {
  const { data } = await client.get<Transaction>(`/admin/transactions/${id}`);
  return data;
}

export async function putTransactionFlag(
  id: string,
  flagged: boolean,
  reason: string,
) {
  const { data } = await client.put(`/admin/transactions/${id}/flag`, {
    flagged,
    reason,
  });
  return data;
}

/* Discover */
export async function getDiscoverSections() {
  const { data } = await client.get<{
    sections: {
      id: string;
      type: DiscoverSectionType;
      items: DiscoverItem[];
    }[];
  }>("/admin/discover/sections");
  return data.sections;
}

export async function putDiscoverReorder(
  type: DiscoverSectionType,
  order: string[],
) {
  const { data } = await client.put(
    `/admin/discover/sections/${type}/reorder`,
    { order },
  );
  return data;
}

export async function postDiscoverItem(
  type: DiscoverSectionType,
  body: Partial<DiscoverItem>,
) {
  const { data } = await client.post<DiscoverItem>(
    `/admin/discover/sections/${type}/items`,
    body,
  );
  return data;
}

export async function putDiscoverItem(
  type: DiscoverSectionType,
  id: string,
  body: Partial<DiscoverItem>,
) {
  const { data } = await client.put(
    `/admin/discover/sections/${type}/items/${id}`,
    body,
  );
  return data;
}

export async function deleteDiscoverItem(
  type: DiscoverSectionType,
  id: string,
) {
  const { data } = await client.delete(
    `/admin/discover/sections/${type}/items/${id}`,
  );
  return data;
}

/* Search */
export async function getFeaturedTerms() {
  const { data } = await client.get<{ data: FeaturedSearchTerm[] }>(
    "/admin/search/featured-terms",
  );
  return data.data;
}

export async function postFeaturedTerm(body: Partial<FeaturedSearchTerm>) {
  const { data } = await client.post<FeaturedSearchTerm>(
    "/admin/search/featured-terms",
    body,
  );
  return data;
}

export async function putFeaturedTerm(
  id: string,
  body: Partial<FeaturedSearchTerm>,
) {
  const { data } = await client.put(`/admin/search/featured-terms/${id}`, body);
  return data;
}

export async function deleteFeaturedTerm(id: string) {
  const { data } = await client.delete(`/admin/search/featured-terms/${id}`);
  return data;
}

export async function putFeaturedTermsReorder(order: string[]) {
  const { data } = await client.put("/admin/search/featured-terms/reorder", {
    order,
  });
  return data;
}

export async function getBoostRules() {
  const { data } = await client.get<{ data: BoostRule[] }>(
    "/admin/search/boost-rules",
  );
  return data.data;
}

export async function postBoostRule(body: Partial<BoostRule>) {
  const { data } = await client.post<BoostRule>(
    "/admin/search/boost-rules",
    body,
  );
  return data;
}

export async function putBoostRule(id: string, body: Partial<BoostRule>) {
  const { data } = await client.put(`/admin/search/boost-rules/${id}`, body);
  return data;
}

export async function deleteBoostRule(id: string) {
  const { data } = await client.delete(`/admin/search/boost-rules/${id}`);
  return data;
}

export async function getSearchBlacklist() {
  const { data } = await client.get<{ data: BlacklistKeyword[] }>(
    "/admin/search/blacklist",
  );
  return data.data;
}

export async function postSearchBlacklist(body: Partial<BlacklistKeyword>) {
  const { data } = await client.post<BlacklistKeyword>(
    "/admin/search/blacklist",
    body,
  );
  return data;
}

export async function deleteSearchBlacklist(id: string) {
  const { data } = await client.delete(`/admin/search/blacklist/${id}`);
  return data;
}

export async function postSearchBlacklistImport(keywords: string[]) {
  const { data } = await client.post("/admin/search/blacklist/import", {
    keywords,
  });
  return data;
}
