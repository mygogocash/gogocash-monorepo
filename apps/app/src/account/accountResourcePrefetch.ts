import type { QueryClient } from "@tanstack/react-query";

import {
  resolveCustomerAccountResourceEndpoint,
  resolveCustomerAccountResourceRequest,
  shouldFetchCustomerAccountResourceFromBackend,
} from "@mobile/account/customerAccountResource";
import type { CustomerAccountResourceId } from "@mobile/account/customerAccountResourceIds";
import {
  resolveCustomerAccountResourceQueryKey,
  resolveCustomerAccountResourceSessionScope,
} from "@mobile/account/customerAccountResourceQueryKey";
import { resolveCustomerAccountResourceQueryOptions } from "@mobile/account/customerAccountResourceQueryOptions";
import { getSharedMobileApiClient } from "@mobile/api/sharedClient";
import type { AccountDataSource } from "@mobile/auth/routeGuard";
import type { MobileSession } from "@mobile/auth/session";

const AUTHED_PREFETCH_RESOURCE_IDS = ["profile", "wallet"] as const satisfies readonly CustomerAccountResourceId[];

const PUBLIC_PREFETCH_RESOURCE_IDS = ["homeBanner", "topBrand", "brandCatalog"] as const satisfies readonly CustomerAccountResourceId[];

export const PUBLIC_CATALOG_REFETCH_RESOURCE_IDS = [
  "homeBanner",
  "topBrand",
  "brandCatalog",
  "categoryList",
  "catalog",
] as const satisfies readonly CustomerAccountResourceId[];

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

  const endpoint = resolveCustomerAccountResourceEndpoint({ resourceId });
  const request = resolveCustomerAccountResourceRequest({ resourceId });
  const sessionScope = resolveCustomerAccountResourceSessionScope(resourceId, session);

  await queryClient.prefetchQuery({
    queryFn: async () =>
      request.method === "POST"
        ? client.post(request.path, request.body)
        : client.get(request.path),
    queryKey: resolveCustomerAccountResourceQueryKey({
      apiUrl,
      endpoint,
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

  await Promise.all(
    PUBLIC_CATALOG_REFETCH_RESOURCE_IDS.map(async (resourceId) => {
      const endpoint = resolveCustomerAccountResourceEndpoint({ resourceId });
      const sessionScope = resolveCustomerAccountResourceSessionScope(resourceId, null);

      await queryClient.refetchQueries({
        queryKey: resolveCustomerAccountResourceQueryKey({
          apiUrl,
          endpoint,
          resourceId,
          sessionScope,
        }),
        type: "active",
      });
    }),
  );
}
