import type { AccountDataSource } from "@mobile/auth/routeGuard";
import type { DirectoryPromo } from "@mobile/screens/discovery/discoveryTypes";

import { useCustomerAccountResource } from "./customerAccountResource";
import {
  type BannerHomeDocument,
  mapBackendHomeBanners,
} from "./homeBannerResource";
import {
  getSpecificPageBannerConfig,
  type SpecificPageBannerRouteId,
} from "./specificPageBannerTargets";

export {
  getSpecificPageBannerConfig,
  type SpecificPageBannerRouteId,
  type SpecificPageBannerTarget,
} from "./specificPageBannerTargets";

const SPECIFIC_PAGE_PROMO_ASPECT_RATIO = 800 / 450;
const SPECIFIC_PAGE_PROMO_TITLE = "Promotion by Brands";

function resolveOptionalSlotLink(
  document: Exclude<BannerHomeDocument, null>,
  slot: number,
): string | undefined {
  const value = document[`link_${slot}` as keyof typeof document];
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed || undefined;
}

export function mapBackendSpecificPagePromo(
  routeId: SpecificPageBannerRouteId,
  document: BannerHomeDocument,
): DirectoryPromo | null {
  if (!document) {
    return null;
  }

  const config = getSpecificPageBannerConfig(routeId);
  const slides = mapBackendHomeBanners(document)
    .filter((banner) => banner.placement === "main")
    .map((banner) => {
      const slot = Number.parseInt(banner.id.replace("home-banner-", ""), 10);
      const href = resolveOptionalSlotLink(document, slot);

      return {
        accessibilityLabel: `${config.accessibilityName} promotion ${slot}`,
        ...(href ? { href } : {}),
        id: `${config.target}-banner-${slot}`,
        imageUri: banner.imageUri ?? "",
        slot,
      };
    });

  if (slides.length === 0) {
    return null;
  }

  return {
    aspectRatio: SPECIFIC_PAGE_PROMO_ASPECT_RATIO,
    slides,
    title: SPECIFIC_PAGE_PROMO_TITLE,
  };
}

export function resolveSpecificPagePromo(
  routeId: SpecificPageBannerRouteId,
  source: AccountDataSource,
  data: unknown,
  fixture: DirectoryPromo,
): DirectoryPromo | null {
  if (source === "fixtures") {
    return fixture;
  }

  if (source !== "backend") {
    return null;
  }

  return mapBackendSpecificPagePromo(routeId, data as BannerHomeDocument);
}

export function useSpecificPageBanner(
  routeId: SpecificPageBannerRouteId,
  fixturePromo: DirectoryPromo,
) {
  const config = getSpecificPageBannerConfig(routeId);
  const resource = useCustomerAccountResource<DirectoryPromo, BannerHomeDocument>({
    fixtureData: fixturePromo,
    resourceId: config.resourceId,
  });

  return {
    promo: resolveSpecificPagePromo(routeId, resource.source, resource.data, fixturePromo),
    retry: resource.retry,
    status: resource.status,
    target: config.target,
  };
}
