export type CustomerAccountResourceId =
  | "billing"
  | "brandCatalog"
  | "catalog"
  | "categoryList"
  | "homeBanner"
  | "merchant"
  | "offers"
  | "policyCategory"
  | "profile"
  | "referral"
  | "topBrand"
  | "wallet";

/** Public, no-auth resources whose live admin config should load even in fixtures mode. */
export const PUBLIC_ADMIN_CONFIGURED_RESOURCE_IDS = ["topBrand", "homeBanner"] as const satisfies readonly CustomerAccountResourceId[];

export type PublicAdminConfiguredResourceId =
  (typeof PUBLIC_ADMIN_CONFIGURED_RESOURCE_IDS)[number];

export function isPublicAdminConfiguredResource(
  resourceId: CustomerAccountResourceId,
): resourceId is PublicAdminConfiguredResourceId {
  return (PUBLIC_ADMIN_CONFIGURED_RESOURCE_IDS as readonly string[]).includes(resourceId);
}
