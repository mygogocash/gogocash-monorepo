import type { OfferSource } from 'src/offer/schemas/offer.schema';

export type AffiliateNetworkId = 'involve_asia' | 'optimise' | 'accesstrade';

export type AffiliateNetworkDto = {
  id: AffiliateNetworkId;
  name: string;
  connected: boolean;
  shortDescription: string;
};

const AFFILIATE_NETWORKS: Omit<AffiliateNetworkDto, 'connected'>[] = [
  {
    id: 'involve_asia',
    name: 'Involve Asia',
    shortDescription: 'Offers & tracking via Involve Asia marketplace.',
  },
  {
    id: 'optimise',
    name: 'Optimise',
    shortDescription: 'Partner offers through Optimise (MY / SG / regional).',
  },
  {
    id: 'accesstrade',
    name: 'Accesstrade',
    shortDescription: 'Accesstrade affiliate catalogue and reporting.',
  },
];

export function sourceForAffiliateNetwork(
  networkId: string,
): OfferSource | null {
  switch (networkId) {
    case 'involve_asia':
      return 'involve';
    case 'optimise':
      return 'optimise';
    case 'accesstrade':
      return 'accesstrade';
    default:
      return null;
  }
}

export function affiliateNetworkIdForSource(
  source: string,
): AffiliateNetworkId {
  if (source === 'optimise') return 'optimise';
  if (source === 'accesstrade') return 'accesstrade';
  if (source === 'involve') return 'involve_asia';
  return 'involve_asia';
}

export function affiliateNetworkName(networkId: string): string {
  return AFFILIATE_NETWORKS.find((n) => n.id === networkId)?.name ?? networkId;
}

export function listAffiliateNetworks(): AffiliateNetworkDto[] {
  return AFFILIATE_NETWORKS.map((n) => ({
    ...n,
    connected:
      n.id === 'involve_asia'
        ? Boolean(process.env.INVOLVE_SECRET?.trim())
        : n.id === 'optimise'
          ? Boolean(process.env.OPTIMISE_API_KEY?.trim())
          : n.id === 'accesstrade'
            ? // Matches AccesstradeAffiliateProvider.isEnabled — the provider
              // authenticates via the username+password provisioning flow, so
              // "connected" tracks those, not the legacy ACCESSTRADE_API_KEY.
              Boolean(
                process.env.ACCESSTRADE_USERNAME?.trim() &&
                  process.env.ACCESSTRADE_PASSWORD?.trim(),
              )
            : false,
  }));
}
