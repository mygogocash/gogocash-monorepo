import type { CustomerAccountResourceId } from "./customerAccountResourceIds";

export type SpecificPageBannerRouteId = "brand" | "discover" | "shops";
export type SpecificPageBannerTarget =
  | "all-brands"
  | "all-shops"
  | "product-discovery";

export type SpecificPageBannerResourceId = Extract<
  CustomerAccountResourceId,
  "allBrandBanner" | "allShopBanner" | "productDiscoveryBanner"
>;

type SpecificPageBannerConfig = {
  accessibilityName: string;
  resourceId: SpecificPageBannerResourceId;
  target: SpecificPageBannerTarget;
};

const SPECIFIC_PAGE_BANNER_CONFIG = {
  brand: {
    accessibilityName: "All Brands",
    resourceId: "allBrandBanner",
    target: "all-brands",
  },
  discover: {
    accessibilityName: "Product Discovery",
    resourceId: "productDiscoveryBanner",
    target: "product-discovery",
  },
  shops: {
    accessibilityName: "All Shops",
    resourceId: "allShopBanner",
    target: "all-shops",
  },
} as const satisfies Record<SpecificPageBannerRouteId, SpecificPageBannerConfig>;

export function getSpecificPageBannerConfig(
  routeId: SpecificPageBannerRouteId,
): SpecificPageBannerConfig {
  return SPECIFIC_PAGE_BANNER_CONFIG[routeId];
}

export function resolveSpecificPageBannerTargetForResource(
  resourceId: CustomerAccountResourceId,
): SpecificPageBannerTarget | null {
  for (const config of Object.values(SPECIFIC_PAGE_BANNER_CONFIG)) {
    if (config.resourceId === resourceId) {
      return config.target;
    }
  }

  return null;
}
