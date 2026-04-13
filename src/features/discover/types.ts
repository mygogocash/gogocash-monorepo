export type DiscoverSort = "popular" | "newest" | "highCashback";

export type DiscoverCashbackMin = 0 | 5 | 10 | 15;

export type DiscoverCategoryKey = "" | "travel" | "electronic" | "beauty" | "digital" | "food" | "others";

export interface DiscoverFilters {
  category: DiscoverCategoryKey;
  minCashback: DiscoverCashbackMin;
  sort: DiscoverSort;
}

export interface DiscoverCategoryDef {
  value: DiscoverCategoryKey;
  /** Value sent to `GET /offer?category=` (see home `Popular`, `CategoryHome`, shop explore). */
  apiCategory: string;
  label: string;
  labelTh: string;
}

export const DISCOVER_CATEGORIES: readonly DiscoverCategoryDef[] = [
  { value: "", apiCategory: "", label: "All", labelTh: "ทั้งหมด" },
  { value: "travel", apiCategory: "Travel", label: "Travel", labelTh: "ท่องเที่ยว" },
  { value: "electronic", apiCategory: "electronic", label: "Electronics", labelTh: "อิเล็กทรอนิกส์" },
  {
    value: "beauty",
    apiCategory: "beauty",
    label: "Health & Beauty",
    labelTh: "สุขภาพ & ความงาม",
  },
  {
    value: "digital",
    apiCategory: "Digital Services",
    label: "Digital Services",
    labelTh: "ดิจิทัล",
  },
  {
    value: "food",
    apiCategory: "Food & Grocery",
    label: "Food & Dining",
    labelTh: "อาหาร",
  },
  { value: "others", apiCategory: "others", label: "Others", labelTh: "อื่นๆ" },
] as const;

export const DISCOVER_CASHBACK_OPTIONS: readonly { value: DiscoverCashbackMin }[] = [
  { value: 0 },
  { value: 5 },
  { value: 10 },
  { value: 15 },
] as const;

export function discoverCategoryApiQuery(category: DiscoverCategoryKey): string {
  const row = DISCOVER_CATEGORIES.find((c) => c.value === category);
  return row?.apiCategory ?? "";
}

export function discoverCategoryDisplayLabel(
  category: DiscoverCategoryKey,
  locale: string
): string {
  const row = DISCOVER_CATEGORIES.find((c) => c.value === category);
  if (!row) return "";
  return locale.toLowerCase().startsWith("th") ? row.labelTh : row.label;
}
