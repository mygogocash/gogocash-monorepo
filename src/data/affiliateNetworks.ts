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

/** Resolve stable network id for forms: match saved display name, else mock rotation from offer id. */
export function resolveAffiliateNetworkIdForOffer(offer: {
  _id: string;
  affiliate_partner?: string | null;
}): string {
  const name = offer.affiliate_partner?.trim();
  if (name) {
    const found = AFFILIATE_NETWORKS.find((n) => n.name === name);
    if (found) return found.id;
  }
  return affiliateNetworkIdForOfferId(offer._id);
}
