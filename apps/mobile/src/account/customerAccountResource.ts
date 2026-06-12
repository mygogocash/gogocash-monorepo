import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { ApiError } from "@mobile/api/client";
import { getSharedMobileApiClient } from "@mobile/api/sharedClient";
import type { AccountDataSource } from "@mobile/auth/routeGuard";
import { getMobileEnv } from "@mobile/config/env";

export const accountDataSourceEnvName = "EXPO_PUBLIC_ACCOUNT_DATA_SOURCE";

export type CustomerAccountResourceId =
  | "billing"
  | "catalog"
  | "merchant"
  | "offers"
  | "profile"
  | "referral"
  | "wallet";

export type CustomerAccountResourceStatus =
  | "disabled"
  | "empty"
  | "error"
  | "loading"
  | "offline"
  | "ready";

export type CustomerAccountResourceResult<TData> = {
  data: TData | null;
  endpoint: string;
  error: Error | null;
  retry: () => void;
  source: AccountDataSource;
  status: CustomerAccountResourceStatus;
};

type CustomerAccountResourceOptions<TFixture> = {
  enabled?: boolean;
  fixtureData: TFixture;
  merchantId?: string;
  resourceId: CustomerAccountResourceId;
};

const merchantEndpointTemplate = "/offer/${merchantId}";

export function resolveCustomerAccountResourceEndpoint({
  merchantId = "brand-grocery-galaxy-1001",
  resourceId,
}: {
  merchantId?: string;
  resourceId: CustomerAccountResourceId;
}): string {
  if (resourceId === "profile") {
    return "/user/profile";
  }

  if (resourceId === "wallet") {
    return "/withdraw/check";
  }

  if (resourceId === "referral") {
    return "/point/referral-list";
  }

  if (resourceId === "offers") {
    return "/offer/my-offers?limit=10&page=1";
  }

  if (resourceId === "catalog") {
    // Public merchant catalog (no auth required) — the web favorite page reads
    // the same list (Favorite.tsx → GET /offer).
    return "/offer?limit=4&page=1";
  }

  if (resourceId === "merchant") {
    return merchantEndpointTemplate.replace("${merchantId}", encodeURIComponent(merchantId));
  }

  return "/customer-billing/subscription";
}

export type CustomerAccountResourceRequest = {
  body?: Record<string, unknown>;
  method: "GET" | "POST";
  path: string;
};

/**
 * The actual fetch instruction per resource. Most resources are plain GETs of
 * the endpoint above; offers is a POST contract on the backend
 * (POST /offer/my-offers { limit, page } — a GET falls through to @Get(':id')
 * and 500s on the CastError).
 */
export function resolveCustomerAccountResourceRequest({
  merchantId,
  resourceId,
}: {
  merchantId?: string;
  resourceId: CustomerAccountResourceId;
}): CustomerAccountResourceRequest {
  if (resourceId === "offers") {
    return { body: { limit: 10, page: 1 }, method: "POST", path: "/offer/my-offers" };
  }

  return { method: "GET", path: resolveCustomerAccountResourceEndpoint({ merchantId, resourceId }) };
}

export function useCustomerAccountResource<TFixture, TBackend = unknown>({
  enabled = true,
  fixtureData,
  merchantId,
  resourceId,
}: CustomerAccountResourceOptions<TFixture>): CustomerAccountResourceResult<TFixture | TBackend> {
  const env = useMemo(() => getMobileEnv(), []);
  const endpoint = resolveCustomerAccountResourceEndpoint({ merchantId, resourceId });
  const shouldUseBackend = enabled && env.accountDataSource === "backend";
  const query = useQuery<TBackend, Error>({
    enabled: shouldUseBackend,
    queryFn: async () => {
      // Shared singleton: the session store + client are built once per
      // baseUrl, not per fetch (the client re-reads the session each request,
      // so token freshness is unaffected).
      const client = await getSharedMobileApiClient(env.apiUrl);

      if (!client) {
        throw new ApiError("No mobile session store is available.", 0, "SESSION_STORE_UNAVAILABLE");
      }

      const request = resolveCustomerAccountResourceRequest({ merchantId, resourceId });
      return request.method === "POST"
        ? client.post<TBackend>(request.path, request.body)
        : client.get<TBackend>(request.path);
    },
    queryKey: ["customer-account-resource", resourceId, endpoint, env.apiUrl],
    retry: false,
    staleTime: 1000 * 60,
  });

  const retry = () => {
    if (shouldUseBackend) {
      void query.refetch();
    }
  };

  if (!enabled) {
    return {
      data: fixtureData,
      endpoint,
      error: null,
      retry,
      source: env.accountDataSource,
      status: "ready",
    };
  }

  if (env.accountDataSource === "fixtures") {
    return {
      data: fixtureData,
      endpoint,
      error: null,
      retry,
      source: env.accountDataSource,
      status: "ready",
    };
  }

  if (env.accountDataSource === "disabled") {
    return {
      data: null,
      endpoint,
      error: null,
      retry,
      source: env.accountDataSource,
      status: "disabled",
    };
  }

  if (query.isPending) {
    return {
      data: null,
      endpoint,
      error: null,
      retry,
      source: env.accountDataSource,
      status: "loading",
    };
  }

  if (query.isError) {
    return {
      data: null,
      endpoint,
      error: query.error,
      retry,
      source: env.accountDataSource,
      status: isCustomerAccountResourceOffline(query.error) ? "offline" : "error",
    };
  }

  if (isCustomerAccountResourcePayloadEmpty(query.data)) {
    return {
      data: null,
      endpoint,
      error: null,
      retry,
      source: env.accountDataSource,
      status: "empty",
    };
  }

  return {
    data: query.data ?? null,
    endpoint,
    error: null,
    retry,
    source: env.accountDataSource,
    status: "ready",
  };
}

export function isCustomerAccountResourcePayloadEmpty(payload: unknown): boolean {
  if (payload == null) {
    return true;
  }

  if (Array.isArray(payload)) {
    return payload.length === 0;
  }

  if (typeof payload !== "object") {
    return false;
  }

  const record = payload as Record<string, unknown>;

  for (const key of ["data", "items", "results", "rows"]) {
    if (key in record) {
      return isCustomerAccountResourcePayloadEmpty(record[key]);
    }
  }

  return Object.keys(record).length === 0;
}

function isCustomerAccountResourceOffline(error: Error): boolean {
  if (isWebRuntimeOffline()) {
    return true;
  }

  return error instanceof ApiError && (error.status === 0 || error.code === "NETWORK_ERROR");
}

function isWebRuntimeOffline() {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}
