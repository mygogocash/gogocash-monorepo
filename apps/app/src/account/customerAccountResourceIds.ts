export type CustomerAccountResourceId =
  | "allBrandBanner"
  | "allShopBanner"
  | "billing"
  | "brandCatalog"
  | "catalog"
  | "categoryList"
  | "homeBanner"
  | "merchant"
  | "merchantCoupons"
  | "offers"
  | "policyCategory"
  | "profile"
  | "productDiscoveryBanner"
  | "referral"
  | "topBrand"
  | "wallet"
  | "walletTransactions";

/** Public, no-auth resources whose live admin config should load even in fixtures mode. */
export const PUBLIC_ADMIN_CONFIGURED_RESOURCE_IDS = [
  "allBrandBanner",
  "allShopBanner",
  "homeBanner",
  "merchant",
  "merchantCoupons",
  "productDiscoveryBanner",
  "topBrand",
] as const satisfies readonly CustomerAccountResourceId[];

export type PublicAdminConfiguredResourceId =
  (typeof PUBLIC_ADMIN_CONFIGURED_RESOURCE_IDS)[number];

export function isPublicAdminConfiguredResource(
  resourceId: CustomerAccountResourceId,
): resourceId is PublicAdminConfiguredResourceId {
  return (PUBLIC_ADMIN_CONFIGURED_RESOURCE_IDS as readonly string[]).includes(resourceId);
}
