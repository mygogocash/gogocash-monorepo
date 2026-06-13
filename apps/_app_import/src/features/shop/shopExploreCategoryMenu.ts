import { IResponseCategory } from "@/interfaces/shop";

/**
 * Figma 8123:68217 — Menu Taps: fixed labels and normalized keys used to match `/offer/get-category/list`.
 */
export const SHOP_EXPLORE_MENU_ITEMS: ReadonlyArray<{
  label: string;
  matchKeys: readonly string[];
}> = [
  { label: "Digital Services", matchKeys: ["digital services"] },
  { label: "Education", matchKeys: ["education"] },
  { label: "Electronics", matchKeys: ["electronics", "electronic"] },
  { label: "Fashion", matchKeys: ["fashion"] },
  { label: "Finance", matchKeys: ["finance"] },
  { label: "Food & Grocery", matchKeys: ["food & grocery", "food & groceries"] },
  { label: "Gifting & Crafts", matchKeys: ["gifting & crafts"] },
  { label: "Health & Beauty", matchKeys: ["health & beauty", "beauty"] },
  { label: "Home & Living", matchKeys: ["home & living"] },
  { label: "Marketplace", matchKeys: ["marketplace"] },
  { label: "Travel", matchKeys: ["travel"] },
  {
    label: "Top-up / Recharge",
    matchKeys: ["top-up / recharge", "top up / recharge", "top-up", "top up"],
  },
  { label: "Others", matchKeys: ["others"] },
];

/** Row index in Menu Taps.svg for Electronics — same glyph as `ShopExploreCategoryAside`. */
export const SHOP_EXPLORE_ELECTRONICS_TAP_INDEX = SHOP_EXPLORE_MENU_ITEMS.findIndex(
  (item) => item.label === "Electronics"
);

export type ShopExploreCategoryRow = {
  rowKey: string;
  menuLabel: string;
  filterName: string;
  image: string | null;
  /** Index into Figma Menu Taps icons; `null` = API-only orphan row */
  tapIconIndex: number | null;
};

export function normalizeCategoryKey(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

function pickApiCategoryForMenuKeys(
  matchKeys: readonly string[],
  byNorm: Map<string, IResponseCategory>,
  usedNorm: Set<string>
): IResponseCategory | null {
  for (const mk of matchKeys) {
    const c = byNorm.get(mk);
    if (!c) continue;
    const n = normalizeCategoryKey(c.name);
    if (usedNorm.has(n)) continue;
    return c;
  }
  return null;
}

/** Full Figma menu + API images where names match; remaining API categories appended. */
export function buildShopExploreCategoryMenu(
  apiList: IResponseCategory[]
): ShopExploreCategoryRow[] {
  const byNorm = new Map<string, IResponseCategory>();
  for (const c of apiList) {
    if (c.name === "Involve Asia") continue;
    byNorm.set(normalizeCategoryKey(c.name), c);
  }

  const usedNorm = new Set<string>();
  /** Synonyms tied to a Figma row that already matched — avoids e.g. duplicate "Beauty" under "Health & Beauty". */
  const reservedNorms = new Set<string>();
  const rows: ShopExploreCategoryRow[] = [];

  SHOP_EXPLORE_MENU_ITEMS.forEach((item, tapIndex) => {
    const api = pickApiCategoryForMenuKeys(item.matchKeys, byNorm, usedNorm);
    if (api) {
      const n = normalizeCategoryKey(api.name);
      usedNorm.add(n);
      for (const mk of item.matchKeys) reservedNorms.add(mk);
    }
    rows.push({
      rowKey: `menu:${item.label}`,
      menuLabel: item.label,
      filterName: api?.name ?? item.label,
      image: api?.image ?? null,
      tapIconIndex: tapIndex,
    });
  });

  const orphans: IResponseCategory[] = [];
  for (const c of apiList) {
    if (c.name === "Involve Asia") continue;
    const n = normalizeCategoryKey(c.name);
    if (usedNorm.has(n)) continue;
    if (reservedNorms.has(n)) continue;
    orphans.push(c);
  }
  orphans.sort((a, b) => a.name.localeCompare(b.name));
  for (const c of orphans) {
    rows.push({
      rowKey: c._id,
      menuLabel: c.name,
      filterName: c.name,
      image: c.image,
      tapIconIndex: null,
    });
  }

  return rows;
}
