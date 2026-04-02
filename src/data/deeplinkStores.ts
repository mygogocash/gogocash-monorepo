/** Advertiser / campaign-style targets for deep links (admin-selectable; `store=` query param). */
export const DEEPLINK_STORE_OPTIONS: { id: string; label: string }[] = [
  { id: "global", label: "Default / other" },
  { id: "banana_it_th", label: "Banana IT (TH)" },
  { id: "adidas_th", label: "Adidas TH" },
  { id: "airasia_travel", label: "AirAsia Travel" },
  { id: "shopee_cps", label: "Shopee CPS" },
  { id: "shopee_cps_new", label: "Shopee CPS New" },
  { id: "lazada_cps", label: "Lazada CPS" },
  { id: "agoda_cps", label: "Agoda CPS" },
  { id: "grab_cps", label: "GrabFood CPS" },
];

export function isValidDeeplinkStoreId(id: string): boolean {
  return DEEPLINK_STORE_OPTIONS.some((s) => s.id === id);
}

/**
 * Default advertiser id from saved admin value, else inferred from offer name / lookup (affiliate CPS rows).
 */
export function resolveDeeplinkStoreId(offer: {
  countries?: string;
  deeplink_store_id?: string | null;
  offer_name?: string;
  offer_name_display?: string;
  lookup_value?: string;
}): string {
  const saved = offer.deeplink_store_id?.trim();
  if (saved && isValidDeeplinkStoreId(saved)) return saved;
  const hay = `${offer.lookup_value ?? ""} ${offer.offer_name ?? ""} ${offer.offer_name_display ?? ""}`.toLowerCase();
  if (hay.includes("banana")) return "banana_it_th";
  if (hay.includes("adidas")) return "adidas_th";
  if (hay.includes("airasia")) return "airasia_travel";
  if (hay.includes("shopee") && /cps\s*new|shopee_cps_new|cpi\s*new/i.test(hay)) return "shopee_cps_new";
  if (hay.includes("shopee")) return "shopee_cps";
  if (hay.includes("lazada")) return "lazada_cps";
  if (hay.includes("agoda")) return "agoda_cps";
  if (hay.includes("grab")) return "grab_cps";
  return "global";
}
