import { RemoteOrBlobImage } from "@/components/common/RemoteOrBlobImage";
import { OFFER_THUMB_SIZES } from "@/components/offer/offerMedia";
import {
  formatOfferCountries,
  getOfferDisplayName,
} from "@/lib/offerDisplay";
import type { OfferID } from "@/types/coupon";
import { pathImage } from "@/utils/helper";

type CouponBrandCellProps = {
  offer: OfferID | null | undefined;
};

export function CouponBrandCell({ offer }: CouponBrandCellProps) {
  const displayName = getOfferDisplayName(offer);
  const logoSrc = pathImage(offer?.logo_desktop);
  const hasLogo = typeof logoSrc === "string" && logoSrc.length > 0;

  return (
    <div className="flex items-center gap-3">
      <div className="h-10 w-10 flex-shrink-0 sm:h-12 sm:w-12">
        {hasLogo ? (
          <RemoteOrBlobImage
            className="h-10 w-10 rounded-lg object-cover sm:h-12 sm:w-12"
            src={logoSrc}
            alt={displayName === "—" ? "Brand" : displayName}
            width={48}
            height={48}
            sizes={OFFER_THUMB_SIZES}
          />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-200 text-xs text-gray-500 sm:h-12 sm:w-12 dark:bg-gray-600 dark:text-gray-400">
            —
          </div>
        )}
      </div>
      <div className="min-w-0">
        <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          {displayName}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {offer?.categories || "Uncategorized"}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {formatOfferCountries(offer?.countries)}
        </div>
      </div>
    </div>
  );
}
