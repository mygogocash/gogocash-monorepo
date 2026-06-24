import { Types } from 'mongoose';

type OfferBackfillInput = {
  _id?: unknown;
  offer_id?: string;
  offer_name?: string;
  offer_name_display?: string;
  brand_id?: unknown;
  logo_desktop?: string;
  banner?: string;
  countries?: string[];
};

export type CatalogProductDraftBackfill = {
  title: string;
  slug: string;
  brand_id: Types.ObjectId;
  offer_id?: Types.ObjectId;
  default_sku: string;
  price_amount: number;
  currency: string;
  inventory_quantity: number;
  images: string[];
  status: 'draft';
};

export function buildDraftProductFromOffer(offer: OfferBackfillInput): CatalogProductDraftBackfill | null {
  if (!offer.brand_id || !Types.ObjectId.isValid(String(offer.brand_id))) return null;
  const title = offer.offer_name_display?.trim() || offer.offer_name?.trim();
  if (!title) return null;

  const offerObjectId = offer._id && Types.ObjectId.isValid(String(offer._id)) ? new Types.ObjectId(String(offer._id)) : undefined;
  const skuSource = offer.offer_id?.trim() || offerObjectId?.toHexString() || title;

  return {
    title,
    slug: normalizeSlug(title),
    brand_id: new Types.ObjectId(String(offer.brand_id)),
    offer_id: offerObjectId,
    default_sku: normalizeSku(skuSource),
    price_amount: 0,
    currency: 'THB',
    inventory_quantity: 0,
    images: [offer.logo_desktop, offer.banner].filter((value): value is string => Boolean(value?.trim())),
    status: 'draft',
  };
}

function normalizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalizeSku(value: string) {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}
