import {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  ApiError,
  AdminUsersQuery,
  AdminUsersResponse,
  RegularUser,
  UsersQuery,
  UsersResponse,
  DashboardStatsResponse,
  DashboardSummaryResponse,
  Offer,
  OffersQuery,
  OffersResponse,
  WithdrawQuery,
  ResponseWithdraws,
  ConversionQuery,
  ResponseConversion,
  ResponseFee,
  FeeSettingsForm,
} from "@/types/api";
import { AxiosRequestConfig } from "axios";

class ApiClient {
  private baseURL: string;

  constructor() {
    // Internal-only: always use mock API. All data is from /api/mock.
    let base = "/api/mock";
    if (typeof window === "undefined") {
      const appOrigin = (process.env.NEXTAUTH_URL || "http://localhost:3000").replace(/\/$/, "");
      base = appOrigin + base;
    }
    this.baseURL = base;
  }

   private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const axios = await import('axios');
    const url = `${this.baseURL}${endpoint}`;
    
    const config = {
      url,
      method: options.method || 'GET',
      headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...options.headers,
      },
      data: options.body ? JSON.parse(options.body as string) : undefined,
    };

    try {
      const response = await axios.default(config as AxiosRequestConfig);
      return response.data;
    } catch (error) {
      if (axios.default.isAxiosError(error) && error.response) {
      const apiError: ApiError = {
        message: error.response.data?.message || `HTTP Error ${error.response.status}`,
        status: error.response.status,
        errors: error.response.data?.errors,
      };
      throw apiError;
      }
      
      // Handle network or other errors
      throw {
      message: error instanceof Error ? error.message : 'Network error',
      status: 0,
      } as ApiError;
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

  async getProfile(token: string): Promise<LoginResponse> {
    return this.request<LoginResponse>("/auth/profile", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
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

  // Password reset endpoints
  async requestPasswordReset(email: string): Promise<{ message: string }> {
    return this.request<{ message: string }>("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  }

  async resetPassword(data: {
    email: string;
    token: string;
    password: string;
    password_confirmation: string;
  }): Promise<{ message: string }> {
    return this.request<{ message: string }>("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  // User management endpoints
  async updateProfile(
    token: string,
    userData: Partial<{ name: string; email: string; avatar: string }>,
  ): Promise<LoginResponse> {
    return this.request<LoginResponse>("/user/profile", {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(userData),
    });
  }

  async changePassword(
    token: string,
    passwordData: {
      current_password: string;
      password: string;
      password_confirmation: string;
    },
  ): Promise<{ message: string }> {
    return this.request<{ message: string }>("/user/change-password", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
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
    userData: Omit<
      AdminUsersResponse,
      "_id" | "createdAt" | "updatedAt" | "__v"
    >,
    token?: string,
  ): Promise<AdminUsersResponse> {
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    return this.request<AdminUsersResponse>("/admin", {
      method: "POST",
      headers,
      body: JSON.stringify(userData),
    });
  }

  async updateAdminUser(
    userId: string,
    userData: Partial<
      Omit<AdminUsersResponse, "_id" | "createdAt" | "updatedAt" | "__v">
    >,
    token?: string,
  ): Promise<AdminUsersResponse> {
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    return this.request<AdminUsersResponse>(`/admin/${userId}`, {
      method: "PUT",
      headers,
      body: JSON.stringify(userData),
    });
  }

  async deleteAdminUser(
    userId: string,
    token?: string,
  ): Promise<{ message: string }> {
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    return this.request<{ message: string }>(`/admin/${userId}`, {
      method: "DELETE",
      headers,
    });
  }

  async inviteAdminUser(
    email: string,
    token?: string,
  ): Promise<{ message: string }> {
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    return this.request<{ message: string }>("/admin/invite", {
      method: "POST",
      headers,
      body: JSON.stringify({ email }),
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
    return this.request<DashboardStatsResponse>("/dashboard/stats", {
      method: "GET",
      headers,
    });
  }

  // Dashboard summary (management insights: conversion + withdraw aggregates)
  async getDashboardSummary(token?: string): Promise<DashboardSummaryResponse> {
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    return this.request<DashboardSummaryResponse>("/dashboard/summary", {
      method: "GET",
      headers,
    });
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
    const endpoint = queryString ? `/offer/admin?${queryString}` : "/offer/admin";

    return this.request<OffersResponse>(endpoint, {
      method: "GET",
    });
  }

  async getWithdraws(
    query: WithdrawQuery = {},
    token: string,
  ): Promise<ResponseWithdraws> {
    // Build query parameters
    const params = new URLSearchParams();
    if (query.search) params.append("search", query.search);
    if (query.limit) params.append("limit", query.limit.toString());
    if (query.page) params.append("page", query.page.toString());

    const queryString = params.toString();
    const endpoint = queryString
      ? `/admin/withdraw-all?${queryString}`
      : "/admin/withdraw-all";

    return this.request<ResponseWithdraws>(endpoint, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  async getConversion(
    query: ConversionQuery = {},
    token: string,
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
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  async getCreatedConversions(
    query: ConversionQuery = {},
    token: string,
  ): Promise<ResponseConversion> {
    const params = new URLSearchParams();
    if (query.limit) params.append("limit", query.limit.toString());
    if (query.page) params.append("page", query.page.toString());
    const queryString = params.toString();
    const endpoint = queryString
      ? `/admin/created-conversions?${queryString}`
      : "/admin/created-conversions";
    return this.request<ResponseConversion>(endpoint, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  async getFee(token: string): Promise<ResponseFee[]> {
    return this.request(`/admin/get-fee-rate`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  async updateFee(query: FeeSettingsForm, token: string): Promise<ResponseFee> {
    // Build query parameters
    // const form = new FormData();
    // if (query.system) form.append('system', query.system.toString());
    // if (query.store) form.append('store', query.store.toString());
    // if (query.minimum_withdraw) form.append('minimum_withdraw', query.minimum_withdraw.toString());
    const { id, ...dt } = query;
    return this.request<ResponseFee>(`/admin/update-fee-rate/${id}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(dt),
    });
  }

  async getOffer(offerId: string): Promise<Offer> {
    return this.request<Offer>(`/offer/${offerId}`, {
      method: "GET",
    });
  }

  async updateListOffer(token: string): Promise<Offer[]> {
    return this.request<Offer[]>(`/involve`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
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
