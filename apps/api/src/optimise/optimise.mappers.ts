import type { OfferStatus } from 'src/offer/schemas/offer.schema';

/**
 * Pure mapping helpers for the Optimise Media provider. Kept dependency-free so
 * the campaign->Offer translation (the part most likely to drift from the live
 * API shape) is unit-tested in isolation from HTTP and Mongo.
 *
 * Field names follow the Optimise "Publisher Campaign" response
 * (docs.optimisemedia.com). The provider reads publisher scope, so the primary
 * casing is `deepLinkEnabled` etc.; helpers stay defensive about the
 * advertiser-scope casing where it differs.
 */

type OptimiseCampaign = Record<string, unknown>;

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

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : {};
}

/**
 * Optimise campaign status -> internal Offer curation state. Only `live`
 * campaigns are customer-ready; `closed`/`rejected` are dead; everything else
 * (`waiting`/`pending`/unknown) waits in the admin Pending tab.
 */
export function mapOptimiseCampaignStatus(status: unknown): OfferStatus {
  switch (asString(status)?.toLowerCase()) {
    case 'live':
      return 'approved';
    case 'closed':
    case 'rejected':
      return 'rejected';
    default:
      return 'pending_review';
  }
}

/**
 * Append the GoGoCash `userId` as a `uid` query param so the click reference
 * surfaces in the conversion's `uniqueIds.uid` (the field Optimise attributes
 * publisher sub-ids on). The exact key is `assumed` pending confirmation with
 * Optimise (there is no documented sub-id param on the deeplink endpoint).
 * An empty url is returned unchanged — there is nothing to attribute onto.
 */
export function appendOptimiseUid(url: string, userId: string): string {
  if (!url) return '';
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}uid=${encodeURIComponent(userId)}`;
}

/**
 * Translate an Optimise publisher campaign into the Offer `$set` fields. Only
 * fields actually present are emitted (so a sparse campaign never overwrites a
 * stored offer with blanks); the three required Offer fields always get a value
 * (merchant_id falls back to the campaign/product id when `advertiserId` is not
 * numeric — Optimise has no clean numeric merchant id).
 */
export function mapOptimiseCampaignToOffer(
  campaign: OptimiseCampaign,
): Record<string, unknown> {
  const productId = asFiniteNumber(campaign.productId) ?? 0;
  const advertiserId = asFiniteNumber(campaign.advertiserId);
  const payout = record(campaign.payout);
  const commission = record(campaign.commission);
  const landingPage = record(campaign.landingPage);
  const campaignLogo = record(campaign.campaignLogo);

  const offer: Record<string, unknown> = {
    offer_id: productId,
    merchant_id: advertiserId ?? productId,
    offer_name: asString(campaign.name) ?? '',
    status: mapOptimiseCampaignStatus(campaign.status),
  };

  const description = asString(campaign.description);
  if (description) offer.description = description;

  const currency = asString(payout.currency) ?? asString(campaign.currencyCode);
  if (currency) offer.currency = currency;

  const previewUrl = asString(landingPage.websiteUrl);
  if (previewUrl) offer.preview_url = previewUrl;

  const trackingLink = asString(campaign.baseTrackingUrl);
  if (trackingLink) offer.tracking_link = trackingLink;

  const countries = Array.isArray(campaign.markets)
    ? campaign.markets
        .map((m) => asString(record(m).name))
        .filter((n): n is string => Boolean(n))
        .join(', ')
    : asString(campaign.countryName);
  if (countries) offer.countries = countries;

  const commissions: { [key: string]: string }[] = [];
  const payoutType = asString(payout.type);
  if (payoutType) commissions.push({ payout: payoutType });
  const commissionValue = asString(commission.value);
  if (commissionValue) commissions.push({ commission: commissionValue });
  if (commissions.length > 0) offer.commissions = commissions;

  const commissionTracking = asString(commission.type);
  if (commissionTracking) offer.commission_tracking = commissionTracking;

  const logo = asString(campaignLogo.location);
  if (logo) {
    offer.logo = logo;
    offer.logo_desktop = logo;
  }

  const trackingDays = asFiniteNumber(campaign.cookieDuration);
  if (trackingDays !== undefined) offer.tracking_days = trackingDays;

  const validationTerms = asFiniteNumber(campaign.validationWindow);
  if (validationTerms !== undefined) offer.validation_terms = validationTerms;

  return offer;
}
