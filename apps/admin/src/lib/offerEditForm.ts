import {
  normalizeOfferDisplayTags,
  normalizeOfferProductTypes,
  type Offer,
  type OfferRequestForm,
} from "@/types/api";
import { resolveDeeplinkStoreId } from "@/data/deeplinkStores";
import { resolveAffiliateNetworkIdForOffer } from "@/data/affiliateNetworks";
import {
  DEFAULT_CONFIRM_SUBTITLE,
  DEFAULT_TRACKING_SUBTITLE,
} from "@/lib/offerTrackingPeriod";

/**
 * Resolve the Cashback Management "all products" toggle for edit seeding.
 * When the API omits the flag (legacy docs), infer from whether product-type
 * rows already exist — otherwise the first save stamps `true` and hides them.
 */
export function resolveAllProductTypesFlag(offer: {
  all_product_types?: boolean;
  product_types?: unknown;
  product_type?: unknown;
}): boolean {
  if (typeof offer.all_product_types === "boolean") {
    return offer.all_product_types;
  }
  const rows = normalizeOfferProductTypes(
    offer.product_types ?? offer.product_type,
  );
  return rows.length === 0;
}

export function emptyOfferRequestForm(): OfferRequestForm {
  return {
    logo_desktop: null,
    logo_mobile: null,
    banner: null,
    logo_circle: null,
    offer_name_display: "",
    lookup_value: "",
    disabled: false,
    max_cap: null,
    commission_store: null,
    commission_entry_mode: "auto",
    id: "",
    banner_mobile: null,
    extra_store: false,
    upsize_start_date: null,
    upsize_end_date: null,
    upsize_start_time: null,
    upsize_end_time: null,
    upsize_all_product_types: true,
    upsize_special_commission: null,
    upsize_max_cap: null,
    upsize_product_types: [],
    product_types: [],
    all_product_types: true,
    admin_commission_info: [],
    policy_category_id: "",
    custom_terms: "",
    note_to_user: "",
    affiliate_network_id: "involve_asia",
    deeplink_store_id: "global",
    offer_display_tags: normalizeOfferDisplayTags(undefined),
    tracking_period_mode: "auto",
    tracking_days: null,
    confirm_days: null,
    flow_type: "three_step",
    tracking_subtitle: null,
    confirm_subtitle: null,
  };
}

export function offerToEditForm(offer: Offer): OfferRequestForm {
  return {
    logo_desktop: null,
    logo_mobile: null,
    id: offer._id,
    offer_name_display: offer.offer_name_display || offer.offer_name,
    lookup_value: offer.lookup_value ?? "",
    banner: null,
    logo_circle: null,
    disabled: offer.disabled,
    max_cap: offer.max_cap,
    commission_store: offer.commission_store,
    commission_entry_mode: "auto",
    banner_mobile: null,
    extra_store: offer.extra_store || false,
    upsize_start_date: offer.upsize_start_date ?? null,
    upsize_end_date: offer.upsize_end_date ?? null,
    upsize_start_time: offer.upsize_start_time ?? null,
    upsize_end_time: offer.upsize_end_time ?? null,
    upsize_all_product_types: offer.upsize_all_product_types ?? true,
    upsize_special_commission: offer.upsize_special_commission ?? null,
    upsize_max_cap: offer.upsize_max_cap ?? null,
    upsize_product_types: normalizeOfferProductTypes(offer.upsize_product_types),
    // Real API persists rows on singular `product_type`; mock/admin UI use
    // plural `product_types`. Prefer plural when both are present.
    product_types: normalizeOfferProductTypes(
      offer.product_types ?? offer.product_type,
    ),
    // Legacy docs lack `all_product_types`. Infer from rows so the first
    // cashback save does not stamp `true` and hide an existing product table.
    all_product_types: resolveAllProductTypesFlag(offer),
    admin_commission_info: offer.admin_commission_info ?? [],
    policy_category_id: offer.policy_category_id ?? "",
    custom_terms: offer.custom_terms ?? "",
    note_to_user: offer.note_to_user ?? "",
    affiliate_network_id: resolveAffiliateNetworkIdForOffer(offer),
    deeplink_store_id: resolveDeeplinkStoreId(offer),
    offer_display_tags: normalizeOfferDisplayTags(offer.offer_display_tags),
    ...seedTrackingPeriodFields(offer),
  };
}

/**
 * The admin list (/offer/admin) carries the raw tracking-period fields, but
 * the /brands/[id] route loads offers via the PUBLIC detail endpoint, which
 * strips them and attaches the derived `tracking_period` instead. Seed from
 * the raw fields when present, else reconstruct from the derived object —
 * otherwise a stored manual config would seed as "auto" and a routine
 * Edit → Save from that route would silently flip the brand back to auto.
 */
function seedTrackingPeriodFields(offer: Offer): {
  tracking_period_mode: "auto" | "manual";
  tracking_days: number | null;
  confirm_days: number | null;
  flow_type: "three_step" | "two_step";
  tracking_subtitle: string | null;
  confirm_subtitle: string | null;
} {
  if (offer.tracking_period_mode !== undefined) {
    return {
      tracking_period_mode:
        offer.tracking_period_mode === "manual" ? "manual" : "auto",
      tracking_days: offer.tracking_days ?? null,
      confirm_days: offer.confirm_days ?? null,
      ...seedFlowFields(offer),
    };
  }
  const derived = offer.tracking_period;
  const flowFields = seedFlowFields(derived ?? {});
  if (derived?.source === "manual") {
    return {
      tracking_period_mode: "manual",
      tracking_days: derived.tracking_days,
      confirm_days: derived.confirm_days,
      ...flowFields,
    };
  }
  return {
    tracking_period_mode: "auto",
    tracking_days: null,
    confirm_days: null,
    ...flowFields,
  };
}

/**
 * Flow + subtitles seed from the same source object as the day counts (raw
 * offer fields on the admin list route, the derived tracking_period on the
 * public-detail /brands/[id] route — the API now carries them there too).
 */
function seedFlowFields(source: {
  flow_type?: string | null;
  tracking_subtitle?: string | null;
  confirm_subtitle?: string | null;
}): {
  flow_type: "three_step" | "two_step";
  tracking_subtitle: string | null;
  confirm_subtitle: string | null;
} {
  return {
    flow_type: source.flow_type === "two_step" ? "two_step" : "three_step",
    // The public-detail resolver always returns subtitle strings — for
    // never-customized offers they equal the live defaults. Seed those as
    // null so saving the section stores an explicit clear (which resolves to
    // the live default) instead of pinning today's default copy verbatim.
    tracking_subtitle: seedSubtitle(source.tracking_subtitle, DEFAULT_TRACKING_SUBTITLE),
    confirm_subtitle: seedSubtitle(source.confirm_subtitle, DEFAULT_CONFIRM_SUBTITLE),
  };
}

function seedSubtitle(
  value: string | null | undefined,
  liveDefault: string,
): string | null {
  if (!value || value === liveDefault) {
    return null;
  }
  return value;
}
