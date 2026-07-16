import type { CustomerAccountResourceId } from "@mobile/account/customerAccountResourceIds";
import { isPublicAdminConfiguredResource } from "@mobile/account/customerAccountResourceIds";
import { resolveApiCountryParam } from "@mobile/i18n/regionCatalogFilter";
import type { RegionCode } from "@mobile/i18n/regionTypes";
import type { AccountDataSource } from "@mobile/auth/routeGuard";
import { resolveSpecificPageBannerTargetForResource } from "@mobile/account/specificPageBannerTargets";

const merchantEndpointTemplate = "/offer/${merchantId}";

/** Initial home brand-catalog page size — keep modest to shorten first paint payload. */
export const BRAND_CATALOG_PAGE_LIMIT = 20;

export function shouldFetchCustomerAccountResourceFromBackend({
  accountDataSource,
  apiUrl,
  enabled = true,
  resourceId,
}: {
  accountDataSource: AccountDataSource;
  apiUrl: string;
  enabled?: boolean;
  resourceId: CustomerAccountResourceId;
}): boolean {
  if (!enabled || !apiUrl) {
    return false;
  }

  if (accountDataSource === "backend") {
    return true;
  }

  if (accountDataSource === "fixtures") {
    return isPublicAdminConfiguredResource(resourceId);
  }

  return false;
}

function appendCountryQueryParam(path: string, regionCode: RegionCode): string {
  const country = resolveApiCountryParam(regionCode);
  if (!country) {
    return path;
  }

  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}country=${encodeURIComponent(country)}`;
}

export function resolveCustomerAccountResourceEndpoint({
  merchantId = "brand-grocery-galaxy-1001",
  regionCode = "TH",
  resourceId,
}: {
  merchantId?: string;
  regionCode?: RegionCode;
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
    return appendCountryQueryParam("/offer?limit=4&page=1", regionCode);
  }

  if (resourceId === "brandCatalog") {
    return appendCountryQueryParam(
      `/offer?limit=${BRAND_CATALOG_PAGE_LIMIT}&page=1`,
      regionCode,
    );
  }

  if (resourceId === "categoryList") {
    return "/offer/get-category/list";
  }

  if (resourceId === "homeBanner") {
    return "/offer/banner-home";
  }

  const specificPageBannerTarget = resolveSpecificPageBannerTargetForResource(resourceId);
  if (specificPageBannerTarget) {
    return `/offer/banner-specific-page/${specificPageBannerTarget}`;
  }

  if (resourceId === "topBrand") {
    return "/offer/top-brands";
  }

  if (resourceId === "merchant") {
    return merchantEndpointTemplate.replace("${merchantId}", encodeURIComponent(merchantId));
  }

  if (resourceId === "merchantCoupons") {
    return `/offer/get-coupon-id/${encodeURIComponent(merchantId)}`;
  }

  if (resourceId === "policyCategory") {
    return `/policy/category/${encodeURIComponent(merchantId)}`;
  }

  return "/customer-billing/subscription";
}

export type CustomerAccountResourceRequest = {
  body?: Record<string, unknown>;
  method: "GET" | "POST";
  path: string;
};

export function resolveCustomerAccountResourceRequest({
  merchantId,
  regionCode = "TH",
  resourceId,
}: {
  merchantId?: string;
  regionCode?: RegionCode;
  resourceId: CustomerAccountResourceId;
}): CustomerAccountResourceRequest {
  if (resourceId === "offers") {
    return { body: { limit: 10, page: 1 }, method: "POST", path: "/offer/my-offers" };
  }

  if (resourceId === "wallet") {
    return { method: "POST", path: "/withdraw/check" };
  }

  return {
    method: "GET",
    path: resolveCustomerAccountResourceEndpoint({ merchantId, regionCode, resourceId }),
  };
}
