import type { BannerTableVariant } from "@/types/banner";

/**
 * Shared fetch paths and React Query keys for banner admin surfaces.
 * `BannerTable` and `BannerInactiveSlotsSection` must use the same `queryKey` + `fetchPath` so TanStack Query dedupes requests and cache is shared when navigating between pages.
 */
export const BANNER_ADMIN_SURFACES: Record<
  BannerTableVariant,
  {
    queryKey: string[];
    fetchPath: string;
    editHref: string;
    /** Short title for the inactive-slots list on Popup history */
    listTitle: string;
  }
> = {
  home: {
    queryKey: ["getBannerHome"],
    fetchPath: "/admin/banner-home",
    editHref: "/banner",
    listTitle: "Home Page Banner",
  },
  homeSmall: {
    queryKey: ["getBannerHomeSmall"],
    fetchPath: "/admin/banner-home-small",
    editHref: "/banner",
    listTitle: "Home Page Banner — small strip",
  },
  allBrand: {
    queryKey: ["getBannerAllBrandPage"],
    fetchPath: "/admin/banner-all-brand-page",
    editHref: "/banner/all-brand-page",
    listTitle: "All Brand Page banner",
  },
};

export const BANNER_ADMIN_SURFACE_ORDER: BannerTableVariant[] = ["home", "homeSmall", "allBrand"];
