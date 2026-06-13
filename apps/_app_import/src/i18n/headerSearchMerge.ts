/**
 * Header search keys: primary source is `en.json` / `th.json`.
 * When a key is missing (e.g. stale dev cache), merge these fallbacks so the UI never shows raw IDs.
 */
export const HEADER_SEARCH_MESSAGE_KEYS = [
  "headerSearchTrendingPill",
  "headerSearchTrendingTitle",
  "headerSearchTrendingSubtitle",
  "headerSearchResultsTitle",
  "headerSearchResultsSubtitle",
  "headerSearchTrendingEmpty",
  "headerSearchNoMatches",
  "headerSearchPlaceholder",
  "headerSearchAria",
] as const;

const FALLBACK_EN: Record<(typeof HEADER_SEARCH_MESSAGE_KEYS)[number], string> = {
  headerSearchTrendingPill: "Trending",
  headerSearchTrendingTitle: "Popular right now",
  headerSearchTrendingSubtitle: "Hand-picked stores with standout cashback—tap a shop to explore.",
  headerSearchResultsTitle: "Matching brands & products",
  headerSearchResultsSubtitle: "From your search",
  headerSearchTrendingEmpty: "No popular stores to show yet. Try searching above.",
  headerSearchNoMatches: "No brands or products match that search—browse popular picks below.",
  headerSearchPlaceholder: "Search brands, stores, products, or cashback",
  headerSearchAria: "Search brands, stores, products, and cashback offers",
};

const FALLBACK_TH: Record<(typeof HEADER_SEARCH_MESSAGE_KEYS)[number], string> = {
  headerSearchTrendingPill: "มาแรง",
  headerSearchTrendingTitle: "ยอดนิยมตอนนี้",
  headerSearchTrendingSubtitle: "ร้านคัดพิเศษพร้อมแคชแบ็กโดดเด่น—แตะเพื่อดูรายละเอียด",
  headerSearchResultsTitle: "แบรนด์และสินค้าที่ตรงกับการค้นหา",
  headerSearchResultsSubtitle: "จากคำที่คุณพิมพ์",
  headerSearchTrendingEmpty: "ยังไม่มีร้านแนะนำ ลองค้นหาด้านบนได้เลย",
  headerSearchNoMatches: "ไม่พบแบรนด์หรือสินค้าที่ตรงกับคำค้น—ลองดูร้านยอดนิยมด้านล่าง",
  headerSearchPlaceholder: "ค้นหาแบรนด์ ร้านค้า สินค้า หรือแคชแบ็ก",
  headerSearchAria: "ค้นหาแบรนด์ ร้านค้า สินค้า และข้อเสนอแคชแบ็ก",
};

function isMissing(value: unknown): boolean {
  return value === undefined || value === null || value === "";
}

export function mergeHeaderSearchMessages(
  base: Record<string, unknown>,
  catalog: "en" | "th"
): Record<string, unknown> {
  const fallbacks = catalog === "th" ? FALLBACK_TH : FALLBACK_EN;
  const out: Record<string, unknown> = { ...base };
  for (const key of HEADER_SEARCH_MESSAGE_KEYS) {
    if (isMissing(out[key])) {
      out[key] = fallbacks[key];
    }
  }
  return out;
}
