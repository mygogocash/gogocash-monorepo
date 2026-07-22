import type { CustomerAccountResourceId } from "./customerAccountResourceIds";
import {
  CUSTOMER_QUERY_STALE_TIME_MS,
  PUBLIC_CATALOG_QUERY_STALE_TIME_MS,
} from "@mobile/query/queryDefaults";

const PUBLIC_CATALOG_RESOURCE_IDS = new Set<CustomerAccountResourceId>([
  "allBrandBanner",
  "allShopBanner",
  "topBrand",
  "landingRails",
  "homeBanner",
  "merchantCoupons",
  "brandCatalog",
  "categoryList",
  "catalog",
  "productDiscoveryBanner",
]);

/** React Query options for account-resource hooks (public catalog refreshes sooner). */
export function resolveCustomerAccountResourceQueryOptions(
  resourceId: CustomerAccountResourceId,
) {
  const isPublicCatalog = PUBLIC_CATALOG_RESOURCE_IDS.has(resourceId);

  return {
    staleTime: isPublicCatalog
      ? PUBLIC_CATALOG_QUERY_STALE_TIME_MS
      : CUSTOMER_QUERY_STALE_TIME_MS,
    refetchOnWindowFocus: isPublicCatalog,
    refetchOnReconnect: isPublicCatalog,
  } as const;
}
