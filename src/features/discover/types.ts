import { SHOP_EXPLORE_MENU_ITEMS } from "@/features/shop/shopExploreCategoryMenu";

export type DiscoverSort = "popular" | "newest" | "highCashback";

export type DiscoverCashbackMin = 0 | 5 | 10 | 15;

/** Same strings as shop explore `/offer?category=` (menu labels). */
export type DiscoverCategoryKey = string;

export interface DiscoverFilters {
  category: DiscoverCategoryKey;
  minCashback: DiscoverCashbackMin;
  sort: DiscoverSort;
  /** Trimmed for `GET /offer?search=` */
  search: string;
}

export interface DiscoverCategoryDef {
  /** Sent to `GET /offer?category=` — empty = all */
  apiCategory: string;
  label: string;
  labelTh: string;
  /** `SHOP_EXPLORE_MENU_ITEMS` row / Menu Taps icon; `-1` = All */
  tapIndex: number;
}

/** Thai labels aligned with `SHOP_EXPLORE_MENU_ITEMS` order */
const DISCOVER_CATEGORY_LABEL_TH: Record<string, string> = {
  "Digital Services": "บริการดิจิทัล",
  "Education": "การศึกษา",
  "Electronics": "อิเล็กทรอนิกส์",
  "Fashion": "แฟชั่น",
  "Finance": "การเงิน",
  "Food & Grocery": "อาหารและของชำ",
  "Gifting & Crafts": "ของขวัญและหัตถกรรม",
  "Health & Beauty": "สุขภาพและความงาม",
  "Home & Living": "บ้านและไลฟ์สไตล์",
  "Marketplace": "มาร์เก็ตเพลส",
  "Travel": "ท่องเที่ยว",
  "Top-up / Recharge": "เติมเงิน / เติมเกม",
  "Others": "อื่นๆ",
};

const DISCOVER_ALL: DiscoverCategoryDef = {
  apiCategory: "",
  label: "All",
  labelTh: "ทั้งหมด",
  tapIndex: -1,
};

const DISCOVER_FROM_MENU: DiscoverCategoryDef[] = SHOP_EXPLORE_MENU_ITEMS.map((item, tapIndex) => ({
  apiCategory: item.label,
  label: item.label,
  labelTh: DISCOVER_CATEGORY_LABEL_TH[item.label] ?? item.label,
  tapIndex,
}));

/** All categories — same set and order as Shop Explore sidebar */
export const DISCOVER_CATEGORIES: readonly DiscoverCategoryDef[] = [DISCOVER_ALL, ...DISCOVER_FROM_MENU];

export const DISCOVER_CASHBACK_OPTIONS: readonly { value: DiscoverCashbackMin }[] = [
  { value: 0 },
  { value: 5 },
  { value: 10 },
  { value: 15 },
];

export function discoverCategoryApiQuery(category: DiscoverCategoryKey): string {
  return category;
}

export function discoverCategoryDisplayLabel(category: DiscoverCategoryKey, locale: string): string {
  const row = DISCOVER_CATEGORIES.find((c) => c.apiCategory === category);
  if (!row) return category;
  return locale.toLowerCase().startsWith("th") ? row.labelTh : row.label;
}
