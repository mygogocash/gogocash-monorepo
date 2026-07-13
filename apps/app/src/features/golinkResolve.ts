/**
 * GoGoLink merchant resolution: turn a pasted product/store URL into the
 * matching live offer so the result dialog can show the REAL merchant + rate
 * and Shop Now can open a tracked, product-targeted affiliate link.
 *
 * Matching is host-based: short/regional marketplace domains (th.shp.ee,
 * s.lazada.co.th, vt.tiktok.com, …) map to a brand token via the alias table;
 * anything else falls back to the registrable second-level label. The token
 * then matches against offer names / lookup slugs from the public catalog.
 */

export type GoLinkOfferLike = {
  _id?: string;
  offer_id?: number;
  merchant_id?: number;
  offer_name?: string;
  offer_name_display?: string;
  lookup_value?: string;
  tracking_link?: string;
  commission_store?: number | string;
  logo?: string;
  logo_circle?: string;
  logo_mobile?: string;
  logo_desktop?: string;
  disabled?: boolean;
  status?: string;
};

// Short-link / regional domains that don't contain the brand token verbatim.
const HOST_BRAND_ALIASES: ReadonlyArray<readonly [string, string]> = [
  ["shp.ee", "shopee"],
  ["shopee", "shopee"],
  ["lazada", "lazada"],
  ["tiktok", "tiktok"],
  ["klook", "klook"],
  ["trip.com", "trip"],
  ["traveloka", "traveloka"],
  ["agoda", "agoda"],
  ["aliexpress", "aliexpress"],
  ["amazon", "amazon"],
  ["sephora", "sephora"],
  ["watsons", "watsons"],
];

function parseHost(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  for (const candidate of [trimmed, `https://${trimmed}`]) {
    try {
      const parsed = new URL(candidate);
      if (parsed.hostname.includes(".")) {
        return parsed.hostname.replace(/^www\./i, "").toLowerCase();
      }
    } catch {
      // Try the https-prefixed candidate before giving up.
    }
  }
  return null;
}

/** Brand token for a host: alias table first, else the registrable label. */
export function goLinkBrandToken(host: string): string | null {
  for (const [needle, token] of HOST_BRAND_ALIASES) {
    if (host === needle || host.includes(needle)) {
      return token;
    }
  }
  // "s.lazada.co.th" handled above; generic fallback: the label left of the
  // public suffix, approximated as the first label of the last 2–3 parts
  // ("www.konvy.com" -> "konvy", "store.example.co.th" -> "example").
  const labels = host.split(".").filter(Boolean);
  if (labels.length < 2) {
    return null;
  }
  const twoLetterTail =
    labels.length >= 3 && labels[labels.length - 1].length === 2 && labels[labels.length - 2].length <= 3;
  const registrable = twoLetterTail ? labels[labels.length - 3] : labels[labels.length - 2];
  return registrable && registrable.length >= 3 ? registrable : null;
}

function isCustomerVisible(offer: GoLinkOfferLike): boolean {
  const status = offer.status?.trim().toLowerCase();
  return offer.disabled !== true && status !== "pending_review" && status !== "rejected";
}

export function matchGoLinkOffer(
  pastedUrl: string,
  offers: readonly GoLinkOfferLike[],
): GoLinkOfferLike | null {
  const host = parseHost(pastedUrl);
  if (!host) {
    return null;
  }
  const token = goLinkBrandToken(host);
  if (!token) {
    return null;
  }

  const candidates = offers.filter((offer) => {
    if (!isCustomerVisible(offer)) {
      return false;
    }
    const haystack = [offer.offer_name_display, offer.offer_name, offer.lookup_value]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(token);
  });

  if (candidates.length === 0) {
    return null;
  }
  // Shortest display name wins: "Shopee" beats "Shopee Malaysia Campaign".
  return [...candidates].sort(
    (a, b) =>
      (a.offer_name_display ?? a.offer_name ?? "").length -
      (b.offer_name_display ?? b.offer_name ?? "").length,
  )[0];
}

/**
 * Product-targeted tracking link: Involve `aff_m` links accept a `url` query
 * param carrying the destination page, so the shopper lands on the exact
 * product they pasted while the click still attributes through the link.
 */
export function buildGoLinkTrackingUrl(trackingLink: string, pastedUrl: string): string {
  if (!trackingLink) {
    return trackingLink;
  }
  const separator = trackingLink.includes("?") ? "&" : "?";
  return `${trackingLink}${separator}url=${encodeURIComponent(pastedUrl)}`;
}
