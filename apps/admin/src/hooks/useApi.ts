"use client";

import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { apiClient } from '@/lib/api';
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Browser auth is handled by `/api/backend` (NextAuth JWT cookie → Nest Bearer).
  const apiCall = useCallback(async <T>(
    operation: (token?: string) => Promise<T>
  ): Promise<T> => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await operation(undefined);
      return result;
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

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
    return apiCall(() => apiClient.getProfile());
  };

  const updateProfile = async (userData: Partial<{
    name: string;
    email: string;
    avatar: string;
  }>) => {
    return apiCall(() => apiClient.updateProfile(userData));
  };

  const changePassword = async (passwordData: {
    current_password: string;
    password: string;
    password_confirmation: string;
  }) => {
    return apiCall(() => apiClient.changePassword(passwordData));
  };

  // Admin user management methods
  const getAdminUsers = async (query: AdminUsersQuery = {}): Promise<AdminUsersResponse> => {
    return apiCall(() => apiClient.getAdminUsers(query));
  };

  const getAdminUser = async (userId: string): Promise<AdminUsersResponse> => {
    return apiCall(() => apiClient.getAdminUser(userId));
  };

  const createAdminUser = async (userData: Omit<DataAdminUsers, '_id' | 'createdAt' | 'updatedAt' | '__v'>): Promise<DataAdminUsers> => {
    return apiCall(() => apiClient.createAdminUser(userData));
  };

  const updateAdminUser = async (
    userId: string, 
    userData: Partial<Omit<DataAdminUsers, '_id' | 'createdAt' | 'updatedAt' | '__v'>>
  ): Promise<DataAdminUsers> => {
    return apiCall(() => apiClient.updateAdminUser(userId, userData));
  };

  const deleteAdminUser = async (userId: string): Promise<{ message: string }> => {
    return apiCall(() => apiClient.deleteAdminUser(userId));
  };

  const inviteAdminUser = async (email: string, role?: string): Promise<{ message: string }> => {
    return apiCall(() => apiClient.inviteAdminUser(email, role));
  };

  const getRoles = useCallback(async (): Promise<RolesResponse> => {
    return apiClient.getRoles();
  }, []);

  const createRole = async (input: { label: string; description?: string; permissions: Permission[] }): Promise<RoleDef> => {
    return apiCall(() => apiClient.createRole(input));
  };

  const updateRole = async (id: string, input: { label?: string; description?: string; permissions?: Permission[] }): Promise<RoleDef> => {
    return apiCall(() => apiClient.updateRole(id, input));
  };

  const deleteRole = async (id: string): Promise<{ message: string }> => {
    return apiCall(() => apiClient.deleteRole(id));
  };

  // Regular user management methods (memoized for stable refs in useEffect deps)
  const getUsers = useCallback(async (query: UsersQuery = {}): Promise<UsersResponse> => {
    return apiCall(() => apiClient.getUsers(query));
  }, [apiCall]);

  const getDashboardStats = useCallback(async (): Promise<DashboardStatsResponse> => {
    return apiCall(() => apiClient.getDashboardStats());
  }, [apiCall]);

  const getDashboardSummary = useCallback(async (): Promise<DashboardSummaryResponse> => {
    return apiCall(() => apiClient.getDashboardSummary());
  }, [apiCall]);

  const getUser = async (userId: string): Promise<RegularUser> => {
    return apiCall(() => apiClient.getUser(userId));
  };

  const createUser = async (userData: Omit<RegularUser, '_id' | 'createdAt' | 'updatedAt' | '__v'>): Promise<RegularUser> => {
    return apiCall(() => apiClient.createUser(userData));
  };

  const updateUser = async (
    userId: string, 
    userData: Partial<Omit<RegularUser, '_id' | 'createdAt' | 'updatedAt' | '__v'>>
  ): Promise<RegularUser> => {
    return apiCall(() => apiClient.updateUser(userId, userData));
  };

  const deleteUser = async (userId: string): Promise<{ message: string }> => {
    return apiCall(() => apiClient.deleteUser(userId));
  };

  // Offer management methods (memoized for stable refs in useEffect deps)
  const getOffers = useCallback(async (query: OffersQuery = {}): Promise<OffersResponse> => {
    return apiCall(() => apiClient.getOffers(query));
  }, [apiCall]);

  const updateListOffer = async (): Promise<Offer[]> => {
    return apiCall(() => apiClient.updateListOffer());
  };

  const getOffer = async (offerId: string): Promise<Offer> => {
    return apiCall(() => apiClient.getOffer(offerId));
  };

  const createOffer = async (offerData: Omit<Offer, '_id' | 'createdAt' | 'updatedAt' | '__v'>): Promise<Offer> => {
    return apiCall(() => apiClient.createOffer(offerData));
  };

  const updateOffer = async (
    offerId: string, 
    offerData: Partial<Omit<Offer, '_id' | 'createdAt' | 'updatedAt' | '__v'>>
  ): Promise<Offer> => {
    return apiCall(() => apiClient.updateOffer(offerId, offerData));
  };

  const deleteOffer = async (offerId: string): Promise<{ message: string }> => {
    return apiCall(() => apiClient.deleteOffer(offerId));
  };


  const getWithdraws = useCallback(async (query: WithdrawQuery = {}): Promise<ResponseWithdraws> => {
    return apiCall(() => apiClient.getWithdraws(query));
  }, [apiCall]);

  const getConversion = useCallback(async (query: ConversionQuery = {}): Promise<ResponseConversion> => {
    return apiCall(() => apiClient.getConversion(query));
  }, [apiCall]);

  const getCreatedConversions = useCallback(async (query: ConversionQuery = {}): Promise<ResponseConversion> => {
    return apiCall(() => apiClient.getCreatedConversions(query));
  }, [apiCall]);

  const getFee = useCallback(async (): Promise<ResponseFee[]> => {
    return apiCall(() => apiClient.getFee());
  }, [apiCall]);

  const updateFee = async (form: FeeSettingsForm): Promise<ResponseFee> => {
    return apiCall(() => apiClient.updateFee(form));
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