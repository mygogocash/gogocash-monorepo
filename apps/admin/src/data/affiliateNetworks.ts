/** Affiliate / performance networks connected in GoGoCash (admin commission management). */
export type AffiliateNetwork = {
  id: string;
  name: string;
  /** Integration is live in this environment (mock: all true). */
  connected: boolean;
  shortDescription: string;
};

export const AFFILIATE_NETWORKS: AffiliateNetwork[] = [
  {
    id: "involve_asia",
    name: "Involve Asia",
    connected: true,
    shortDescription: "Offers & tracking via Involve Asia marketplace.",
  },
  {
    id: "optimise",
    name: "Optimise",
    connected: true,
    shortDescription: "Partner offers through Optimise (MY / SG / regional).",
  },
  {
    id: "accesstrade",
    name: "Accesstrade",
    connected: true,
    shortDescription: "Accesstrade affiliate catalogue and reporting.",
  },
];

export function affiliateNetworkName(id: string): string {
  return AFFILIATE_NETWORKS.find((n) => n.id === id)?.name ?? id;
}

/** Mock: assign each offer to a network in rotation (matches mock offer `_id` pattern `o1`, `o2`, …). */
export function affiliateNetworkIdForOfferId(offerId: string): string {
  const n = parseInt(offerId.replace(/\D/g, ""), 10) || 0;
  return ["involve_asia", "optimise", "accesstrade"][n % 3];
}

/**
 * Map an offer's import `source` (involve / optimise / accesstrade / manual) to a
 * network id. `involve` → `involve_asia`; optimise/accesstrade pass through;
 * manual and unknown sources have no network (null).
 */
export function networkIdFromSource(
  source: string | null | undefined,
): string | null {
  switch ((source ?? "").trim()) {
    case "involve":
      return "involve_asia";
    case "optimise":
      return "optimise";
    case "accesstrade":
      return "accesstrade";
    default:
      return null;
  }
}

/**
 * Resolve the network id shown for an offer, most-authoritative first:
 *   1. persisted `affiliate_network_id` (#533 — what the admin actually saved)
 *   2. `affiliate_partner` display name (legacy rows)
 *   3. `source` — the import network every real offer carries
 *   4. id-rotation mock — ONLY for pure-mock fixtures with no source
 *
 * Before this, real offers fell straight to (4): `affiliate_partner` was null on
 * all 62 beta offers, so every one displayed a randomly-assigned network (#516).
 */
export function resolveAffiliateNetworkIdForOffer(offer: {
  _id: string;
  affiliate_network_id?: string | null;
  affiliate_partner?: string | null;
  source?: string | null;
}): string {
  const savedId = offer.affiliate_network_id?.trim();
  if (savedId && AFFILIATE_NETWORKS.some((n) => n.id === savedId)) {
    return savedId;
  }

  const name = offer.affiliate_partner?.trim();
  if (name) {
    const found = AFFILIATE_NETWORKS.find((n) => n.name === name);
    if (found) return found.id;
  }

  const fromSource = networkIdFromSource(offer.source);
  if (fromSource) return fromSource;

  return affiliateNetworkIdForOfferId(offer._id);
}
