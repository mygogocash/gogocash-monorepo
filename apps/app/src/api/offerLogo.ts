/** Mirror apps/api/src/offer/offer-logo.util.ts for client-side offer media. */
export type OfferLogoFields = {
  logo_desktop?: string;
  logo_mobile?: string;
  logo_circle?: string;
  logo?: string;
};

export function resolvePublicOfferLogo(offer: OfferLogoFields): string | undefined {
  const value =
    offer.logo_desktop?.trim() ||
    offer.logo_mobile?.trim() ||
    offer.logo_circle?.trim() ||
    offer.logo?.trim() ||
    "";
  return value || undefined;
}

/** Shop hero: dedicated banner first, then admin "Brand cover" (logo_circle). */
export function resolveShopPageBannerUri(offer: {
  banner?: string;
  banner_mobile?: string;
  logo_circle?: string;
}): string | undefined {
  const value =
    offer.banner?.trim() ||
    offer.banner_mobile?.trim() ||
    offer.logo_circle?.trim() ||
    "";
  return value || undefined;
}
