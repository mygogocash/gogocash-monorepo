/** Admin "Logo" uploads land on desktop/mobile; legacy Involve rows still use `logo`. */
export type OfferLogoFields = {
  logo_desktop?: string;
  logo_mobile?: string;
  logo_circle?: string;
  logo?: string;
};

/** Public/customer logo: prefer admin square logo, then cover/circle, then legacy. */
export function resolvePublicOfferLogo(offer: OfferLogoFields): string {
  return (
    offer.logo_desktop?.trim() ||
    offer.logo_mobile?.trim() ||
    offer.logo_circle?.trim() ||
    offer.logo?.trim() ||
    ''
  );
}
