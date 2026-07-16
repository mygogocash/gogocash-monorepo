import { BANNER_ADMIN_SURFACES } from "@/lib/bannerAdminSurfaces";
import type {
  BannerAdminSurfaceId,
  BannerSlotDescriptor,
} from "@/types/banner";

export type { BannerSlotDescriptor } from "@/types/banner";

/**
 * Admin-facing slot names for each persisted banner surface.
 *
 * `homeSmall` remains in the legacy type union, but deliberately exposes no
 * positions because the live banner page does not render that mock-only surface.
 */
export function getBannerSlotDescriptors(
  surfaceId: BannerAdminSurfaceId,
): readonly BannerSlotDescriptor[] {
  return BANNER_ADMIN_SURFACES[surfaceId].slots;
}
