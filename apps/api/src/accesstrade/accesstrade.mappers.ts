import type { OfferStatus } from 'src/offer/schemas/offer.schema';

/**
 * Pure mapping helpers for the Accesstrade provider — the campaign-item ->
 * Offer translation, unit-tested away from HTTP/Mongo. Field names follow the
 * Accesstrade "campaigns/unaffiliated" item shape
 * (support.accesstrade.global/api).
 */

type AccesstradeItem = Record<string, unknown>;

function asString(value: unknown): string | undefined {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed === '' ? undefined : trimmed;
  }
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return undefined;
}

function asFiniteNumber(value: unknown): number | undefined {
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Accesstrade campaign lifecycle -> internal Offer curation state. Synced
 * campaigns are unaffiliated, so a running campaign is `pending_review` (an
 * admin must affiliate it before it can earn); paused/terminated are dead.
 */
export function mapAccesstradeCampaignStatus(status: unknown): OfferStatus {
  switch (asString(status)?.toUpperCase()) {
    case 'PAUSED':
    case 'TERMINATED':
    case 'WONT_RUN':
      return 'rejected';
    default:
      return 'pending_review';
  }
}

export function mapAccesstradeCampaignToOffer(
  item: AccesstradeItem,
): Record<string, unknown> {
  // Accesstrade has no merchant id distinct from the campaign id — reuse it.
  const id = asFiniteNumber(item.id) ?? 0;

  const offer: Record<string, unknown> = {
    offer_id: id,
    merchant_id: id,
    offer_name: asString(item.name) ?? '',
    status: mapAccesstradeCampaignStatus(item.status ?? item.campaignStatus),
  };

  const logo = asString(item.imageUrl);
  if (logo) {
    offer.logo = logo;
    offer.logo_desktop = logo;
  }

  const url = asString(item.url);
  if (url) {
    offer.preview_url = url;
    offer.tracking_link = url;
  }

  const categories = Array.isArray(item.categories)
    ? item.categories
        .map((c) =>
          asString((c && typeof c === 'object' ? c : {})['name' as never]),
        )
        .filter((n): n is string => Boolean(n))
        .join(', ')
    : undefined;
  if (categories) offer.categories = categories;

  const commissions: { [key: string]: string }[] = [];
  if (Array.isArray(item.defaultRewards)) {
    for (const raw of item.defaultRewards) {
      const reward = raw && typeof raw === 'object' ? raw : {};
      const type = asString((reward as Record<string, unknown>).type);
      const value = asString((reward as Record<string, unknown>).reward);
      if (type && value) commissions.push({ [type]: value });
    }
  }
  if (commissions.length > 0) {
    offer.commissions = commissions;
    const firstType = asString(
      (item.defaultRewards as Record<string, unknown>[])[0]?.type,
    );
    if (firstType) offer.commission_tracking = firstType;
  }

  const currency = asString(item.currency);
  if (currency) offer.currency = currency;

  return offer;
}
