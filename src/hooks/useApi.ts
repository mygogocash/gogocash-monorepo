"use client";

import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { apiClient } from '@/lib/api';
import { DEFAULT_MOCK_ACCESS_TOKEN } from '@/lib/authTokens';
import { ApiError, RegisterRequest, AdminUsersQuery, AdminUsersResponse, DataAdminUsers, RoleDef, RolesResponse, UsersQuery, UsersResponse, RegularUser, DashboardStatsResponse, DashboardSummaryResponse, OffersQuery, OffersResponse, Offer, WithdrawQuery, ResponseWithdraws, ResponseConversion, ConversionQuery, ResponseFee, FeeSettingsForm } from '@/types/api';
import type { Permission } from '@/lib/rbac';

// Hook for authentication operations
export function useAuth() {
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const register = async (userData: RegisterRequest) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await apiClient.register(userData);
      return result;
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const requestPasswordReset = async (email: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await apiClient.requestPasswordReset(email);
      return result;
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (data: {
    email: string;
    token: string;
    password: string;
    password_confirmation: string;
  }) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await apiClient.resetPassword(data);
      return result;
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const clearError = useCallback(() => setError(null), []);

  return {
    session,
    status,
    loading,
    error,
    register,
    requestPasswordReset,
    resetPassword,
    clearError,
  };
}

// Hook for API operations with authentication
export function useApi() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getToken = useCallback(() => {
    const token = (session as { accessToken?: string })?.accessToken;
    // When auth is disabled, session is null; use mock token so mock API still returns data
    return token ?? DEFAULT_MOCK_ACCESS_TOKEN;
  }, [session]);

  const apiCall = useCallback(async <T>(
    operation: (token?: string) => Promise<T>
  ): Promise<T> => {
    setLoading(true);
    setError(null);
    
    try {
      const token = getToken();
      const result = await operation(token);
      return result;
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  const get = async <T>(endpoint: string): Promise<T> => {
    return apiCall((token) => apiClient.get<T>(endpoint, token));
  };

  const post = async <T>(
    endpoint: string,
    data: Record<string, unknown>
  ): Promise<T> => {
    return apiCall((token) => apiClient.post<T>(endpoint, data, token));
  };

  const put = async <T>(
    endpoint: string,
    data: Record<string, unknown>
  ): Promise<T> => {
    return apiCall((token) => apiClient.put<T>(endpoint, data, token));
  };



  const del = async <T>(endpoint: string): Promise<T> => {
    return apiCall((token) => apiClient.delete<T>(endpoint, token));
  };

  const getProfile = async () => {
    const token = getToken();
    if (!token) throw new Error('No authentication token available');
    return apiCall(() => apiClient.getProfile(token));
  };

  const updateProfile = async (userData: Partial<{
    name: string;
    email: string;
    avatar: string;
  }>) => {
    const token = getToken();
    if (!token) throw new Error('No authentication token available');
    return apiCall(() => apiClient.updateProfile(token, userData));
  };

  const changePassword = async (passwordData: {
    current_password: string;
    password: string;
    password_confirmation: string;
  }) => {
    const token = getToken();
    if (!token) throw new Error('No authentication token available');
    return apiCall(() => apiClient.changePassword(token, passwordData));
  };

  // Admin user management methods
  const getAdminUsers = async (query: AdminUsersQuery = {}): Promise<AdminUsersResponse> => {
    const token = getToken();
    return apiCall(() => apiClient.getAdminUsers(query, token));
  };

  const getAdminUser = async (userId: string): Promise<AdminUsersResponse> => {
    const token = getToken();
    return apiCall(() => apiClient.getAdminUser(userId, token));
  };

  const createAdminUser = async (userData: Omit<DataAdminUsers, '_id' | 'createdAt' | 'updatedAt' | '__v'>): Promise<DataAdminUsers> => {
    const token = getToken();
    return apiCall(() => apiClient.createAdminUser(userData, token));
  };

  const updateAdminUser = async (
    userId: string, 
    userData: Partial<Omit<DataAdminUsers, '_id' | 'createdAt' | 'updatedAt' | '__v'>>
  ): Promise<DataAdminUsers> => {
    const token = getToken();
    return apiCall(() => apiClient.updateAdminUser(userId, userData, token));
  };

  const deleteAdminUser = async (userId: string): Promise<{ message: string }> => {
    const token = getToken();
    return apiCall(() => apiClient.deleteAdminUser(userId, token));
  };

  const inviteAdminUser = async (email: string, role?: string): Promise<{ message: string }> => {
    const token = getToken();
    return apiCall(() => apiClient.inviteAdminUser(email, role, token));
  };

  const getRoles = useCallback(async (): Promise<RolesResponse> => {
    const token = getToken();
    return apiClient.getRoles(token);
  }, [getToken]);

  const createRole = async (input: { label: string; description?: string; permissions: Permission[] }): Promise<RoleDef> => {
    const token = getToken();
    return apiCall(() => apiClient.createRole(input, token));
  };

  const updateRole = async (id: string, input: { label?: string; description?: string; permissions?: Permission[] }): Promise<RoleDef> => {
    const token = getToken();
    return apiCall(() => apiClient.updateRole(id, input, token));
  };

  const deleteRole = async (id: string): Promise<{ message: string }> => {
    const token = getToken();
    return apiCall(() => apiClient.deleteRole(id, token));
  };

  // Regular user management methods (memoized for stable refs in useEffect deps)
  const getUsers = useCallback(async (query: UsersQuery = {}): Promise<UsersResponse> => {
    const token = getToken();
    return apiCall(() => apiClient.getUsers(query, token));
  }, [apiCall, getToken]);

  const getDashboardStats = useCallback(async (): Promise<DashboardStatsResponse> => {
    const token = getToken();
    return apiCall(() => apiClient.getDashboardStats(token));
  }, [apiCall, getToken]);

  const getDashboardSummary = useCallback(async (): Promise<DashboardSummaryResponse> => {
    const token = getToken();
    return apiCall(() => apiClient.getDashboardSummary(token));
  }, [apiCall, getToken]);

  const getUser = async (userId: string): Promise<RegularUser> => {
    const token = getToken();
    return apiCall(() => apiClient.getUser(userId, token));
  };

  const createUser = async (userData: Omit<RegularUser, '_id' | 'createdAt' | 'updatedAt' | '__v'>): Promise<RegularUser> => {
    const token = getToken();
    return apiCall(() => apiClient.createUser(userData, token));
  };

  const updateUser = async (
    userId: string, 
    userData: Partial<Omit<RegularUser, '_id' | 'createdAt' | 'updatedAt' | '__v'>>
  ): Promise<RegularUser> => {
    const token = getToken();
    return apiCall(() => apiClient.updateUser(userId, userData, token));
  };

  const deleteUser = async (userId: string): Promise<{ message: string }> => {
    const token = getToken();
    return apiCall(() => apiClient.deleteUser(userId, token));
  };

  // Offer management methods (memoized for stable refs in useEffect deps)
  const getOffers = useCallback(async (query: OffersQuery = {}): Promise<OffersResponse> => {
    return apiCall(() => apiClient.getOffers(query));
  }, [apiCall]);

  const updateListOffer = async (token: string): Promise<Offer[]> => {
    return apiCall(() => apiClient.updateListOffer(token));
  };

  const getOffer = async (offerId: string): Promise<Offer> => {
    return apiCall(() => apiClient.getOffer(offerId));
  };

  const createOffer = async (offerData: Omit<Offer, '_id' | 'createdAt' | 'updatedAt' | '__v'>): Promise<Offer> => {
    const token = getToken();
    return apiCall(() => apiClient.createOffer(offerData, token));
  };

  const updateOffer = async (
    offerId: string, 
    offerData: Partial<Omit<Offer, '_id' | 'createdAt' | 'updatedAt' | '__v'>>
  ): Promise<Offer> => {
    const token = getToken();
    return apiCall(() => apiClient.updateOffer(offerId, offerData, token));
  };

  const deleteOffer = async (offerId: string): Promise<{ message: string }> => {
    const token = getToken();
    return apiCall(() => apiClient.deleteOffer(offerId, token));
  };


  const getWithdraws = useCallback(async (query: WithdrawQuery = {}, token: string): Promise<ResponseWithdraws> => {
    return apiCall(() => apiClient.getWithdraws(query, token));
  }, [apiCall]);

  const getConversion = useCallback(async (query: ConversionQuery = {}, token: string): Promise<ResponseConversion> => {
    return apiCall(() => apiClient.getConversion(query, token));
  }, [apiCall]);

  const getCreatedConversions = useCallback(async (query: ConversionQuery = {}, token: string): Promise<ResponseConversion> => {
    return apiCall(() => apiClient.getCreatedConversions(query, token));
  }, [apiCall]);

  const getFee = useCallback(async (token: string): Promise<ResponseFee[]> => {
    return apiCall(() => apiClient.getFee(token));
  }, [apiCall]);

  const updateFee = async (form : FeeSettingsForm, token: string): Promise<ResponseFee> => {
    return apiCall(() => apiClient.updateFee(form, token));
  };

  const clearError = useCallback(() => setError(null), []);

  return {
    loading,
    setLoading,
    error,
    get,
    post,
    put,
    delete: del,
    getProfile,
    updateProfile,
    changePassword,
    // Admin user methods
    getAdminUsers,
    getAdminUser,
    createAdminUser,
    updateAdminUser,
    deleteAdminUser,
    inviteAdminUser,
    getRoles,
    createRole,
    updateRole,
    deleteRole,
    // Dashboard
    getDashboardStats,
    getDashboardSummary,
    // Regular user methods
    getUsers,
    getUser,
    createUser,
    updateUser,
    deleteUser,
    // Offer methods
    getOffers,
    getOffer,
    createOffer,
    updateOffer,
    deleteOffer,
    clearError,
    updateListOffer,

    // Withdraw methods
    getWithdraws,

    // Conversion methods
    getConversion,
    getCreatedConversions,

    // Fee methods
    getFee,
    updateFee,
  };
}