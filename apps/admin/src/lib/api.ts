import {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  ApiError,
  AdminUsersQuery,
  AdminUsersResponse,
  DataAdminUsers,
  AdminDeleteResponse,
  AdminCreateInput,
  RoleDef,
  RolesResponse,
  RegularUser,
  UsersQuery,
  UsersResponse,
  DashboardStatsResponse,
  DashboardSummaryResponse,
  DashboardInsightsResponse,
  DashboardInsightRange,
  Offer,
  OffersQuery,
  OffersResponse,
  TopBrandConfigEntry,
  TopBrandsAdminResponse,
  SaveTopBrandsPayload,
  SaveTopBrandsResponse,
  LandingRailsAdminResponse,
  SaveLandingRailsPayload,
  SaveLandingRailsResponse,
  WithdrawQuery,
  ResponseWithdraws,
  ConversionQuery,
  ResponseConversion,
  ResponseFee,
  FeeSettingsForm,
} from "@/types/api";
import type { Permission } from "@/lib/rbac";
import { friendlyStatusMessage } from "@/lib/getApiErrorMessage";
import {
  SIGN_IN_PATH,
  shouldRedirectToSignInOn401,
} from "@/lib/axios/sessionRedirect";
import {
  resolveAdminApiBaseURL,
  resolveAdminRuntimeApiUrl,
} from "@/lib/backendProxy";
import { isStaticHostingClient } from "@/lib/isStaticHostingClient";
import { AxiosRequestConfig } from "axios";

type DashboardEndpoint = "stats" | "summary" | "insights";

const DASHBOARD_UPGRADE_MESSAGE =
  "Dashboard data is temporarily unavailable during an API upgrade. Please retry after the API deployment completes.";

/**
 * Raised when Admin and API dashboard contracts do not belong to the same
 * release. Keeping this distinct from transport errors lets the UI fail closed
 * instead of presenting legacy fields as zero-valued business data.
 */
export class DashboardResponseCompatibilityError extends Error {
  readonly code = "DASHBOARD_API_INCOMPATIBLE";

  constructor(readonly endpoint: DashboardEndpoint) {
    super(DASHBOARD_UPGRADE_MESSAGE);
    this.name = "DashboardResponseCompatibilityError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function hasFiniteNumbers(value: unknown, keys: readonly string[]): boolean {
  return isRecord(value) && keys.every((key) => isFiniteNumber(value[key]));
}

function isNullableFiniteNumber(value: unknown): value is number | null {
  return value === null || isFiniteNumber(value);
}

function isPeriod(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.from === "string" &&
    typeof value.to === "string"
  );
}

function isWithdrawBucket(value: unknown): boolean {
  return (
    isRecord(value) &&
    hasFiniteNumbers(value, ["count", "total"]) &&
    (value.oldestAt === undefined ||
      value.oldestAt === null ||
      typeof value.oldestAt === "string")
  );
}

function isWithdrawByStatus(value: unknown): boolean {
  return (
    isRecord(value) &&
    isWithdrawBucket(value.pending) &&
    isWithdrawBucket(value.approved) &&
    isWithdrawBucket(value.rejected)
  );
}

function isAvailabilityEntry(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.available === "boolean" &&
    typeof value.reason === "string"
  );
}

function isDashboardAvailability(value: unknown): boolean {
  return (
    isRecord(value) &&
    isAvailabilityEntry(value.clicks) &&
    isAvailabilityEntry(value.commissionHealth) &&
    isAvailabilityEntry(value.quests)
  );
}

function isKpiSnapshot(value: unknown): boolean {
  return hasFiniteNumbers(value, [
    "gogocashUsers",
    "mycashbackUsers",
    "conversionCount",
    "conversionTotalPayout",
    "conversionTotalSaleAmount",
  ]);
}

function isKpiBlock(value: unknown): boolean {
  return (
    isRecord(value) &&
    isKpiSnapshot(value.current) &&
    (value.prior === null || isKpiSnapshot(value.prior)) &&
    isFiniteNumber(value.newUsersInPeriod)
  );
}

function isStatisticsBundle(value: unknown): boolean {
  if (
    !isRecord(value) ||
    !Array.isArray(value.categories) ||
    !value.categories.every((category) => typeof category === "string") ||
    !Array.isArray(value.series) ||
    typeof value.description !== "string"
  ) {
    return false;
  }
  const expectedSeries = [
    "Clicks",
    "Conversions",
    "Sale Amount",
    "Estimated Earnings",
  ];
  const categoryCount = value.categories.length;
  return (
    value.series.length === expectedSeries.length &&
    value.series.every(
      (series, index) =>
        isRecord(series) &&
        series.name === expectedSeries[index] &&
        Array.isArray(series.data) &&
        series.data.length === categoryCount &&
        series.data.every(isFiniteNumber),
    )
  );
}

function isStatisticsByTab(value: unknown): boolean {
  return (
    isRecord(value) &&
    ["day", "week", "month", "quarter", "year"].every((tab) =>
      isStatisticsBundle(value[tab]),
    )
  );
}

function isNumberRecord(value: unknown): boolean {
  return isRecord(value) && Object.values(value).every(isFiniteNumber);
}

function isDashboardAlert(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    ["low", "medium", "high"].includes(String(value.severity)) &&
    typeof value.title === "string" &&
    typeof value.body === "string" &&
    typeof value.href === "string" &&
    (value.metric === undefined || typeof value.metric === "string") &&
    (value.deltaPct === undefined || isFiniteNumber(value.deltaPct))
  );
}

function isDashboardTopOffer(value: unknown): boolean {
  return (
    isRecord(value) &&
    isFiniteNumber(value.offerId) &&
    typeof value.offerName === "string" &&
    isFiniteNumber(value.merchantId) &&
    typeof value.networkId === "string" &&
    typeof value.providerAccount === "string" &&
    hasFiniteNumbers(value, ["conversions", "gmv", "payout"]) &&
    value.currency === "THB"
  );
}

function isDashboardNetwork(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.networkId === "string" &&
    typeof value.networkName === "string" &&
    hasFiniteNumbers(value, ["offersCount", "conversions", "gmv", "payout"]) &&
    value.currency === "THB"
  );
}

function isQuestFunnel(value: unknown): boolean {
  return hasFiniteNumbers(value, [
    "viewed",
    "joined",
    "tasksStarted",
    "fullyCompleted",
  ]);
}

function isQuestLifecycle(value: unknown): boolean {
  return ["live", "scheduled", "ended"].includes(String(value));
}

function isQuestRow(value: unknown): boolean {
  return (
    isRecord(value) &&
    ["id", "status", "rewardStatus", "startDate", "endDate"].every(
      (key) => typeof value[key] === "string",
    ) &&
    hasFiniteNumbers(value, [
      "taskCount",
      "participantCount",
      "activeParticipants",
      "pointsIssued",
      "taskOfferCount",
      "taskMerchantCount",
      "conditionalTaskCount",
      "attributedConversions",
      "attributedGmv",
      "attributedPayout",
    ]) &&
    isQuestLifecycle(value.lifecycle) &&
    typeof value.overlapsSelectedRange === "boolean" &&
    isQuestFunnel(value.funnel) &&
    typeof value.channelFacebook === "boolean" &&
    typeof value.channelLine === "boolean" &&
    typeof value.channelBanner === "boolean" &&
    isNullableFiniteNumber(value.daysUntilEnd)
  );
}

function isQuestTimelineRow(value: unknown): boolean {
  return (
    isRecord(value) &&
    ["id", "shortId", "startDate", "endDate"].every(
      (key) => typeof value[key] === "string",
    ) &&
    isQuestLifecycle(value.lifecycle) &&
    isFiniteNumber(value.progressThroughSchedulePct)
  );
}

function isQuestLeaderboard(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.questId === "string" &&
    typeof value.questShortId === "string" &&
    Array.isArray(value.rows) &&
    value.rows.every(
      (row) =>
        isRecord(row) &&
        isFiniteNumber(row.rank) &&
        typeof row.label === "string" &&
        isFiniteNumber(row.points),
    )
  );
}

function isQuestMetrics(value: unknown): boolean {
  if (
    !isRecord(value) ||
    !hasFiniteNumbers(value, [
      "totalQuests",
      "liveNow",
      "scheduled",
      "ended",
      "overlappingSelectedRange",
      "totalParticipantsInOverlapping",
    ]) ||
    !Array.isArray(value.rows) ||
    !value.rows.every(isQuestRow) ||
    !Array.isArray(value.timeline) ||
    !value.timeline.every(isQuestTimelineRow) ||
    !hasFiniteNumbers(value.engagement, [
      "enrolledInOverlapping",
      "activeInOverlapping",
      "fullCompletesInOverlapping",
      "pointsIssuedInOverlapping",
    ]) ||
    !isRecord(value.attribution) ||
    !hasFiniteNumbers(value.attribution, [
      "attributedConversionsInPeriod",
      "attributedGmvInPeriod",
      "attributedPayoutInPeriod",
    ]) ||
    !isNullableFiniteNumber(value.attribution.shareOfPeriodConversionsPct) ||
    !isQuestFunnel(value.funnelTotals) ||
    !hasFiniteNumbers(value.taskMix, [
      "offerTasks",
      "merchantTasks",
      "conditionalTasks",
    ]) ||
    !hasFiniteNumbers(value.channels, [
      "questsWithFacebook",
      "questsWithLine",
      "questsWithBanner",
    ])
  ) {
    return false;
  }
  return (
    value.leaderboardPreview === null ||
    isQuestLeaderboard(value.leaderboardPreview)
  );
}

function decodeDashboardStats(value: unknown): DashboardStatsResponse {
  if (!hasFiniteNumbers(value, ["gogocashUsers", "mycashbackUsers"])) {
    throw new DashboardResponseCompatibilityError("stats");
  }
  return value as unknown as DashboardStatsResponse;
}

function decodeDashboardSummary(value: unknown): DashboardSummaryResponse {
  const valid =
    isRecord(value) &&
    value.currency === "THB" &&
    hasFiniteNumbers(value, ["conversionCount", "conversionTotalPayout"]) &&
    (value.conversionTotalSaleAmount === undefined ||
      isFiniteNumber(value.conversionTotalSaleAmount)) &&
    isWithdrawByStatus(value.withdrawByStatus) &&
    (value.period === undefined || isPeriod(value.period)) &&
    (value.lastUpdated === undefined ||
      typeof value.lastUpdated === "string") &&
    (value.priorPeriod === undefined ||
      (isRecord(value.priorPeriod) &&
        hasFiniteNumbers(value.priorPeriod, [
          "conversionCount",
          "conversionTotalPayout",
        ]) &&
        (value.priorPeriod.conversionTotalSaleAmount === undefined ||
          isFiniteNumber(value.priorPeriod.conversionTotalSaleAmount))));
  if (!valid) throw new DashboardResponseCompatibilityError("summary");
  return value as unknown as DashboardSummaryResponse;
}

function decodeDashboardInsights(value: unknown): DashboardInsightsResponse {
  const valid =
    isRecord(value) &&
    typeof value.lastUpdated === "string" &&
    typeof value.range === "string" &&
    value.currency === "THB" &&
    isDashboardAvailability(value.availability) &&
    isPeriod(value.period) &&
    isKpiBlock(value.kpis) &&
    isWithdrawByStatus(value.withdrawByStatus) &&
    isRecord(value.withdrawMetrics) &&
    isNullableFiniteNumber(value.withdrawMetrics.approvalRatePct) &&
    isFiniteNumber(value.withdrawMetrics.pendingOver48hCount) &&
    isNullableFiniteNumber(value.withdrawMetrics.rejectedSharePct) &&
    isNumberRecord(value.conversionsByStatus) &&
    isNullableFiniteNumber(value.payoutRatio) &&
    Array.isArray(value.topOffers) &&
    value.topOffers.every(isDashboardTopOffer) &&
    Array.isArray(value.networkBreakdown) &&
    value.networkBreakdown.every(isDashboardNetwork) &&
    hasFiniteNumbers(value.commissionHealth, [
      "missingAdminCap",
      "missingPartnerCap",
      "adminOverPartner",
    ]) &&
    Array.isArray(value.alerts) &&
    value.alerts.every(isDashboardAlert) &&
    typeof value.insightSummary === "string" &&
    isStatisticsByTab(value.statistics) &&
    isQuestMetrics(value.quests);
  if (!valid) throw new DashboardResponseCompatibilityError("insights");
  return value as unknown as DashboardInsightsResponse;
}

class ApiClient {
  private getRuntimeApiUrl(): string | undefined {
    const isBrowser = typeof window !== "undefined";
    return resolveAdminRuntimeApiUrl({
      isBrowser,
      publicApiUrl: process.env.NEXT_PUBLIC_API_URL,
      serverApiUrl: process.env["API_URL"],
    });
  }

  private getBaseURL(): string {
    const isBrowser = typeof window !== "undefined";
    return resolveAdminApiBaseURL({
      realApiUrl: this.getRuntimeApiUrl(),
      isBrowser,
      appOrigin: process.env.NEXTAUTH_URL || "http://localhost:3000",
    });
  }

  private get isRealApi(): boolean {
    return Boolean(this.getRuntimeApiUrl());
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const axios = await import("axios");
    const baseURL = this.getBaseURL();
    const url = `${baseURL}${endpoint}`;

    const method = (options.method || "GET").toUpperCase();
    let parsedBody: unknown = undefined;
    if (options.body) {
      try {
        parsedBody = JSON.parse(options.body as string);
      } catch {
        parsedBody = undefined;
      }
    }

    const headers = {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...options.headers,
    } as Record<string, string>;

    // Browser real-API traffic uses the BFF; never attach Bearer from getSession.
    if (typeof window !== "undefined" && this.isRealApi) {
      for (const key of Object.keys(headers)) {
        if (key.toLowerCase() === "authorization") {
          delete headers[key];
        }
      }
    }

    const config = {
      url,
      method,
      headers,
      data: parsedBody,
    };

    if (
      !this.isRealApi &&
      typeof window !== "undefined" &&
      isStaticHostingClient()
    ) {
      const { handleMockApiRequest } = await import("@/lib/mockApiCore");
      const u = new URL(url, window.location.origin);
      const prefix = "/api/mock";
      const pathname = u.pathname;
      const rest = pathname.startsWith(prefix)
        ? pathname.slice(prefix.length).replace(/^\/+/, "")
        : pathname.replace(/^\/+/, "");
      const pathSegments = rest ? rest.split("/").filter(Boolean) : [];
      const result = await handleMockApiRequest({
        method,
        path: pathSegments,
        searchParams: u.searchParams,
        body: parsedBody,
      });
      if (result.status >= 400) {
        const data = result.body as { message?: string; errors?: unknown };
        const apiError: ApiError = {
          message: data?.message || friendlyStatusMessage(result.status),
          status: result.status,
          errors: data?.errors as ApiError["errors"],
        };
        throw apiError;
      }
      return result.body as T;
    }

    try {
      const response = await axios.default(config as AxiosRequestConfig);
      return response.data;
    } catch (error) {
      if (axios.default.isAxiosError(error) && error.response) {
        // Session-expiry recovery: a 401 through the BFF means the NextAuth
        // session is gone — send the browser back to sign-in (same behavior
        // as the shared axios client) instead of stranding the user among
        // inline error banners. The mapped error is still thrown for callers.
        if (
          typeof window !== "undefined" &&
          shouldRedirectToSignInOn401({
            status: error.response.status,
            realApi: this.isRealApi,
            isBrowser: true,
            pathname: window.location.pathname,
            data: error.response.data,
          })
        ) {
          window.location.assign(SIGN_IN_PATH);
        }
        // Prefer the backend's own message (RolesGuard etc.); otherwise use
        // plain, status-aware copy — never a raw "HTTP Error 403".
        // Preserve Nest structured `code`/`reason` so getApiErrorMessage can
        // append ops-actionable detail for POLICY_* 503s (#407).
        const data = error.response.data as
          | {
              message?: string | string[];
              errors?: Record<string, string[]>;
              code?: string;
              reason?: string;
            }
          | undefined;
        const rawMessage = data?.message;
        const message = Array.isArray(rawMessage)
          ? rawMessage.filter((part) => typeof part === "string").join(", ") ||
            friendlyStatusMessage(error.response.status)
          : rawMessage || friendlyStatusMessage(error.response.status);
        throw Object.assign(new Error(message), {
          status: error.response.status,
          errors: data?.errors,
          ...(typeof data?.code === "string" ? { code: data.code } : {}),
          ...(typeof data?.reason === "string" ? { reason: data.reason } : {}),
        } satisfies Partial<ApiError>);
      }

      // No HTTP response reached us (offline, DNS, CORS, timeout). Never surface
      // the raw transport string — show a friendly, actionable message. Still an
      // Error instance so `instanceof Error` narrowing / global handlers work.
      throw Object.assign(
        new Error(
          "Couldn't reach the server. Check your connection and try again.",
        ),
        {
          status: 0,
        } satisfies Partial<ApiError>,
      );
    }
  }

  // Authentication endpoints
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    return this.request<LoginResponse>("/admin/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    });
  }

  async register(userData: RegisterRequest): Promise<RegisterResponse> {
    return this.request<RegisterResponse>("/admin/register", {
      method: "POST",
      body: JSON.stringify(userData),
    });
  }

  async logout(token?: string): Promise<{ message: string }> {
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    return this.request<{ message: string }>("/auth/logout", {
      method: "POST",
      headers,
    });
  }

  async getProfile(token?: string): Promise<LoginResponse> {
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    return this.request<LoginResponse>("/auth/profile", {
      method: "GET",
      headers,
    });
  }

  async refreshToken(token: string): Promise<{ token: string }> {
    return this.request<{ token: string }>("/auth/refresh", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  // Password reset endpoints (admin accounts, backed by Resend emails)
  async requestPasswordReset(email: string): Promise<{ message: string }> {
    return this.request<{ message: string }>("/admin/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  }

  async resetPassword(data: {
    email: string;
    token: string;
    password: string;
    password_confirmation?: string;
  }): Promise<{ message: string }> {
    return this.request<{ message: string }>("/admin/reset-password", {
      method: "POST",
      body: JSON.stringify({
        email: data.email,
        token: data.token,
        password: data.password,
      }),
    });
  }

  // Accept an admin invite: create the account from an invite token.
  async acceptInvite(data: {
    email: string;
    token: string;
    password: string;
    username?: string;
  }): Promise<{ message: string }> {
    return this.request<{ message: string }>("/admin/accept-invite", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  // User management endpoints
  async updateProfile(
    userData: Partial<{ name: string; email: string; avatar: string }>,
    token?: string,
  ): Promise<LoginResponse> {
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    return this.request<LoginResponse>("/user/profile", {
      method: "PUT",
      headers,
      body: JSON.stringify(userData),
    });
  }

  async changePassword(
    passwordData: {
      current_password: string;
      password: string;
      password_confirmation: string;
    },
    token?: string,
  ): Promise<{ message: string }> {
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    return this.request<{ message: string }>("/user/change-password", {
      method: "POST",
      headers,
      body: JSON.stringify(passwordData),
    });
  }

  // Generic API method for custom endpoints
  async get<T>(endpoint: string, token?: string): Promise<T> {
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    return this.request<T>(endpoint, {
      method: "GET",
      headers,
    });
  }

  async post<T>(
    endpoint: string,
    data: Record<string, unknown>,
    token?: string,
  ): Promise<T> {
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    return this.request<T>(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(data),
    });
  }

  async put<T>(
    endpoint: string,
    data: Record<string, unknown>,
    token?: string,
  ): Promise<T> {
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    return this.request<T>(endpoint, {
      method: "PUT",
      headers,
      body: JSON.stringify(data),
    });
  }

  async delete<T>(endpoint: string, token?: string): Promise<T> {
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    return this.request<T>(endpoint, {
      method: "DELETE",
      headers,
    });
  }

  // Admin User Management
  async getAdminUsers(
    query: AdminUsersQuery = {},
    token?: string,
  ): Promise<AdminUsersResponse> {
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    // Build query parameters
    const params = new URLSearchParams();
    if (query.limit) params.append("limit", query.limit.toString());
    if (query.page) params.append("page", query.page.toString());
    if (query.search) params.append("search", query.search);
    if (query.role) params.append("role", query.role);
    if (query.status) params.append("status", query.status);

    const queryString = params.toString();
    const endpoint = queryString ? `/admin?${queryString}` : "/admin";

    return this.request<AdminUsersResponse>(endpoint, {
      method: "GET",
      headers,
    });
  }

  async getAdminUser(
    userId: string,
    token?: string,
  ): Promise<AdminUsersResponse> {
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    return this.request<AdminUsersResponse>(`/admin/${userId}`, {
      method: "GET",
      headers,
    });
  }

  async createAdminUser(
    userData: AdminCreateInput,
    token?: string,
  ): Promise<DataAdminUsers> {
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    return this.request<DataAdminUsers>("/admin", {
      method: "POST",
      headers,
      body: JSON.stringify(userData),
    });
  }

  async updateAdminUser(
    userId: string,
    userData: Partial<
      Omit<DataAdminUsers, "_id" | "createdAt" | "updatedAt" | "__v">
    >,
    token?: string,
  ): Promise<DataAdminUsers> {
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    return this.request<DataAdminUsers>(`/admin/${userId}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify(userData),
    });
  }

  async deleteAdminUser(
    userId: string,
    token?: string,
  ): Promise<AdminDeleteResponse> {
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    return this.request<AdminDeleteResponse>(`/admin/${userId}`, {
      method: "DELETE",
      headers,
    });
  }

  async inviteAdminUser(
    email: string,
    role?: string,
    token?: string,
  ): Promise<{ message: string }> {
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    return this.request<{ message: string }>("/admin/invite", {
      method: "POST",
      headers,
      body: JSON.stringify({ email, role }),
    });
  }

  // Role Management (from /admin/roles endpoint)
  async getRoles(token?: string): Promise<RolesResponse> {
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    return this.request<RolesResponse>("/admin/roles", {
      method: "GET",
      headers,
    });
  }

  async createRole(
    input: { label: string; description?: string; permissions: Permission[] },
    token?: string,
  ): Promise<RoleDef> {
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    return this.request<RoleDef>("/admin/roles", {
      method: "POST",
      headers,
      body: JSON.stringify(input),
    });
  }

  async updateRole(
    id: string,
    input: { label?: string; description?: string; permissions?: Permission[] },
    token?: string,
  ): Promise<RoleDef> {
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    return this.request<RoleDef>(`/admin/roles/${id}`, {
      method: "PUT",
      headers,
      body: JSON.stringify(input),
    });
  }

  async deleteRole(id: string, token?: string): Promise<{ message: string }> {
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    return this.request<{ message: string }>(`/admin/roles/${id}`, {
      method: "DELETE",
      headers,
    });
  }

  // Regular User Management (from /user endpoint)
  async getUsers(
    query: UsersQuery = {},
    token?: string,
  ): Promise<UsersResponse> {
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    // Build query parameters
    const params = new URLSearchParams();
    if (query.limit) params.append("limit", query.limit.toString());
    if (query.page) params.append("page", query.page.toString());
    if (query.search) params.append("search", query.search);
    if (query.role) params.append("role", query.role);
    if (query.status) params.append("status", query.status);
    if (query.sort) params.append("sort", query.sort);
    if (query.tier) params.append("tier", query.tier);
    if (query.membership) params.append("membership", query.membership);
    if (query.subscription) params.append("subscription", query.subscription);

    const queryString = params.toString();
    const endpoint = queryString ? `/user?${queryString}` : "/user";

    return this.request<UsersResponse>(endpoint, {
      method: "GET",
      headers,
    });
  }

  async getUser(userId: string, token?: string): Promise<RegularUser> {
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    return this.request<RegularUser>(`/user/${userId}`, {
      method: "GET",
      headers,
    });
  }

  async createUser(
    userData: Omit<RegularUser, "_id" | "createdAt" | "updatedAt" | "__v">,
    token?: string,
  ): Promise<RegularUser> {
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    return this.request<RegularUser>("/user", {
      method: "POST",
      headers,
      body: JSON.stringify(userData),
    });
  }

  async updateUser(
    userId: string,
    userData: Partial<
      Omit<RegularUser, "_id" | "createdAt" | "updatedAt" | "__v">
    >,
    token?: string,
  ): Promise<RegularUser> {
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    return this.request<RegularUser>(`/user/${userId}`, {
      method: "PUT",
      headers,
      body: JSON.stringify(userData),
    });
  }

  async deleteUser(
    userId: string,
    token?: string,
  ): Promise<{ message: string }> {
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    return this.request<{ message: string }>(`/user/${userId}`, {
      method: "DELETE",
      headers,
    });
  }

  // Dashboard stats (user counts for homepage)
  async getDashboardStats(token?: string): Promise<DashboardStatsResponse> {
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    const endpoint = this.isRealApi
      ? "/admin/dashboard/stats"
      : "/dashboard/stats";
    const response = await this.request<unknown>(endpoint, {
      method: "GET",
      headers,
    });
    return decodeDashboardStats(response);
  }

  // Dashboard summary (management insights: conversion + withdraw aggregates)
  async getDashboardSummary(token?: string): Promise<DashboardSummaryResponse> {
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    const endpoint = this.isRealApi
      ? "/admin/dashboard/summary"
      : "/dashboard/summary";
    const response = await this.request<unknown>(endpoint, {
      method: "GET",
      headers,
    });
    return decodeDashboardSummary(response);
  }

  async getDashboardInsights(
    params: { range?: DashboardInsightRange | string } = {},
    token?: string,
  ): Promise<DashboardInsightsResponse> {
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    const q = new URLSearchParams();
    if (params.range) q.set("range", params.range);
    const qs = q.toString();
    const endpoint = this.isRealApi
      ? "/admin/dashboard/insights"
      : "/dashboard/insights";
    const response = await this.request<unknown>(
      qs ? `${endpoint}?${qs}` : endpoint,
      { method: "GET", headers },
    );
    return decodeDashboardInsights(response);
  }

  // Offer Management (from /offer endpoint)
  async getOffers(query: OffersQuery = {}): Promise<OffersResponse> {
    // Build query parameters
    const params = new URLSearchParams();
    if (query.search) params.append("search", query.search);
    if (query.limit) params.append("limit", query.limit.toString());
    if (query.page) params.append("page", query.page.toString());
    if (query.category) params.append("category", query.category);
    if (query.status) params.append("status", query.status);
    if (query.type) params.append("type", query.type);
    if (query.country) params.append("country", query.country);

    const queryString = params.toString();
    const endpoint = queryString
      ? `/offer/admin?${queryString}`
      : "/offer/admin";

    return this.request<OffersResponse>(endpoint, {
      method: "GET",
    });
  }

  async getTopBrands(): Promise<TopBrandsAdminResponse> {
    return this.request<TopBrandsAdminResponse>("/admin/top-brands", {
      method: "GET",
    });
  }

  async saveTopBrands(
    payload: SaveTopBrandsPayload | TopBrandConfigEntry[],
  ): Promise<SaveTopBrandsResponse> {
    const body = Array.isArray(payload)
      ? { brands: payload }
      : {
          brandsDesktop: payload.brandsDesktop,
          brandsMobile: payload.brandsMobile,
          brands: payload.brandsDesktop,
        };
    return this.request<SaveTopBrandsResponse>("/admin/top-brands", {
      method: "PUT",
      body: JSON.stringify(body),
    });
  }

  async getLandingRails(): Promise<LandingRailsAdminResponse> {
    return this.request<LandingRailsAdminResponse>("/admin/landing-rails", {
      method: "GET",
    });
  }

  async saveLandingRails(
    payload: SaveLandingRailsPayload,
  ): Promise<SaveLandingRailsResponse> {
    return this.request<SaveLandingRailsResponse>("/admin/landing-rails", {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  }

  async getWithdraws(
    query: WithdrawQuery = {},
    token?: string,
  ): Promise<ResponseWithdraws> {
    // Build query parameters
    const params = new URLSearchParams();
    if (query.search) params.append("search", query.search);
    if (query.limit) params.append("limit", query.limit.toString());
    if (query.page) params.append("page", query.page.toString());
    if (query.status) params.append("status", query.status);
    if (query.method) params.append("method", query.method);

    const queryString = params.toString();
    const endpoint = queryString
      ? `/admin/withdraw-all?${queryString}`
      : "/admin/withdraw-all";

    return this.request<ResponseWithdraws>(endpoint, {
      method: "GET",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  }

  /**
   * Mark a manual (MiniPay) withdraw request as paid. Accepts the on-chain
   * tx hash of the admin-side payout. Backend endpoint is
   * `PATCH /withdraw/:id/mark-paid` (admin-guarded).
   */
  async markWithdrawPaid(
    id: string,
    tx_hash: string,
    token?: string,
  ): Promise<{ success: boolean; data: unknown }> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (token) headers.Authorization = `Bearer ${token}`;
    return this.request<{ success: boolean; data: unknown }>(
      `/withdraw/${id}/mark-paid`,
      {
        method: "PATCH",
        headers,
        body: JSON.stringify({ tx_hash }),
      },
    );
  }

  async createConversionReward(
    body: {
      reward_type: string;
      reward_amount: number;
      reward_currency: string;
      user: string;
    },
    token?: string,
  ): Promise<unknown> {
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    return this.request(`/withdraw/create-conversion-reward`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
  }

  async createAdminPoint(
    body: {
      point_name: string;
      point_amount: number;
      user: string;
    },
    token?: string,
  ): Promise<unknown> {
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    return this.request(`/point/admin-create-point`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
  }

  async getConversion(
    query: ConversionQuery = {},
    token?: string,
  ): Promise<ResponseConversion> {
    // Build query parameters
    const params = new URLSearchParams();
    if (query.search) params.append("search", query.search);
    if (query.limit) params.append("limit", query.limit.toString());
    if (query.page) params.append("page", query.page.toString());
    if (query.status) params.append("status", query.status);
    if (query.key) params.append("key", query.key);

    const queryString = params.toString();
    const endpoint = queryString
      ? `/admin/conversion-all?${queryString}`
      : "/admin/conversion-all";

    return this.request<ResponseConversion>(endpoint, {
      method: "GET",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  }

  async getCreatedConversions(
    query: ConversionQuery = {},
    token?: string,
  ): Promise<ResponseConversion> {
    const params = new URLSearchParams();
    if (query.search) params.append("search", query.search);
    if (query.limit) params.append("limit", query.limit.toString());
    if (query.page) params.append("page", query.page.toString());
    if (query.status) params.append("status", query.status);
    if (query.key) params.append("key", query.key);
    const queryString = params.toString();
    const endpoint = queryString
      ? `/admin/created-conversions?${queryString}`
      : "/admin/created-conversions";
    return this.request<ResponseConversion>(endpoint, {
      method: "GET",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  }

  async getFee(token?: string): Promise<ResponseFee[]> {
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    return this.request(`/admin/get-fee-rate`, {
      method: "GET",
      headers,
    });
  }

  async updateFee(
    query: FeeSettingsForm,
    token?: string,
  ): Promise<ResponseFee> {
    const { id, ...dt } = query;
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    return this.request<ResponseFee>(`/admin/update-fee-rate/${id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify(dt),
    });
  }

  async getOffer(offerId: string): Promise<Offer> {
    return this.request<Offer>(`/offer/${offerId}`, {
      method: "GET",
    });
  }

  async updateListOffer(token?: string): Promise<Offer[]> {
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    return this.request<Offer[]>(`/involve`, {
      method: "GET",
      headers,
    });
  }

  async createOffer(
    offerData: Omit<Offer, "_id" | "createdAt" | "updatedAt" | "__v">,
    token?: string,
  ): Promise<Offer> {
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    return this.request<Offer>("/offer", {
      method: "POST",
      headers,
      body: JSON.stringify(offerData),
    });
  }

  /**
   * Registers a new brand/offer from affiliate tracking data, optional app link, and optional image assets.
   * Use `FormData`: text fields (brand_name, affiliate_network_id, …) plus optional files
   * `logo_desktop`, `logo_mobile`, `logo_circle`, `banner`, `banner_mobile` (same keys as offer edit).
   */
  async createBrandFromAffiliate(
    formData: FormData,
    token?: string,
  ): Promise<Offer> {
    const baseURL = this.getBaseURL();
    const endpoint = "/offer";
    const headers: Record<string, string> = { Accept: "application/json" };
    if (token && !(typeof window !== "undefined" && this.isRealApi)) {
      headers.Authorization = `Bearer ${token}`;
    }

    const formDataToMockBody = (fd: FormData): Record<string, string> => {
      const safeName = (name: string) => name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const bodyObj: Record<string, string> = {};
      let fileSeq = 0;
      for (const [key, value] of fd.entries()) {
        if (value instanceof File) {
          if (value.size === 0) continue;
          fileSeq += 1;
          bodyObj[key] =
            `uploads/offer/create/${key}/${Date.now()}-${fileSeq}-${safeName(value.name)}`;
        } else {
          bodyObj[key] = String(value);
        }
      }
      return bodyObj;
    };

    if (typeof window !== "undefined" && isStaticHostingClient()) {
      const { handleMockApiRequest } = await import("@/lib/mockApiCore");
      const body = formDataToMockBody(formData);
      const result = await handleMockApiRequest({
        method: "POST",
        path: ["offer"],
        searchParams: new URLSearchParams(),
        body,
      });
      if (result.status >= 400) {
        const data = result.body as { message?: string; errors?: unknown };
        const apiError: ApiError = {
          message: data?.message || friendlyStatusMessage(result.status),
          status: result.status,
          errors: data?.errors as ApiError["errors"],
        };
        throw apiError;
      }
      return result.body as Offer;
    }

    const axios = await import("axios");
    try {
      const response = await axios.default.post<Offer>(
        `${baseURL}${endpoint}`,
        formData,
        {
          headers,
        },
      );
      return response.data;
    } catch (err) {
      // Normalize to the same ApiError shape the rest of the client throws,
      // instead of leaking a raw AxiosError on this one endpoint.
      if (axios.isAxiosError(err)) {
        const data = err.response?.data as
          { message?: string; errors?: unknown } | undefined;
        // Prefer the backend message; otherwise friendly copy — status-aware
        // when a response arrived, connection copy when none did. Never leak
        // the raw axios error string ("Request failed with status code 403").
        const fallback = err.response
          ? friendlyStatusMessage(err.response.status)
          : "Couldn't reach the server. Check your connection and try again.";
        const apiError: ApiError = {
          message: data?.message || fallback,
          status: err.response?.status ?? 0,
          errors: data?.errors as ApiError["errors"],
        };
        throw apiError;
      }
      throw err;
    }
  }

  async updateOffer(
    offerId: string,
    offerData: Partial<Omit<Offer, "_id" | "createdAt" | "updatedAt" | "__v">>,
    token?: string,
  ): Promise<Offer> {
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    return this.request<Offer>(`/offer/${offerId}`, {
      method: "PUT",
      headers,
      body: JSON.stringify(offerData),
    });
  }

  async deleteOffer(
    offerId: string,
    token?: string,
  ): Promise<{ message: string }> {
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    return this.request<{ message: string }>(`/offer/${offerId}`, {
      method: "DELETE",
      headers,
    });
  }
}

// Export singleton instance
export const apiClient = new ApiClient();
export default apiClient;
