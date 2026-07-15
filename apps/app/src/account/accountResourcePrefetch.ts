import type { QueryClient } from "@tanstack/react-query";

import {
  resolveCustomerAccountResourceEndpoint,
  resolveCustomerAccountResourceRequest,
} from "@mobile/account/customerAccountResourceEndpoints";
import type { CustomerAccountResourceId } from "@mobile/account/customerAccountResourceIds";
import { shouldFetchCustomerAccountResourceFromBackend } from "@mobile/account/customerAccountResourceEndpoints";
import {
  resolveCustomerAccountResourceQueryKey,
  resolveCustomerAccountResourceSessionScope,
} from "@mobile/account/customerAccountResourceQueryKey";
import { resolveCustomerAccountResourceQueryOptions } from "@mobile/account/customerAccountResourceQueryOptions";
import { getSharedMobileApiClient } from "@mobile/api/sharedClient";
import type { AccountDataSource } from "@mobile/auth/routeGuard";
import type { MobileSession } from "@mobile/auth/session";
import { DEFAULT_REGION } from "@mobile/i18n/regionTypes";

const AUTHED_PREFETCH_RESOURCE_IDS = ["profile", "wallet"] as const satisfies readonly CustomerAccountResourceId[];

const PUBLIC_PREFETCH_RESOURCE_IDS = ["homeBanner", "topBrand", "brandCatalog"] as const satisfies readonly CustomerAccountResourceId[];

export const PUBLIC_CATALOG_REFETCH_RESOURCE_IDS = [
  "allBrandBanner",
  "homeBanner",
  "topBrand",
  "merchantCoupons",
  "brandCatalog",
  "categoryList",
  "catalog",
] as const satisfies readonly CustomerAccountResourceId[];

const PUBLIC_CATALOG_RESOURCE_ID_SET = new Set<string>(
  PUBLIC_CATALOG_REFETCH_RESOURCE_IDS,
);

async function prefetchResource(
  queryClient: QueryClient,
  apiUrl: string,
  accountDataSource: AccountDataSource,
  resourceId: CustomerAccountResourceId,
  session: Pick<MobileSession, "_id" | "access_token"> | null | undefined,
): Promise<void> {
  if (
    !shouldFetchCustomerAccountResourceFromBackend({
      accountDataSource,
      apiUrl,
      enabled: true,
      resourceId,
    })
  ) {
    return;
  }

  const client = await getSharedMobileApiClient(apiUrl);
  if (!client) {
    return;
  }

  const endpoint = resolveCustomerAccountResourceEndpoint({ regionCode: DEFAULT_REGION, resourceId });
  const request = resolveCustomerAccountResourceRequest({ regionCode: DEFAULT_REGION, resourceId });
  const sessionScope = resolveCustomerAccountResourceSessionScope(resourceId, session);

  await queryClient.prefetchQuery({
    queryFn: async () =>
      request.method === "POST"
        ? client.post(request.path, request.body)
        : client.get(request.path),
    queryKey: resolveCustomerAccountResourceQueryKey({
      apiUrl,
      endpoint,
      regionCode: DEFAULT_REGION,
      resourceId,
      sessionScope,
    }),
    ...resolveCustomerAccountResourceQueryOptions(resourceId),
  });
}

export async function prefetchPublicHomeResources(
  queryClient: QueryClient,
  apiUrl: string,
  accountDataSource: AccountDataSource,
): Promise<void> {
  await Promise.all(
    PUBLIC_PREFETCH_RESOURCE_IDS.map((resourceId) =>
      prefetchResource(queryClient, apiUrl, accountDataSource, resourceId, null),
    ),
  );
}

export async function prefetchAuthedAccountResources(
  queryClient: QueryClient,
  apiUrl: string,
  accountDataSource: AccountDataSource,
  session: Pick<MobileSession, "_id" | "access_token"> | null | undefined,
): Promise<void> {
  await Promise.all(
    AUTHED_PREFETCH_RESOURCE_IDS.map((resourceId) =>
      prefetchResource(queryClient, apiUrl, accountDataSource, resourceId, session),
    ),
  );
}

/** Refetch public catalog feeds when the app returns to foreground (native + web). */
export async function refetchPublicCatalogResources(
  queryClient: QueryClient,
  apiUrl: string,
  accountDataSource: AccountDataSource,
): Promise<void> {
  if (!apiUrl || accountDataSource !== "backend") {
    return;
  }

  await queryClient.refetchQueries({
    predicate: (query) => {
      const key = query.queryKey;
      return (
        Array.isArray(key) &&
        key[0] === "customer-account-resource" &&
        typeof key[1] === "string" &&
        PUBLIC_CATALOG_RESOURCE_ID_SET.has(key[1]) &&
        key[3] === apiUrl
      );
    },
    type: "active",
  });
}
