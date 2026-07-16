import type { AccountDataSource } from "@mobile/auth/routeGuard";
import type { DirectoryPromo } from "@mobile/screens/discovery/discoveryTypes";

import {
  type BannerHomeDocument,
  mapBackendHomeBanners,
} from "./homeBannerResource";

const ALL_BRAND_PROMO_ASPECT_RATIO = 800 / 450;
const ALL_BRAND_PROMO_TITLE = "Promotion by Brands";

export function mapBackendAllBrandPromo(
  document: BannerHomeDocument,
): DirectoryPromo | null {
  // Specific Page Banner is a three-slide carousel. The shared legacy mapper
  // also exposes home-side positions 4–5, so keep only its 1–3/main contract
  // here; otherwise an old hidden slot could remain live with no Admin control.
  const slides = mapBackendHomeBanners(document)
    .filter((banner) => banner.placement === "main")
    .map((banner) => {
      const slot = banner.id.replace("home-banner-", "");
      return {
        accessibilityLabel: `All Brands promotion ${slot}`,
        href: banner.href,
        id: `all-brand-banner-${slot}`,
        imageUri: banner.imageUri ?? "",
      };
    });

  if (slides.length === 0) {
    return null;
  }

  return {
    aspectRatio: ALL_BRAND_PROMO_ASPECT_RATIO,
    title: ALL_BRAND_PROMO_TITLE,
    slides,
  };
}

export function resolveAllBrandPromo(
  source: AccountDataSource,
  data: unknown,
  fixture: DirectoryPromo,
): DirectoryPromo | null {
  if (source !== "backend") {
    return fixture;
  }
  return mapBackendAllBrandPromo(data as BannerHomeDocument);
}
