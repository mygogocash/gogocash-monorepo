"use client";

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { apiClient } from '@/lib/api';
import { ApiError, RegisterRequest, AdminUsersQuery, AdminUsersResponse, UsersQuery, UsersResponse, RegularUser, OffersQuery, OffersResponse, Offer } from '@/types/api';

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

  return {
    session,
    status,
    loading,
    error,
    register,
    requestPasswordReset,
    resetPassword,
    clearError: () => setError(null),
  };
}

// Hook for API operations with authentication
export function useApi() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getToken = () => {
    return (session as { accessToken?: string })?.accessToken;
  };

  const apiCall = async <T>(
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
  };

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

  const createAdminUser = async (userData: Omit<AdminUsersResponse, '_id' | 'createdAt' | 'updatedAt' | '__v'>): Promise<AdminUsersResponse> => {
    const token = getToken();
    return apiCall(() => apiClient.createAdminUser(userData, token));
  };

  const updateAdminUser = async (
    userId: string, 
    userData: Partial<Omit<AdminUsersResponse, '_id' | 'createdAt' | 'updatedAt' | '__v'>>
  ): Promise<AdminUsersResponse> => {
    const token = getToken();
    return apiCall(() => apiClient.updateAdminUser(userId, userData, token));
  };

  const deleteAdminUser = async (userId: string): Promise<{ message: string }> => {
    const token = getToken();
    return apiCall(() => apiClient.deleteAdminUser(userId, token));
  };

  // Regular user management methods
  const getUsers = async (query: UsersQuery = {}): Promise<UsersResponse> => {
    const token = getToken();
    return apiCall(() => apiClient.getUsers(query, token));
  };

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

  // Offer management methods
  const getOffers = async (query: OffersQuery = {}): Promise<OffersResponse> => {
    return apiCall(() => apiClient.getOffers(query));
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

  return {
    loading,
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
    clearError: () => setError(null),
  };
}