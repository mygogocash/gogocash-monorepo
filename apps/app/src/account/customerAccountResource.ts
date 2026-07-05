import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { ApiError } from "@mobile/api/client";
import { getSharedMobileApiClient } from "@mobile/api/sharedClient";
import {
  isPublicAdminConfiguredResource,
  type CustomerAccountResourceId,
} from "@mobile/account/customerAccountResourceIds";
import {
  resolveCustomerAccountResourceQueryKey,
  resolveCustomerAccountResourceSessionScope,
} from "@mobile/account/customerAccountResourceQueryKey";
import {
  resolveCustomerAccountResourceEndpoint,
  resolveCustomerAccountResourceRequest,
  shouldFetchCustomerAccountResourceFromBackend,
} from "@mobile/account/customerAccountResourceEndpoints";
import { resolveCustomerAccountResourceQueryOptions } from "@mobile/account/customerAccountResourceQueryOptions";

export {
  isPublicAdminConfiguredResource,
  PUBLIC_ADMIN_CONFIGURED_RESOURCE_IDS,
  type CustomerAccountResourceId,
  type PublicAdminConfiguredResourceId,
} from "@mobile/account/customerAccountResourceIds";
export {
  AUTH_SCOPED_CUSTOMER_ACCOUNT_RESOURCE_IDS,
  resolveCustomerAccountResourceQueryKey,
  resolveCustomerAccountResourceSessionScope,
} from "@mobile/account/customerAccountResourceQueryKey";
export {
  BRAND_CATALOG_PAGE_LIMIT,
  resolveCustomerAccountResourceEndpoint,
  resolveCustomerAccountResourceRequest,
  shouldFetchCustomerAccountResourceFromBackend,
  type CustomerAccountResourceRequest,
} from "@mobile/account/customerAccountResourceEndpoints";
import { normalizeCheckWithdrawResponse } from "@mobile/api/walletTypes";
import type { AccountDataSource } from "@mobile/auth/routeGuard";
import { useMobileSessionSnapshot } from "@mobile/auth/useMobileSessionSnapshot";
import { getMobileEnv } from "@mobile/config/env";
import { useLocale } from "@mobile/i18n/LocaleProvider";

export const accountDataSourceEnvName = "EXPO_PUBLIC_ACCOUNT_DATA_SOURCE";

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

export function useCustomerAccountResource<TFixture, TBackend = unknown>({
  enabled = true,
  fixtureData,
  merchantId,
  resourceId,
}: CustomerAccountResourceOptions<TFixture>): CustomerAccountResourceResult<TFixture | TBackend> {
  const env = useMemo(() => getMobileEnv(), []);
  const session = useMobileSessionSnapshot();
  const { region } = useLocale();
  const endpoint = resolveCustomerAccountResourceEndpoint({ merchantId, regionCode: region, resourceId });
  const sessionScope = resolveCustomerAccountResourceSessionScope(resourceId, session);
  const shouldFetch = shouldFetchCustomerAccountResourceFromBackend({
    accountDataSource: env.accountDataSource,
    apiUrl: env.apiUrl,
    enabled,
    resourceId,
  });
  const query = useQuery<TBackend, Error>({
    enabled: shouldFetch,
    queryFn: async () => {
      // Shared singleton: the session store + client are built once per
      // baseUrl, not per fetch (the client re-reads the session each request,
      // so token freshness is unaffected).
      const client = await getSharedMobileApiClient(env.apiUrl);

      if (!client) {
        throw new ApiError("No mobile session store is available.", 0, "SESSION_STORE_UNAVAILABLE");
      }

      const request = resolveCustomerAccountResourceRequest({ merchantId, regionCode: region, resourceId });
      return request.method === "POST"
        ? client.post<TBackend>(request.path, request.body)
        : client.get<TBackend>(request.path);
    },
    queryKey: resolveCustomerAccountResourceQueryKey({
      apiUrl: env.apiUrl,
      endpoint,
      regionCode: region,
      resourceId,
      sessionScope,
    }),
    ...resolveCustomerAccountResourceQueryOptions(resourceId),
    retry: false,
  });

  const retry = () => {
    if (shouldFetch) {
      void query.refetch();
    }
  };

  const fixturesHybridFetch =
    env.accountDataSource === "fixtures" && isPublicAdminConfiguredResource(resourceId);

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

  if (!shouldFetch) {
    return {
      data: fixtureData,
      endpoint,
      error: null,
      retry,
      source: env.accountDataSource,
      status: "ready",
    };
  }

  if (query.isPending) {
    if (fixturesHybridFetch) {
      return {
        data: fixtureData,
        endpoint,
        error: null,
        retry,
        source: "fixtures",
        status: "ready",
      };
    }

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
    if (fixturesHybridFetch) {
      return {
        data: fixtureData,
        endpoint,
        error: query.error,
        retry,
        source: "fixtures",
        status: "ready",
      };
    }

    return {
      data: null,
      endpoint,
      error: query.error,
      retry,
      source: env.accountDataSource,
      status: isCustomerAccountResourceOffline(query.error) ? "offline" : "error",
    };
  }

  // POST /withdraw/check includes a `data: Conversion[]` field. An empty conversion
  // list is a valid zero-balance wallet — do not treat it as an empty resource.
  if (resourceId === "wallet") {
    const walletPayload = normalizeCheckWithdrawResponse(query.data);
    if (walletPayload) {
      return {
        data: walletPayload as TFixture | TBackend,
        endpoint,
        error: null,
        retry,
        source: "backend",
        status: "ready",
      };
    }
  }

  if (isCustomerAccountResourcePayloadEmpty(query.data)) {
    return {
      data: null,
      endpoint,
      error: null,
      retry,
      source: "backend",
      status: "empty",
    };
  }

  return {
    data: query.data ?? null,
    endpoint,
    error: null,
    retry,
    source: "backend",
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
